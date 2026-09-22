# Browser guard prototype

1. Start the Flask backend.
2. Open Chrome/Edge Extensions and enable Developer mode.
3. Choose **Load unpacked** and select this `extension` folder.
4. Browse normally. When a page finishes loading, the extension sends its URL to the local PhishGuard API. High-risk results are redirected to `block.html`.

This is a prototype: Manifest V3 does not provide a simple synchronous arbitrary-URL blocking hook for this architecture, so the redirect happens after navigation completes. A production-grade blocker should use a browser-native declarative ruleset, enterprise policy, DNS filtering, or a security gateway.
