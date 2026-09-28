import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import joblib
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from feature_extractor import FEATURE_ORDER, extract_features, normalize_url
from risk_engine import heuristic_analysis, combine_scores, unknown_domain_risk, decision_for, is_trusted_host, critical_signal_keys
from intelligence import inspect_page, virustotal_lookup

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "phishing_model.joblib"
METADATA_PATH = BASE_DIR / "model" / "model_metadata.json"
DATA_PATH = BASE_DIR / "data" / "legitimate_urls.csv"
DB_PATH = BASE_DIR / "phishguard.db"
REPORT_DIR = BASE_DIR / "reports"
REPORT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
CORS(app)
_model = None
_metadata = {}


def load_legitimate_registry():
    """Load the CSV directly. legitimate_urls.csv is the single source of truth."""
    items = []
    if not DATA_PATH.exists():
        return items
    try:
        with DATA_PATH.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                domain = (row.get("domain") or row.get("url") or "").strip().lower()
                if domain.startswith("http://") or domain.startswith("https://"):
                    domain = urlparse(domain).hostname or ""
                domain = domain.lower().rstrip(".")
                if domain.startswith("www."):
                    domain = domain[4:]
                if not domain:
                    continue
                items.append({
                    "domain": domain,
                    "name": (row.get("name") or domain).strip(),
                    "category": (row.get("category") or "Custom").strip(),
                })
    except Exception:
        return []
    
    seen = set(); result = []
    for item in items:
        if item["domain"] not in seen:
            seen.add(item["domain"]); result.append(item)
    return result


