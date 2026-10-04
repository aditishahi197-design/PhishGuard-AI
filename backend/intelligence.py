import ipaddress
import os
import re
import socket
from urllib.parse import urlparse

import requests
import urllib3
import urllib3.util.connection as urllib_conn

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
urllib_conn.allowed_gai_family = lambda: socket.AF_INET

USER_AGENT = "PhishGuardAI/9.0 security-research-prototype (Mozilla/5.0 Windows NT 10.0; Win64; x64)"
MAX_BYTES = 2_000_000

LOGIN_WORDS = re.compile(r"\b(sign\s*in|log\s*in|login|password|passwd|verify|verification|account|otp|one[- ]time|credential|wallet|card number|cvv|ssn)\b", re.I)
BRAND_WORDS = re.compile(r"\b(paypal|microsoft|google|apple|amazon|facebook|instagram|whatsapp|netflix|linkedin|github|bank|sbi|hdfc|icici|flipkart)\b", re.I)


def _public_ip(host):
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except Exception:
        try:
            infos = socket.getaddrinfo(host, 80, type=socket.SOCK_STREAM)
        except Exception:
            return []
    ips = []
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
            if not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
                ips.append(str(ip))
        except Exception:
            continue
    return sorted(set(ips))


def inspect_page(url, trusted_domain=None):
    """Fetch a public HTTP(S) page and extract explainable phishing indicators."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if not host:
        return {"available": False, "status": "invalid hostname", "signals": [], "final_url": url}
    if host in {"localhost", "127.0.0.1", "::1"}:
        return {"available": False, "status": "local destination not fetched", "signals": [], "final_url": url}
    ips = _public_ip(host)
    if not ips:
        return {"available": False, "status": "host did not resolve to a public IP", "signals": [], "final_url": url}

    try:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=(4, 6), allow_redirects=True, stream=True, verify=False)
        chunks, size = [], 0
        for chunk in r.iter_content(65536):
            if not chunk:
                continue
            remaining = MAX_BYTES - size
            chunks.append(chunk[:remaining]); size += min(len(chunk), remaining)
            if size >= MAX_BYTES:
                break
        body = b"".join(chunks).decode(r.encoding or "utf-8", errors="ignore")
    except requests.RequestException as exc:
        return {"available": False, "status": f"fetch unavailable: {type(exc).__name__}", "signals": [], "final_url": url, "resolved_ips": ips}

    lower = body.lower()
    title_match = re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S)
    title = re.sub(r"\s+", " ", title_match.group(1)).strip()[:180] if title_match else ""
    forms = len(re.findall(r"<form\b", body, re.I))
    password_fields = len(re.findall(r"<input[^>]+type\s*=\s*[\"']?password", body, re.I))
    external_scripts = len(re.findall(r"<script[^>]+src\s*=", body, re.I))
    login_hits = sorted(set(LOGIN_WORDS.findall(body)))[:12]
    brand_hits = sorted(set(BRAND_WORDS.findall(body)))[:12]
    signals = []

    def add(key, points, title_, detail):
        signals.append({"key": key, "points": points, "title": title_, "detail": detail})

    if password_fields:
        add("password-form", 24, "Password field detected", f"The page contains {password_fields} password input field(s), so it can request credentials.")
    elif forms and login_hits:
        add("credential-language", 12, "Credential-related page content", "The page contains a form and login/account/verification language.")
    if brand_hits and not trusted_domain:
        add("brand-content", 10, "Recognizable brand language", f"The page contains brand or financial terms: {', '.join(brand_hits[:6])}.")
    if parsed.scheme.lower() == "http":
        add("page-http", 8, "Page served over HTTP", "The fetched destination is not using HTTPS.")
    if len(r.history) >= 2:
        add("redirect-chain", 8, "Multiple redirects", f"The destination used {len(r.history)} redirect step(s) before the final page.")
    if "text/html" not in (r.headers.get("content-type") or "").lower():
        add("non-html", 0, "Non-HTML response", "The destination did not return an HTML page, so content analysis is limited.")

    # Check for inactive / 404 status codes
    if r.status_code in {404, 410}:
        add("http-404", 14, f"Endpoint Not Found (HTTP {r.status_code})", f"The destination server returned HTTP {r.status_code}. The requested page does not exist or has been taken down.")
    elif r.status_code >= 400:
        add(f"http-{r.status_code}", 10, f"HTTP Server Error ({r.status_code})", f"The destination server returned HTTP {r.status_code} error code.")

    # Check for security gateway phishing interstitials (e.g. Cloudflare Suspected Phishing, Google Safe Browsing)
    threat_interstitial_patterns = [
        r"suspected\s+phishing",
        r"reported\s+for\s+potential\s+phishing",
        r"deceptive\s+site\s+ahead",
        r"reported\s+as\s+a\s+deceptive\s+site",
        r"this\s+site\s+has\s+been\s+reported\s+as\s+unsafe",
        r"phishing\s+is\s+when\s+a\s+site\s+attempts\s+to\s+steal",
        r"the\s+site\s+ahead\s+contains\s+harmful\s+programs",
        r"the\s+site\s+ahead\s+contains\s+malware",
        r"dangerous\s+site",
    ]
    if any(re.search(pat, body, re.I) for pat in threat_interstitial_patterns) or any(re.search(pat, title, re.I) for pat in threat_interstitial_patterns):
        add("threat-interstitial", 50, "Confirmed Phishing / Threat Interstitial", "Destination displays an active security gateway warning (e.g. Cloudflare 'Suspected Phishing' or browser deceptive site interstitial).")

    return {
        "available": True, "status": f"HTTP {r.status_code}", "status_code": r.status_code, "final_url": r.url,
        "resolved_ips": ips, "title": title, "forms": forms,
        "password_fields": password_fields, "external_scripts": external_scripts,
        "login_terms": login_hits, "brand_terms": brand_hits, "signals": signals,
        "bytes_inspected": size,
    }

#future scope
def virustotal_lookup(url):
    """Optional VirusTotal URL lookup. Returns unavailable when no backend key is configured."""
    api_key = os.getenv("VIRUSTOTAL_API_KEY", "").strip()
    if not api_key:
        return {"available": False, "status": "not configured", "malicious": 0, "suspicious": 0, "total": 0}
    try:
        import base64
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        r = requests.get(f"https://www.virustotal.com/api/v3/urls/{url_id}", headers={"x-apikey": api_key}, timeout=8)
        if r.status_code == 404:
            return {"available": True, "status": "not yet known to VirusTotal", "malicious": 0, "suspicious": 0, "total": 0}
        r.raise_for_status()
        stats = r.json().get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        return {"available": True, "status": "lookup complete", "malicious": int(stats.get("malicious", 0)), "suspicious": int(stats.get("suspicious", 0)), "total": int(sum(stats.values()))}
    except Exception as exc:
        return {"available": False, "status": f"lookup unavailable: {type(exc).__name__}", "malicious": 0, "suspicious": 0, "total": 0}
