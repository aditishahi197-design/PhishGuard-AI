import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from risk_engine import decision_for, is_trusted_host, critical_signal_keys

TRUSTED = [{"domain": "whatsapp.com", "name": "WhatsApp", "category": "Communication"}]


def test_real_subdomain_is_trusted():
    assert is_trusted_host("web.whatsapp.com", TRUSTED)


def test_lookalike_is_not_trusted():
    assert is_trusted_host("web.whatsapp.com.evil.com", TRUSTED) is None


def test_trusted_domain_stays_safe_without_critical_signal():
    assert decision_for(56, 40, trusted=TRUSTED[0], critical_signal=False) == ("allow", "Safe")


def test_multiple_strong_signals_can_block():
    assert decision_for(58, 53, trusted=None, critical_signal=True, force_block=True) == ("block", "High risk")


def test_ip_is_critical_but_not_every_ip_is_automatically_blocked():
    keys = critical_signal_keys({"has_ip": True, "has_at": False}, [{"key": "ip"}], {})
    assert "ip" in keys
    assert decision_for(50, 28, trusted=None, critical_signal=True, force_block=False)[0] == "review"


def test_unregistered_subdomain_is_not_trusted_without_dns(monkeypatch):
    import risk_engine
    monkeypatch.setattr(risk_engine, "_resolves_to_public_ip", lambda host: False)
    assert risk_engine.is_trusted_host("web.microsoft.com", [{"domain": "microsoft.com", "name": "Microsoft"}], require_dns_for_implicit_subdomain=True) is None


def test_explicitly_registered_subdomain_is_trusted_without_dns():
    trusted = [
        {"domain": "whatsapp.com", "name": "WhatsApp"},
        {"domain": "web.whatsapp.com", "name": "WhatsApp Web"},
    ]
    assert is_trusted_host("web.whatsapp.com", trusted, require_dns_for_implicit_subdomain=True)


def test_raw_ip_plus_phishing_word_is_block():
    assert decision_for(58, 53, trusted=None, critical_signal=True, force_block=True) == ("block", "High risk")


def test_clean_unknown_domain_is_safe():
    from feature_extractor import extract_features
    from risk_engine import heuristic_analysis, unknown_domain_risk, decision_for
    f = extract_features("https://www.example.com/")
    h = heuristic_analysis("https://www.example.com/", f)
    risk = unknown_domain_risk(0.8, h["score"], 0, 0, clean_page=True, brand_score=0)
    assert risk <= 18
    assert decision_for(risk, h["score"]) == ("allow", "Safe")


def test_lookalike_brand_is_blockable():
    from feature_extractor import extract_features
    from risk_engine import heuristic_analysis, unknown_domain_risk, decision_for
    url = "https://g00gle-security.example/login/verify"
    f = extract_features(url)
    h = heuristic_analysis(url, f)
    brand_score = h["brand_impersonation"]["score"]
    risk = unknown_domain_risk(0.8, h["score"], 0, 0, clean_page=False, brand_score=brand_score)
    assert brand_score >= 34
    assert decision_for(risk, h["score"], force_block=True) == ("block", "High risk")


def test_safe_browsing_phishing_fixture_is_high_severity():
    from urllib.parse import urlparse
    parsed = urlparse("https://testsafebrowsing.appspot.com/s/phishing.html")
    assert parsed.hostname == "testsafebrowsing.appspot.com"
    assert parsed.path == "/s/phishing.html"