def load_model():
    global _model, _metadata
    if MODEL_PATH.exists():
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception:
            _model = None
    if METADATA_PATH.exists():
        try:
            _metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        except Exception:
            _metadata = {}


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        normalized_url TEXT NOT NULL,
        model_probability REAL NOT NULL,
        heuristic_score REAL NOT NULL,
        risk_score REAL NOT NULL,
        decision TEXT NOT NULL,
        label TEXT NOT NULL,
        reasons_json TEXT NOT NULL,
        features_json TEXT NOT NULL,
        trusted_match_json TEXT,
        intelligence_json TEXT,
        page_analysis_json TEXT,
        confidence REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        expected_label TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(analysis_id) REFERENCES analyses(id)
    );
    """)
    
    cols = {r[1] for r in conn.execute("PRAGMA table_info(analyses)").fetchall()}
    if "trusted_match_json" not in cols:
        conn.execute("ALTER TABLE analyses ADD COLUMN trusted_match_json TEXT")
    if "intelligence_json" not in cols:
        conn.execute("ALTER TABLE analyses ADD COLUMN intelligence_json TEXT")
    if "page_analysis_json" not in cols:
        conn.execute("ALTER TABLE analyses ADD COLUMN page_analysis_json TEXT")
    if "confidence" not in cols:
        conn.execute("ALTER TABLE analyses ADD COLUMN confidence REAL NOT NULL DEFAULT 0")
    conn.commit(); conn.close()


def model_probability(features):
    if _model is None:
        return None
    x = np.array([[features[name] for name in FEATURE_ORDER]], dtype=float)
    try:
        if hasattr(_model, "predict_proba"):
            probs = _model.predict_proba(x)[0]
            if len(probs) == 2:
                return float(probs[1])
        return float(_model.predict(x)[0])
    except Exception:
        return None


def analyze(url):
    normalized = normalize_url(url)
    if not normalized:
        raise ValueError("Please enter a URL.")
    parsed = urlparse(normalized)
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise ValueError("Please enter a valid URL with a hostname.")
    if parsed.scheme.lower() not in {"http", "https"}:
        raise ValueError("Only HTTP and HTTPS URLs are supported.")

    features = extract_features(normalized)
    hp = heuristic_analysis(normalized, features)
    mp = model_probability(features)
    if mp is None:
        mp = hp["score"] / 100.0
        model_source = "heuristic fallback"
    else:
        model_source = "trained calibrated model"

    trusted_registry = load_legitimate_registry()
    trusted = is_trusted_host(host, trusted_registry, require_dns_for_implicit_subdomain=True)
    page = inspect_page(normalized, trusted_domain=trusted)
    intel = virustotal_lookup(normalized)
    live_score = sum(int(x.get("points", 0)) for x in page.get("signals", []))
    intel_score = min(40, int(intel.get("malicious", 0)) * 12 + int(intel.get("suspicious", 0)) * 4)
    raw_risk = combine_scores(mp, hp["score"])
    clean_page = bool(page.get("available") and not page.get("signals"))
    brand_score = int(hp.get("brand_impersonation", {}).get("score", 0))
    if trusted:
        enriched_risk = round(min(100.0, raw_risk * 0.18 + live_score * 0.35 + intel_score * 0.55), 2)
    else:
        enriched_risk = unknown_domain_risk(mp, hp["score"], live_score, intel_score, clean_page=clean_page, brand_score=brand_score)

    final_host = (urlparse(page.get("final_url", normalized)).hostname or "").lower().rstrip(".")
    final_trusted = is_trusted_host(final_host, trusted_registry, require_dns_for_implicit_subdomain=True) if final_host else trusted
    redirect_changed_host = bool(final_host and final_host != host)
    redirect_to_untrusted = bool(redirect_changed_host and trusted and not final_trusted)

    critical_keys = critical_signal_keys(features, hp["signals"], intel)
    critical_signal = bool(critical_keys or redirect_to_untrusted)
    force_block = bool(
        int(intel.get("malicious", 0)) >= 2
        or (features.get("has_ip") and features.get("suspicious_words", 0) >= 1)
        or (features.get("has_ip") and features.get("has_at"))
        or (features.get("has_at") and features.get("suspicious_words", 0) >= 1)
        or brand_score >= 34 and (features.get("suspicious_words", 0) >= 1 or features.get("hyphen_count", 0) >= 1)
        or redirect_to_untrusted and live_score >= 8
    )

    if trusted and not critical_signal:
        decision, label = decision_for(enriched_risk, hp["score"], trusted=trusted, critical_signal=False)
        risk = min(8.0, round(enriched_risk * 0.12, 2))
        reasons = [{
            "key": "trusted-domain", "points": 0,
            "title": f"Recognized legitimate domain: {trusted.get('name', trusted.get('domain'))}",
            "detail": f"The hostname {host} matches an exact registered domain or its real subdomain in legitimate_urls.csv. Lookalike domains do not match."
        }]
        assessment_source = "legitimate URL registry + ML + heuristic + live page analysis"
    else:
        decision, label = decision_for(enriched_risk, max(hp["score"], live_score), trusted=None, critical_signal=critical_signal, force_block=force_block)
        risk = enriched_risk
        reasons = hp["signals"][:] + page.get("signals", [])[:]
        if redirect_to_untrusted:
            reasons.append({"key":"untrusted-redirect", "points":18, "title":"Redirect left the recognized domain", "detail":f"The page started on {host} but ended on {final_host}, which is not in the legitimate-domain registry."})
        if intel.get("available") and intel.get("malicious", 0) > 0:
            reasons.append({"key":"threat-intel", "points": intel_score, "title":"Threat-intelligence detections", "detail":f"VirusTotal reports {intel['malicious']} malicious and {intel.get('suspicious',0)} suspicious engine detections."})
        if force_block and not any(r.get("key") == "block-evidence" for r in reasons):
            reasons.append({"key":"block-evidence", "points":0, "title":"Multiple high-severity indicators combined", "detail":"The decision reached BLOCK because strong phishing indicators occurred together rather than from a single weak heuristic."})
        assessment_source = "ML + heuristic + live page analysis + optional threat intelligence"

    evidence_count = len(reasons) + (1 if page.get("available") else 0) + (1 if intel.get("available") else 0)
    confidence = round(min(99.0, 45 + evidence_count * 8 + (15 if trusted else 0)), 1)
    if not page.get("available") and not intel.get("available"):
        confidence = min(confidence, 65.0)

    if not reasons:
        reasons = [{"key": "none", "points": 0, "title": "No strong URL-level warning indicators", "detail": "No major warning signals were detected in the URL or available live checks."}]

    return {
        "url": url, "normalized_url": normalized, "hostname": host,
        "model_probability": round(mp, 4), "model_probability_percent": round(mp * 100, 2),
        "model_source": model_source, "heuristic_score": hp["score"],
        "raw_risk_score": raw_risk, "live_signal_score": live_score, "risk_score": risk,
        "decision": decision, "label": label, "trusted_domain": trusted,
        "assessment_source": assessment_source, "confidence": confidence,
        "reasons": reasons, "features": features, "page_analysis": page, "intelligence": intel,
    }


@app.get("/")
def root():
    return jsonify({"service": "PhishGuard AI API", "ok": True})


@app.get("/api/health")
def health():
    registry = load_legitimate_registry()
    return jsonify({"ok": True, "model_loaded": _model is not None, "registry_loaded": bool(registry), "registry_count": len(registry), "feature_count": len(FEATURE_ORDER), "features": FEATURE_ORDER})


@app.post("/api/analyze")
def api_analyze():
    body = request.get_json(silent=True) or {}
    try:
        result = analyze(body.get("url", ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    created = datetime.now(timezone.utc).isoformat()
    conn = db()
    cur = conn.execute("""INSERT INTO analyses(url, normalized_url, model_probability, heuristic_score, risk_score, decision, label, reasons_json, features_json, trusted_match_json, intelligence_json, page_analysis_json, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (result["url"], result["normalized_url"], result["model_probability"], result["heuristic_score"], result["risk_score"], result["decision"], result["label"], json.dumps(result["reasons"]), json.dumps(result["features"]), json.dumps(result["trusted_domain"]) if result["trusted_domain"] else None, json.dumps(result["intelligence"]), json.dumps(result["page_analysis"]), result["confidence"], created))
    result["analysis_id"] = cur.lastrowid; result["created_at"] = created
    conn.commit(); conn.close()
    return jsonify(result)


