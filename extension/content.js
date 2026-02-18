/**
 * Content script — injected into GitHub PR pages.
 * Extracts PR metadata from the DOM for the popup.
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_PR_INFO") {
    try {
      const info = extractPrInfo();
      sendResponse(info);
    } catch (err) {
      console.error("PR info extraction error:", err);
      sendResponse(null);
    }
  }
  return true; // Keep message channel open for async response
});

function extractPrInfo() {
  const url = window.location.href;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  // Try to extract data from the GitHub DOM
  const titleEl = document.querySelector(
    ".js-issue-title, .gh-header-title .js-issue-title",
  );
  const title = titleEl?.textContent?.trim() || "";

  // Get PR number
  const number = match[3];

  // Get author
  const authorEl = document.querySelector(
    ".pull-header-entity .author, .gh-header-meta .author",
  );
  const author = authorEl?.textContent?.trim() || "";

  // Get branch info
  const branchEls = document.querySelectorAll(
    ".commit-ref .css-truncate-target",
  );
  const headBranch = branchEls[0]?.textContent?.trim() || "";
  const baseBranch = branchEls[1]?.textContent?.trim() || "";

  // Get file count from the tab
  const filesTab = document.querySelector(
    "#files_tab_counter, .tabnav-tab .Counter",
  );
  const changedFiles = filesTab?.textContent?.trim() || "";

  // Get additions/deletions
  const diffStatEl = document.querySelector(".diffstat");
  const additions =
    diffStatEl
      ?.querySelector(".color-fg-success, .text-green")
      ?.textContent?.trim() || "";
  const deletions =
    diffStatEl
      ?.querySelector(".color-fg-danger, .text-red")
      ?.textContent?.trim() || "";

  return {
    owner: match[1],
    repo: match[2],
    number,
    title,
    author,
    headBranch,
    baseBranch,
    changedFiles,
    additions,
    deletions,
  };
}
