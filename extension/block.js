document.addEventListener('DOMContentLoaded', () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const risk = params.get('risk');
    const riskEl = document.getElementById('risk');
    if (riskEl) {
      riskEl.textContent = risk ? `${risk}% Confirmed Threat` : 'Elevated (High Risk)';
    }
  } catch (err) {
    console.error('Error reading parameters', err);
  }

  const returnBtn = document.getElementById('btn-return');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      if (window.history.length > 2) {
        window.history.go(-2);
        return;
      }

      const safeUrl = 'https://www.google.com';
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab && tab.id) {
            chrome.tabs.update(tab.id, { url: safeUrl });
          } else if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'navigate_safe', url: safeUrl }, () => {
              window.location.href = safeUrl;
            });
          } else {
            window.location.href = safeUrl;
          }
        });
      } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'navigate_safe', url: safeUrl }, () => {
          window.location.href = safeUrl;
        });
      } else {
        window.location.href = safeUrl;
      }
    });
  }

  const closeBtn = document.getElementById('btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.getCurrent) {
        chrome.tabs.getCurrent((tab) => {
          if (tab && tab.id) {
            chrome.tabs.remove(tab.id, () => {
              if (chrome.runtime && chrome.runtime.lastError) {
                window.close();
              }
            });
          } else if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'close_tab' }, () => {
              window.close();
            });
          } else {
            window.close();
          }
        });
      } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'close_tab' }, () => {
          window.close();
        });
      } else {
        window.close();
      }
    });
  }

  const proceedBtn = document.getElementById('btn-proceed');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      const targetUrl = params.get('url');
      if (targetUrl && /^https?:/i.test(targetUrl)) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'set_interception', interception_active: false }, () => {
            window.location.href = targetUrl;
          });
        } else {
          window.location.href = targetUrl;
        }
      }
    });
  }
});
