document.getElementById('scan').onclick = async () => {
  const status = document.getElementById('status'); status.textContent = 'Scanning…';
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  try {
    const r = await fetch('http://127.0.0.1:5000/api/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:tab.url})});
    const d = await r.json(); status.textContent = `${d.label} — ${d.risk_score}% risk (${d.decision}).`;
    if (d.decision === 'block') chrome.tabs.update(tab.id, {url: chrome.runtime.getURL('block.html') + '?url=' + encodeURIComponent(tab.url) + '&risk=' + encodeURIComponent(d.risk_score)});
  } catch(e) { status.textContent = 'Start the Flask backend first.'; }
};
