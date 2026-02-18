/**
 * Background service worker.
 * Handles the extension badge to indicate when on a PR page.
 */

// Update badge when tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    updateBadge(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      updateBadge(tab.id, tab.url);
    }
  } catch {
    // Tab might be gone
  }
});

function updateBadge(tabId, url) {
  const isPr = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url);

  if (isPr) {
    chrome.action.setBadgeText({ text: "PR", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1", tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId });
  }
}
