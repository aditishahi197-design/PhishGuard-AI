const API = 'http://127.0.0.1:5000/api/analyze';
const pending = new Set();

async function blockTab(tabId, url, risk = 100) {
  const target = chrome.runtime.getURL('block.html') + 
    '?url=' + encodeURIComponent(url) + 
    '&risk=' + encodeURIComponent(risk);
  return chrome.tabs.update(tabId, { url: target });
}

async function checkTab(tabId, url) {
  if (!url || !/^https?:/i.test(url) || pending.has(tabId)) return;
  pending.add(tabId);
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await r.json();
    if (data.decision === 'block') {
      await blockTab(tabId, url, data.risk_score);
    }
  } catch (_) {
  } finally {
    pending.delete(tabId);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (currentUrl && /^https?:/i.test(currentUrl)) {
    checkTab(tabId, currentUrl);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'block' && message.url) {
    const targetTabId = message.tabId || sender.tab?.id;
    if (targetTabId) {
      blockTab(targetTabId, message.url, message.risk || 100).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }
  }

  if (message.action === 'close_tab') {
    const targetTabId = message.tabId || sender.tab?.id;
    if (targetTabId) {
      chrome.tabs.remove(targetTabId, () => sendResponse({ success: true }));
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.id) {
          chrome.tabs.remove(tabs[0].id);
        }
        sendResponse({ success: true });
      });
    }
    return true;
  }

  if (message.action === 'navigate_safe') {
    const targetTabId = message.tabId || sender.tab?.id;
    const safeUrl = message.url || 'https://www.google.com';
    if (targetTabId) {
      chrome.tabs.update(targetTabId, { url: safeUrl }, () => sendResponse({ success: true }));
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: safeUrl });
        }
        sendResponse({ success: true });
      });
    }
    return true;
  }
});
