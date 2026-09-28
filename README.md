# PhishGuard AI 
## Evidence-Based Phishing Detection and Prevention System

PhishGuard AI is an AI-powered phishing website detection and prevention prototype developed as an academic cybersecurity project.

The system does not rely only on a machine-learning prediction. It combines multiple sources of evidence, including URL features, machine-learning analysis, security heuristics, legitimate-domain verification, live webpage analysis, and optional threat intelligence.

The final result is classified as:

- **SAFE** — available evidence indicates low risk.
- **REVIEW** — suspicious or incomplete evidence requires further verification.
- **BLOCK** — strong phishing indicators are detected.

> **Note:** PhishGuard AI is an academic prototype. No automated phishing detector can guarantee detection of every newly created or previously unseen phishing website.

---

## 1. Key Features

- AI-based phishing URL detection
- Random Forest machine-learning model
- 15 URL-based features
- Explainable security heuristics
- Detection of new and unseen URLs
- Brand-impersonation detection
- Lookalike-domain detection
- Legitimate-domain registry
- Live webpage analysis
- Optional VirusTotal threat intelligence
- Evidence-based risk assessment
- SAFE / REVIEW / BLOCK classification
- Analysis history
- Risk trend and distribution charts
- PDF report generation
- CSV export
- User feedback
- Browser-extension protection prototype
- Responsive light-theme dashboard

---

## 2. Detection Architecture

```text
                    User URL
                       │
                       ▼
               URL Validation
                       │
                       ▼
              Feature Extraction
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        ML Model           Heuristic Engine
             │                   │
             └─────────┬─────────┘
                       ▼
          Legitimate-Domain Registry
                       │
                       ▼
             Live Page Analysis
                       │
                       ▼
        Optional Threat Intelligence
                       │
                       ▼
              Evidence Aggregation
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼

```
---

## 3. Optional VirusTotal Configuration

Create the backend environment from `.env` and set `VIRUSTOTAL_API_KEY`.

Do not place the API key in React/frontend code.

Without a key, the application still works with:

- Machine Learning
- Security Heuristics
- Legitimate Registry
- Live Page Inspection

---

## 4. Run

### Backend

```bash
cd PhishGuardAI/backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python train_model.py
python app.py
```

### Frontend

```bash
cd PhishGuardAI/frontend
npm install
npm run dev
```

Backend health check:

```bash
curl http://127.0.0.1:5000/api/health
```
---

## 5. Project Structure

```text
PhishGuardAI/
│
├── backend/
│   ├── app.py
│   ├── feature_extractor.py
│   ├── risk_engine.py
│   ├── intelligence.py
│   ├── train_model.py
│   ├── requirements.txt
│   │
│   ├── data/
│   │   ├── phishing_urls.csv
│   │   └── legitimate_urls.csv
│   │
│   ├── model/
│   │   ├── phishing_model.joblib
│   │   └── model_metadata.json
│   │
│   └── reports/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── block.html
│   └── background.js
│
└── README.md
```