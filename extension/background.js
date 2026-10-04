// Chrome Extension Background Service Worker (Manifest V3)
// Real-time link interception and defensive URL inspection

const API = 'http://127.0.0.1:5000/api/analyze';
const pending = new Set();

/**
 * Existing blocking function: temporarily redirects the tab to the warning page.
 * @param {number} tabId Target Chrome tab ID
 * @param {string} url The malicious or suspicious destination URL
 * @param {number|string} risk Calculated risk score or confidence
 */
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
    // Backend offline or unreachable
  } finally {
    pending.delete(tabId);
  }
}

// Intercept navigation events
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (currentUrl && /^https?:/i.test(currentUrl)) {
    checkTab(tabId, currentUrl);
  }
});

// Runtime message listener for external or popup blocking triggers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'block' && message.url) {
    const targetTabId = message.tabId || sender.tab?.id;
    if (targetTabId) {
      blockTab(targetTabId, message.url, message.risk || 100).then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    }
  }
});
