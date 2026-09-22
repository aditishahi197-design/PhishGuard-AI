const API = 'http://127.0.0.1:5000/api/analyze';
const pending = new Set();

async function checkTab(tabId, url) {
  if (!url || !/^https?:/i.test(url) || pending.has(tabId)) return;
  pending.add(tabId);
  try {
    const r = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url})});
    const data = await r.json();
    if (data.decision === 'block') {
      const target = chrome.runtime.getURL('block.html') + '?url=' + encodeURIComponent(url) + '&risk=' + encodeURIComponent(data.risk_score);
      await chrome.tabs.update(tabId, {url: target});
    }
  } catch (_) {
  
  } finally {
    pending.delete(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') checkTab(tabId, tab.url);
});