@app.get("/api/history")
def history():
    try: limit = min(max(int(request.args.get("limit", 100)), 1), 500)
    except ValueError: limit = 100
    conn = db(); rows = conn.execute("SELECT * FROM analyses ORDER BY id DESC LIMIT ?", (limit,)).fetchall(); conn.close()
    return jsonify([{ "id": r["id"], "url": r["url"], "risk_score": r["risk_score"], "decision": r["decision"], "label": r["label"], "confidence": r["confidence"], "created_at": r["created_at"] } for r in rows])


@app.get("/api/history/<int:analysis_id>")
def history_detail(analysis_id):
    conn = db(); row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone(); conn.close()
    if not row: return jsonify({"error": "Analysis not found"}), 404
    return jsonify({
        "analysis_id": row["id"], "url": row["url"], "normalized_url": row["normalized_url"],
        "hostname": urlparse(row["normalized_url"]).hostname or "", "model_probability": row["model_probability"],
        "model_probability_percent": round(row["model_probability"] * 100, 2), "model_source": _metadata.get("model_source", "trained model"),
        "heuristic_score": row["heuristic_score"], "risk_score": row["risk_score"], "decision": row["decision"], "label": row["label"], "confidence": row["confidence"],
        "trusted_domain": json.loads(row["trusted_match_json"]) if row["trusted_match_json"] else None,
        "confidence": row["confidence"], "intelligence": json.loads(row["intelligence_json"]) if row["intelligence_json"] else {},
        "page_analysis": json.loads(row["page_analysis_json"]) if row["page_analysis_json"] else {},
        "reasons": json.loads(row["reasons_json"]), "features": json.loads(row["features_json"]), "created_at": row["created_at"]
    })


@app.get("/api/stats")
def stats():
    conn = db(); row = conn.execute("SELECT COUNT(*) total, SUM(decision='block') blocked, SUM(decision='review') review, SUM(decision='allow') allowed, AVG(risk_score) avg_risk FROM analyses").fetchone(); conn.close()
    return jsonify({k: (0 if v is None else v) for k, v in dict(row).items()})


@app.get("/api/model-performance")
def model_performance():
    return jsonify({
        "available": bool(_metadata),
        "accuracy": _metadata.get("accuracy"), "precision": _metadata.get("precision"),
        "recall": _metadata.get("recall"), "f1": _metadata.get("f1"),
        "confusion_matrix": _metadata.get("confusion_matrix"), "rows_used": _metadata.get("rows_used"),
        "model_type": _metadata.get("model_type"), "feature_count": len(_metadata.get("feature_order", FEATURE_ORDER))
    })


