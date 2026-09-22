import ipaddress
import math
import re
from urllib.parse import urlparse, parse_qs

FEATURE_ORDER = [
    "url_length", "num_dots", "has_https", "has_ip", "num_subdirs",
    "num_params", "suspicious_words", "special_char_count", "digits_count",
    "entropy", "num_subdomains", "has_at", "has_fragment", "domain_length",
    "hyphen_count"
]

SUSPICIOUS_WORDS = {
    "login", "signin", "verify", "verification", "secure", "security", "account",
    "update", "confirm", "password", "credential", "bank", "wallet", "payment",
    "invoice", "support", "alert", "urgent", "unlock", "recover", "authenticate",
}


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", url):
            raise ValueError("Use a complete URL such as https://example.com")
        url = "https://" + url
    return url


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def _is_ip(hostname: str) -> int:
    if not hostname:
        return 0
    try:
        ipaddress.ip_address(hostname)
        return 1
    except ValueError:
        return 0


def extract_features(url: str) -> dict:
    url = normalize_url(url)
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""
    full_lower = url.lower()
    labels = [x for x in host.split(".") if x]

    num_subdomains = max(0, len(labels) - 2) if len(labels) >= 2 else 0
    suspicious_words = sum(1 for word in SUSPICIOUS_WORDS if re.search(rf"(?<![a-z0-9]){re.escape(word)}(?![a-z0-9])", full_lower))
    special_char_count = len(re.findall(r"[^a-zA-Z0-9]", url))
    digits_count = sum(ch.isdigit() for ch in url)
    num_subdirs = len([p for p in path.split("/") if p])
    num_params = len(parse_qs(query, keep_blank_values=True))
    domain_length = len(host)
    hyphen_count = host.count("-")

    values = {
        "url_length": len(url),
        "num_dots": host.count("."),
        "has_https": int(parsed.scheme.lower() == "https"),
        "has_ip": _is_ip(host),
        "num_subdirs": num_subdirs,
        "num_params": num_params,
        "suspicious_words": suspicious_words,
        "special_char_count": special_char_count,
        "digits_count": digits_count,
        "entropy": _entropy(url),
        "num_subdomains": num_subdomains,
        "has_at": int("@" in url),
        "has_fragment": int(bool(parsed.fragment)),
        "domain_length": domain_length,
        "hyphen_count": hyphen_count,
    }
    return values
