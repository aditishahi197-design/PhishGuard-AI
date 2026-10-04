# PhishGuard AI
## Autonomous IDPS, Deep Sandbox & Web Threat Detection System

PhishGuard AI is an advanced, evidence-based threat detection and prevention platform designed to identify, isolate, and neutralize deceptive websites, credential harvesters, and zero-day phishing attacks in real time.

Unlike static blacklists or isolated machine-learning classifiers, PhishGuard AI implements a **defense-in-depth architecture** combining lexical machine learning, security heuristics, legitimate infrastructure registries, and a **genuine headless browser sandbox** with live network packet telemetry.

---

## 1. Key Capabilities

### 🛡️ Dual-Engine Threat Inspection
- **Quick Triage Analysis**: Millisecond evaluation using a calibrated Random Forest classifier (15 lexical & structural features), security heuristics, brand-impersonation algorithms (Levenshtein distance & lookalike substitution maps), and optional VirusTotal intelligence.
- **Deep Headless Sandbox**: Automated browser container (Chromium/Edge) that executes live URL navigation, captures authentic viewport screenshots, parses dynamic DOM hierarchies, and intercepts external credential exfiltration.

### 🌐 Live Wire & Packet Telemetry
- **Cryptographic Cipher Inspection**: Live socket-level TLS handshake analysis to verify protocol versions (TLS 1.2/1.3) and negotiated cipher suites.
- **Cleartext Leak & Entropy Detection**: Real-time Shannon entropy calculation on wire payloads to identify obfuscation, combined with unencrypted HTTP credential transmission detection.
- **Honeytoken Form Audit**: Automatic extraction of `<form action>` targets to detect rogue external exfiltration destinations (`destination_mismatch`).

### 🔍 Threat Gateway & Inactive Domain Forensics
- **Security Interstitial Intercept**: Automatically detects and parses global threat gateway blocks (**Cloudflare "Suspected Phishing"**, Google Safe Browsing, and Microsoft SmartScreen) to confirm blacklisted campaigns with 99% confidence.
- **DNS & Status Code Intelligence**: Accurately classifies non-existent domains (`NXDOMAIN`), dead/taken-down links (`HTTP 404 / 410`), and server errors (`HTTP 403 / 500`), ensuring inactive endpoints are never falsely reported as safe.

### 🏛️ Verified Infrastructure Registry
- Mathematical false-positive immunity for verified brand roots (Google, Discord, PayPal, Steam, Spotify, Microsoft, Chase, etc.) via [`backend/data/legitimate_urls.csv`](backend/data/legitimate_urls.csv), ensuring authentic subdomains are protected while deceptive lookalikes (`paypa1.com`, `discord-nitro.xyz`) are flagged.

### 💻 Modern Interactive Dashboard & Extension
- **High-Contrast Theme Engine**: Full Dark and Light mode support with curated monochrome button interactions and animated dot progression.
- **Audit Reports**: Instant PDF forensic report generation (ReportLab) and CSV history export.
- **Chrome / Edge Extension (Manifest V3)**: Real-time background threat monitoring with automatic high-risk redirection.

---

## 2. Detection Architecture

```text
                                  User URL Input
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
           [ 1. Quick Triage Engine ]              [ 2. Deep Sandbox Engine ]
                    │                                       │
         URL Lexical Validation                 Public DNS Socket Resolution
                    │                                       │
        15-Feature Vector Extraction           Real TLS Cipher Handshake Check
                    │                                       │
         ┌──────────┴──────────┐               Headless Chromium Navigation
         ▼                     ▼                            │
    Random Forest       Security Heuristics    Pixel Viewport Screenshot Capture
    ML Probability      & Lookalike Check                   │
         │                     │               Live DOM & Form Action Forensics
         └──────────┬──────────┘                            │
                    ▼                          Gateway Threat Interstitial Check
        Legitimate Domain Registry                          │
                    │                          Wire Shannon Entropy & Telemetry
         Optional Threat Intel                              │
                    │                                       ▼
                    ▼                          Sandbox Behavioral Verdict
       Aggregated Evidence Score               (Phishing / Suspicious / Inactive)
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
       SAFE       REVIEW     BLOCK
```

