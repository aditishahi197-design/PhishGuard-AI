from urllib.parse import urlparse
import difflib
import ipaddress
import socket
from feature_extractor import SUSPICIOUS_WORDS

SUSPICIOUS_TLDS = {"top", "xyz", "click", "zip", "mov", "work", "support", "buzz", "gq", "tk", "ml", "cf"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly", "cutt.ly", "rb.gy"}
BRAND_DOMAINS = {
    "google": {"google.com"}, "paypal": {"paypal.com"}, "microsoft": {"microsoft.com", "cloud.microsoft"},
    "apple": {"apple.com"}, "amazon": {"amazon.com"}, "facebook": {"facebook.com"},
    "instagram": {"instagram.com"}, "whatsapp": {"whatsapp.com"}, "netflix": {"netflix.com"},
    "linkedin": {"linkedin.com"}, "github": {"github.com"}, "sbi": {"sbi.co.in"},
    "hdfc": {"hdfcbank.com"}, "icici": {"icicibank.com"}, "flipkart": {"flipkart.com"},
}
LOOKALIKE_MAP = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a"})


def normalize_registry_domain(value: str) -> str:
    value = (value or "").strip().lower().rstrip(".")
    if value.startswith("https://"):
        value = value[8:]
    elif value.startswith("http://"):
        value = value[7:]
    value = value.split("/", 1)[0].split(":", 1)[0]
    return value[4:] if value.startswith("www.") else value


def _resolves_to_public_ip(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except Exception:
        return False
    for info in infos:
        try:
            addr = ipaddress.ip_address(info[4][0])
            if addr.is_global:
                return True
        except Exception:
            continue
    return False


def is_trusted_host(host: str, trusted_domains: list[dict], require_dns_for_implicit_subdomain: bool = False) -> dict | None:
    host = (host or "").lower().rstrip(".")
    for item in trusted_domains:
        domain = normalize_registry_domain(str(item.get("domain", "")))
        if not domain:
            continue
        if host == domain:
            return item
        if host.endswith("." + domain):
            if not require_dns_for_implicit_subdomain:
                return item
            if any(normalize_registry_domain(str(x.get("domain", ""))) == host for x in trusted_domains):
                return item
            if _resolves_to_public_ip(host):
                return item
    return None


def _registrable_host(host: str) -> str:
    labels = [x for x in (host or "").split(".") if x]
    return ".".join(labels[-2:]) if len(labels) >= 2 else host


def _brand_base(value: str) -> str:
    return (value or "").lower().translate(LOOKALIKE_MAP).replace("-", "")


def brand_impersonation_analysis(host: str) -> dict:
    """Detect brand names/lookalikes outside their official registered domains."""
    host = (host or "").lower().rstrip(".")
    labels = [x for x in host.split(".") if x]
    if not labels:
        return {"score": 0, "signals": [], "brands": []}
    registered = _registrable_host(host)
    signals = []
    brands = []
    for brand, official_domains in BRAND_DOMAINS.items():
        official_registered = any(_registrable_host(d) == registered for d in official_domains)
        if official_registered:
            continue
        for label in labels[:-2] if len(labels) > 2 else labels[:-1]:
            normalized = _brand_base(label)
            similarity = difflib.SequenceMatcher(None, normalized, brand).ratio()
            exact_brand = brand in label.lower() or brand in normalized
            if exact_brand or (similarity >= 0.82 and len(label) >= 5):
                title = "Possible brand impersonation"
                detail = f"The hostname contains '{label}', which resembles the {brand} brand but the registered domain is {registered}."
                points = 34 if exact_brand else 38
                signals.append({"key": "brand-impersonation", "points": points, "title": title, "detail": detail})
                brands.append(brand)
                break
    return {"score": min(60, sum(x["points"] for x in signals)), "signals": signals, "brands": sorted(set(brands))}


def heuristic_analysis(url: str, f: dict) -> dict:
    p = urlparse(url)
    host = (p.hostname or "").lower()
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    signals = []
    score = 0

    def add(points, key, title, detail):
        nonlocal score
        score += points
        signals.append({"key": key, "points": points, "title": title, "detail": detail})

    if f["has_ip"]:
        add(28, "ip", "IP address host", "The URL uses a raw IP address instead of a normal domain name.")
    if f["has_at"]:
        add(35, "at", "@ symbol present", "An @ symbol can obscure the destination in a URL and deserves review.")
    if f["url_length"] >= 120:
        add(16, "long", "Very long URL", "Unusually long URLs can hide paths, tracking data, or deceptive parameters.")
    elif f["url_length"] >= 80:
        add(8, "long", "Long URL", "The URL is longer than a typical simple website address.")
    if f["num_subdomains"] >= 3:
        add(14, "subdomains", "Many subdomains", "Multiple nested subdomains can make the visible domain harder to interpret.")
    elif f["num_subdomains"] == 2:
        add(6, "subdomains", "Nested subdomains", "The host contains multiple subdomain levels.")
    if f["hyphen_count"] >= 3:
        add(12, "hyphens", "Several hyphens", "Several hyphens in the host can occur in deceptive lookalike domains.")
    if f["suspicious_words"] >= 2:
        add(18, "words", "Security/account language", "The URL contains multiple words commonly seen in credential or verification lures.")
    elif f["suspicious_words"] == 1:
        add(7, "word", "Security/account keyword", "The URL contains a word associated with login, verification, payment, or security flows.")
    if tld in SUSPICIOUS_TLDS:
        add(12, "tld", "Higher-review TLD", f"The host uses the .{tld} top-level domain, which is treated as a review signal in this prototype.")
    if p.scheme.lower() == "http":
        add(8, "http", "Unencrypted HTTP", "The URL does not use HTTPS. HTTP alone does not prove phishing, but it increases review priority.")
    if len(p.query) > 160:
        add(8, "query", "Large query string", "A large query string can contain redirect or tracking data that deserves inspection.")
    if host in SHORTENERS:
        add(10, "shortener", "URL shortener", "Shortened URLs hide the final destination until expanded.")

    brand = brand_impersonation_analysis(host)
    signals.extend(brand["signals"])
    score += brand["score"]
    return {"score": min(100, score), "signals": signals, "brand_impersonation": brand}


def combine_scores(model_probability, heuristic_score):
    model_pct = float(model_probability) * 100
    combined = 0.65 * model_pct + 0.35 * float(heuristic_score)
    return round(max(0.0, min(100.0, combined)), 2)


def unknown_domain_risk(model_probability, heuristic_score, live_score=0, intel_score=0, clean_page=False, brand_score=0):
    """Risk for domains outside the registry.

    A clean, unknown HTTPS domain is not penalized merely for being absent from the
    allow-list. The ML model is used as supporting evidence rather than the verdict.
    """
    h = float(heuristic_score)
    live = float(live_score)
    intel = float(intel_score)
    brand = float(brand_score)
    if brand:
        return round(min(100.0, 18 + h * 0.45 + brand * 0.9 + live * 0.5 + intel), 2)
    if h <= 8 and live <= 8 and intel == 0 and clean_page:
        return round(min(18.0, 5 + h * 0.35), 2)
    if h <= 12 and live <= 12 and intel == 0:
        return round(min(30.0, 8 + h * 0.9 + live * 0.4), 2)
    return round(min(100.0, h * 0.7 + live * 0.55 + intel * 0.9 + float(model_probability) * 100 * 0.25), 2)


def critical_signal_keys(features: dict, heuristic_signals: list[dict], intelligence: dict | None = None) -> set[str]:
    critical = set()
    if features.get("has_ip"):
        critical.add("ip")
    if features.get("has_at"):
        critical.add("at")
    for signal in heuristic_signals:
        if signal.get("key") == "brand-impersonation":
            critical.add("brand-impersonation")
    if intelligence and int(intelligence.get("malicious", 0)) >= 1:
        critical.add("threat-intel")
    return critical


def decision_for(risk_score: float, heuristic_score: float, trusted: dict | None = None, critical_signal: bool = False, force_block: bool = False):
    if force_block:
        return "block", "High risk"
    if trusted and not critical_signal:
        return "allow", "Safe"
    if risk_score >= 65 or heuristic_score >= 60:
        return "block", "High risk"
    if risk_score >= 35 or heuristic_score >= 28:
        return "review", "Needs review"
    return "allow", "Safe"
