import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

from feature_extractor import FEATURE_ORDER, extract_features

BASE = Path(__file__).resolve().parent
DATA_PATH = BASE / "data" / "phishing_urls.csv"
MODEL_DIR = BASE / "model"
MODEL_DIR.mkdir(exist_ok=True)


def normalize_label(v):
    s = str(v).strip().lower()
    if s in {"1", "true", "yes", "phishing", "malicious", "bad", "phish"}: return 1
    if s in {"0", "false", "no", "legitimate", "benign", "safe", "good"}: return 0
    try:
        return int(float(s))
    except Exception:
        return None


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Put your Kaggle CSV at: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    cols = {c.strip().lower(): c for c in df.columns}
    url_col = cols.get("url") or cols.get("domain") or cols.get("website")
    label_col = cols.get("label") or cols.get("class") or cols.get("status")
    if not url_col or not label_col:
        raise ValueError(f"Could not identify URL/label columns. Found: {list(df.columns)}")

    rows = []
    for _, r in df[[url_col, label_col]].dropna().iterrows():
        url = str(r[url_col]).strip()
        label = normalize_label(r[label_col])
        if not url or label not in {0, 1}:
            continue
        f = extract_features(url)
        rows.append({**f, "label": label, "normalized_url": url.lower()})
    data = pd.DataFrame(rows).drop_duplicates(subset=["normalized_url"])
    if len(data) < 100:
        raise ValueError("Too few usable labeled URLs after cleaning.")

    X = data[FEATURE_ORDER]
    y = data["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    base = RandomForestClassifier(
        n_estimators=300, random_state=42, n_jobs=-1,
        class_weight="balanced_subsample", min_samples_leaf=2
    )
    model = CalibratedClassifierCV(estimator=base, method="sigmoid", cv=3)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    print(f"Rows used: {len(data):,}")
    accuracy = accuracy_score(y_test, pred)
    precision = precision_score(y_test, pred, zero_division=0)
    recall = recall_score(y_test, pred, zero_division=0)
    f1 = f1_score(y_test, pred, zero_division=0)
    cm = confusion_matrix(y_test, pred).tolist()
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1:        {f1:.4f}")
    print("Confusion matrix:")
    print(confusion_matrix(y_test, pred))

    joblib.dump(model, MODEL_DIR / "phishing_model.joblib")
    metadata = {
        "feature_order": FEATURE_ORDER,
        "rows_used": int(len(data)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "model_type": "RandomForestClassifier + CalibratedClassifierCV(sigmoid)",
        "model_source": "trained calibrated model",
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "confusion_matrix": cm,
        "label_mapping": "1=phishing/malicious, 0=legitimate/benign",
    }
    (MODEL_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved model to {MODEL_DIR / 'phishing_model.joblib'}")


if __name__ == "__main__":
    main()