---

## 3. Classification Taxonomy

| Decision | Verdict Label | Criteria |
| :--- | :--- | :--- |
| **SAFE** | Safe Destination Verified | Verified authentic infrastructure in legitimate registry, clean single-hop navigation, or verified benign page with valid cryptographic TLS. |
| **REVIEW** | Needs Review / Inactive | Inaccessible server, connection timeout, HTTP 404/410 endpoint, unresolved NXDOMAIN, or unverified domain with low-confidence signals. |
| **BLOCK** | Phishing / High Risk | Deceptive credential form posting to external host, brand typosquatting, active Cloudflare/Safe Browsing block, or multi-engine threat detection. |

---

## 4. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze` | Quick lexical, heuristic, and live page threat triage. |
| `POST` | `/api/deep-scan` | Initiates asynchronous headless Chromium sandbox container job. |
| `GET` | `/api/deep-scan/<job_id>` | Polls sandbox job status, DOM forensics, screenshot, and packet telemetry. |
| `GET` | `/api/history` | Retrieves recent analysis log entries from SQLite database. |
| `GET` | `/api/stats` | Returns aggregate threat metrics and detection breakdowns. |
| `GET` | `/api/report/<id>` | Downloads structured forensic PDF report. |
| `POST` | `/api/feedback` | Records false-positive / false-negative analyst feedback. |
| `GET` | `/api/health` | Service health, model calibration, and registry status. |

---

## 5. Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Google Chrome or Microsoft Edge installed (for headless sandbox screenshots)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# (Optional) Retrain or calibrate Random Forest model
python train_model.py

# Launch API server
python app.py
```

API server will be running at `http://127.0.0.1:5000`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Dashboard will be accessible at `http://localhost:5173`.

### Browser Extension Setup (Chrome / Edge)
1. Open `chrome://extensions/` or `edge://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the [`extension/`](extension/) directory.

---

## 6. Project Structure

```text
PhishGuardAI/
│
├── backend/
│   ├── app.py                   # Main Flask API, deep sandbox runner, and PDF generator
│   ├── feature_extractor.py     # 15-feature lexical extraction & Shannon entropy
│   ├── risk_engine.py           # Heuristics, brand impersonation & decision thresholds
│   ├── intelligence.py          # Live page inspector, status tracker & threat signatures
│   ├── train_model.py           # Random Forest ML training and evaluation pipeline
│   ├── requirements.txt         # Python dependencies
│   │
│   ├── data/
│   │   ├── phishing_urls.csv    # Known malicious sample corpus
│   │   └── legitimate_urls.csv  # Verified legitimate brand registry
│   │
│   ├── model/
│   │   ├── phishing_model.joblib # Serialized Random Forest classifier
│   │   └── model_metadata.json   # Model metrics, feature importances, and versioning
│   │
│   └── reports/                 # Storage for generated forensic artifacts
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React dashboard, telemetry & deep scan UI
│   │   ├── main.jsx             # React entrypoint
│   │   └── styles.css           # Premium responsive styling (Light/Dark themes)
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── extension/
│   ├── manifest.json            # Manifest V3 extension configuration
│   ├── popup.html               # Extension interface
│   ├── popup.js                 # Threat score visualization & live scanner
│   ├── block.html               # Phishing interception warning screen
│   └── background.js            # Background network interceptor
│
├── .gitignore
└── README.md
```

---

## 7. Security & Academic Disclaimer

PhishGuard AI is developed as a cybersecurity and threat intelligence research system. While the multi-layered IDPS pipeline, headless sandbox, and legitimate registry significantly mitigate risks and eliminate common false positives, no automated security engine can guarantee mathematical 100% prevention against all zero-day or adversarial evasion techniques. Always exercise defensive browsing practices.