@app.post("/api/feedback")
def feedback():
    body = request.get_json(silent=True) or {}; analysis_id = body.get("analysis_id"); expected = body.get("expected_label")
    if not analysis_id or expected not in {"legitimate", "phishing"}: return jsonify({"error": "analysis_id and expected_label (legitimate/phishing) are required"}), 400
    conn = db(); conn.execute("INSERT INTO feedback(analysis_id, expected_label, note, created_at) VALUES (?, ?, ?, ?)", (analysis_id, expected, body.get("note", ""), datetime.now(timezone.utc).isoformat())); conn.commit(); conn.close()
    return jsonify({"ok": True})


def build_pdf(result, out_path):
    from xml.sax.saxutils import escape
    styles = getSampleStyleSheet(); doc = SimpleDocTemplate(str(out_path), pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = [Paragraph("PhishGuard AI — Security Analysis Report", styles["Title"]), Spacer(1, 12)]
    story += [Paragraph(f"Analysis time: {escape(datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'))}", styles["Normal"]), Spacer(1, 12)]
    story += [Paragraph(f"<b>URL:</b> {escape(result['normalized_url'])}", styles["Normal"]), Paragraph(f"<b>Assessment:</b> {escape(str(result['label']))}", styles["Normal"]), Paragraph(f"<b>Decision:</b> {escape(str(result['decision']).upper())}", styles["Normal"]), Paragraph(f"<b>Final risk score:</b> {float(result['risk_score']):.2f}%", styles["Normal"]), Paragraph(f"<b>ML model signal:</b> {float(result['model_probability_percent']):.2f}%", styles["Normal"]), Paragraph(f"<b>Heuristic score:</b> {float(result['heuristic_score']):.2f}/100", styles["Normal"]), Paragraph(f"<b>Evidence confidence:</b> {float(result.get('confidence', 0)):.1f}%", styles["Normal"]), Spacer(1, 14)]
    story.append(Paragraph("Analysis findings", styles["Heading2"]))
    for reason in result["reasons"]: story.append(Paragraph(f"• <b>{escape(str(reason['title']))}</b> — {escape(str(reason['detail']))}", styles["BodyText"]))
    story += [Spacer(1, 14), Paragraph("URL characteristics", styles["Heading2"])]
    data = [["Feature", "Value"]] + [[escape(str(k)), escape(str(v))] for k, v in result["features"].items()]
    table = Table(data, colWidths=[230, 230]); table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8eef7")), ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#b8c8da")), ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("VALIGN", (0,0), (-1,-1), "TOP")]))
    story += [table, Spacer(1, 14), Paragraph("Recommendation", styles["Heading2"])]
    recommendation = {"allow":"The URL received a low-risk assessment based on the available URL signals.", "review":"Verify the destination independently before entering sensitive information.", "block":"Do not continue to the destination while protection mode is active; investigate the URL before allowing access."}.get(result["decision"], "Review the analysis before proceeding.")
    story.append(Paragraph(escape(recommendation), styles["BodyText"]))
    doc.build(story)


@app.post("/api/report")
def report():
    body = request.get_json(silent=True) or {}; analysis_id = body.get("analysis_id")
    if not analysis_id: return jsonify({"error": "analysis_id is required"}), 400
    conn = db(); row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone(); conn.close()
    if not row: return jsonify({"error": "Analysis not found"}), 404
    result = {"normalized_url": row["normalized_url"], "label": row["label"], "decision": row["decision"], "risk_score": row["risk_score"], "model_probability_percent": row["model_probability"] * 100, "heuristic_score": row["heuristic_score"], "reasons": json.loads(row["reasons_json"]), "features": json.loads(row["features_json"]), "intelligence": json.loads(row["intelligence_json"]) if row["intelligence_json"] else {}, "page_analysis": json.loads(row["page_analysis_json"]) if row["page_analysis_json"] else {}}
    filename = f"phishguard_report_{analysis_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"; path = REPORT_DIR / filename; build_pdf(result, path)
    return send_file(path, as_attachment=True, download_name=filename, mimetype="application/pdf")


load_model(); init_db()
if __name__ == "__main__": app.run(host="127.0.0.1", port=5000, debug=True)
