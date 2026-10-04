// Extension Popup Logic (Manifest V3)

/**
 * Existing blocking function: temporarily redirects the tab to the warning page.
 */
function blockTab(tabId, url, risk = 100) {
  const target = chrome.runtime.getURL('block.html') + 
    '?url=' + encodeURIComponent(url) + 
    '&risk=' + encodeURIComponent(risk);
  return chrome.tabs.update(tabId, { url: target });
}

// 1. Existing Standard ML URL Check
document.getElementById('scan').onclick = async () => {
  const status = document.getElementById('status');
  status.innerHTML = '<span class="ext-spinner"></span> Scanning…';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const r = await fetch('http://127.0.0.1:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url })
    });
    const d = await r.json();
    status.innerHTML = `<div class="status-box ${d.decision === 'block' ? 'status-danger' : (d.decision === 'review' ? 'status-warning' : 'status-safe')}"><strong>${d.label}</strong> — ${d.risk_score}% risk (${d.decision}).</div>`;
    if (d.decision === 'block') {
      await blockTab(tab.id, tab.url, d.risk_score);
    }
  } catch(e) {
    status.innerHTML = '<div class="status-box status-warning">Start the Flask backend first on port 5000.</div>';
  }
};

// 2. Deep Sandbox Scan (POST /deep-scan & Poll GET /deep-scan/<job_id> every 2s)
document.getElementById('deepScan').onclick = async () => {
  const status = document.getElementById('status');
  const scanBtn = document.getElementById('scan');
  const deepBtn = document.getElementById('deepScan');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !/^https?:/i.test(tab.url)) {
    status.innerHTML = '<div class="status-box status-warning">Cannot scan non-HTTP/HTTPS tabs.</div>';
    return;
  }

  status.innerHTML = '<span class="ext-spinner"></span> Scanning in sandbox...';
  scanBtn.disabled = true;
  deepBtn.disabled = true;

  const startTime = Date.now();
  const TIMEOUT_MS = 90000; // 90 seconds timeout
  const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

  try {
    // Initiate sandbox scan
    const startRes = await fetch('http://127.0.0.1:5000/deep-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url })
    });

    const startData = await startRes.json().catch(() => ({}));
    if (!startRes.ok || !startData.job_id) {
      throw new Error(startData.error || 'Failed to initialize deep sandbox scan.');
    }

    const jobId = startData.job_id;

    // Poll status every 2 seconds until done, failed, or timed out
    while (true) {
      if (Date.now() - startTime >= TIMEOUT_MS) {
        throw new Error('Sandbox deep scan timed out after 90 seconds.');
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(`http://127.0.0.1:5000/deep-scan/${jobId}`);
      if (!pollRes.ok) {
        throw new Error('Failed to retrieve deep scan status from backend.');
      }

      const pollData = await pollRes.json();

      if (pollData.status === 'done') {
        const result = pollData.result || {};
        const verdict = result.verdict || 'Safe';
        const confidencePercent = Math.round((result.confidence || 0) * 100);
        const reasonText = (result.reasons && result.reasons.length > 0) ? result.reasons[0] : 'Analysis complete.';
        const boxClass = verdict === 'Phishing' ? 'status-danger' : (verdict === 'Suspicious' ? 'status-warning' : 'status-safe');

        status.innerHTML = `
          <div class="status-box ${boxClass}">
            <strong>Verdict: ${verdict}</strong> (${confidencePercent}% conf)
            <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">${reasonText}</div>
          </div>
        `;

        // Requirement 9: If the verdict is "Phishing", call existing blocking function to temporarily block the URL
        if (verdict === 'Phishing') {
          await blockTab(tab.id, tab.url, confidencePercent);
        }
        break;
      } else if (pollData.status === 'failed') {
        throw new Error(pollData.error || 'Sandbox deep scan failed.');
      }
      // status === 'pending' continues polling
    }
  } catch (err) {
    status.innerHTML = `<div class="status-box status-warning">${err.message || 'Start the Flask backend first on port 5000.'}</div>`;
  } finally {
    scanBtn.disabled = false;
    deepBtn.disabled = false;
  }
};
