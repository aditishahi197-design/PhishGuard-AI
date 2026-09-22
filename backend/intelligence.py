import ipaddress
import re
import socket
from urllib.parse import urlparse

import requests

USER_AGENT = "PhishGuardAI/9.0 security-research-prototype"
MAX_BYTES = 2_000_000

LOGIN_WORDS = re.compile(r"\b(sign\s*in|log\s*in|login|password|passwd|verify|verification|account|otp|one[- ]time|credential|wallet|card number|cvv|ssn)\b", re.I)
BRAND_WORDS = re.compile(r"\b(paypal|microsoft|google|apple|amazon|facebook|instagram|whatsapp|netflix|linkedin|github|bank|sbi|hdfc|icici|flipkart)\b", re.I)


def _public_ip(host):
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
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
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=(3, 5), allow_redirects=True, stream=True)
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

    return {
        "available": True, "status": f"HTTP {r.status_code}", "final_url": r.url,
        "resolved_ips": ips, "title": title, "forms": forms,
        "password_fields": password_fields, "external_scripts": external_scripts,
        "login_terms": login_hits, "brand_terms": brand_hits, "signals": signals,
        "bytes_inspected": size,
    }

#future scope
