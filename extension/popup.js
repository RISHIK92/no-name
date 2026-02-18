const API_URL = "http://localhost:3001";

// ─── DOM References ──────────────────────────────────────
const $notPr = document.getElementById("not-pr");
const $prDetected = document.getElementById("pr-detected");
const $loading = document.getElementById("loading");
const $error = document.getElementById("error");
const $results = document.getElementById("results");
const $prUrlText = document.getElementById("pr-url-text");
const $prMeta = document.getElementById("pr-meta");
const $reviewBtn = document.getElementById("review-btn");
const $postComment = document.getElementById("post-comment");
const $loadingPhase = document.getElementById("loading-phase");
const $errorMsg = document.getElementById("error-msg");
const $retryBtn = document.getElementById("retry-btn");
const $summaryGrid = document.getElementById("summary-grid");
const $phasesContainer = document.getElementById("phases-container");
const $copyBtn = document.getElementById("copy-btn");
const $openFullBtn = document.getElementById("open-full-btn");
const $commentStatus = document.getElementById("comment-status");

let currentPrUrl = null;
let currentResult = null;

// ─── Initialization ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab?.url || "";

    if (isGitHubPr(url)) {
      currentPrUrl = url;
      showState("pr-detected");
      $prUrlText.textContent = shortenUrl(url);

      // Try to get PR meta from the page
      try {
        const meta = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_PR_INFO",
        });
        if (meta) renderPrMeta(meta);
      } catch {
        // Content script might not be loaded yet, that's ok
        renderPrMeta(parsePrUrlMeta(url));
      }
    } else {
      showState("not-pr");
    }
  } catch (err) {
    console.error("Init error:", err);
    showState("not-pr");
  }
});

// ─── Event Listeners ─────────────────────────────────────
$reviewBtn.addEventListener("click", runReview);
$retryBtn.addEventListener("click", runReview);
$copyBtn.addEventListener("click", copyMarkdown);
$openFullBtn.addEventListener("click", () => {
  if (currentResult?.metadata?.htmlUrl) {
    chrome.tabs.create({ url: currentResult.metadata.htmlUrl });
  }
});

// ─── Main Review Flow ────────────────────────────────────
async function runReview() {
  if (!currentPrUrl) return;

  showState("loading");
  $loadingPhase.textContent = "Fetching PR data & running AI analysis...";

  try {
    const res = await fetch(`${API_URL}/api/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prUrl: currentPrUrl,
        postComment: $postComment.checked,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${res.status}`);
    }

    currentResult = await res.json();
    renderResults(currentResult);
    showState("results");
  } catch (err) {
    $errorMsg.textContent = err.message;
    showState("error");
  }
}

// ─── Render Results ──────────────────────────────────────
function renderResults(data) {
  const s = data.analysis.summary;

  // Summary grid
  $summaryGrid.innerHTML = [
    { count: s.critical, label: "🔴 Critical", cls: "critical" },
    { count: s.high, label: "🟠 High", cls: "high" },
    { count: s.medium, label: "🟡 Medium", cls: "medium" },
    { count: s.low, label: "🔵 Low", cls: "low" },
    { count: s.info, label: "💡 Info", cls: "info" },
  ]
    .map(
      (st) => `
    <div class="summary-stat">
      <div class="count count-${st.cls}">${st.count}</div>
      <div class="label">${st.label}</div>
    </div>
  `,
    )
    .join("");

  // Phase sections
  $phasesContainer.innerHTML = "";

  const phases = [
    {
      title: "Breaking Bugs",
      icon: "🐛",
      findings: data.analysis.breakingBugs,
      color: "critical",
      emptyMsg: "No breaking bugs found!",
    },
    {
      title: "Code Smells",
      icon: "🧹",
      findings: data.analysis.codeSmells,
      color: "medium",
      emptyMsg: "No code smells detected!",
    },
    {
      title: "Vibe Refactor",
      icon: "✨",
      findings: data.analysis.vibeRefactor,
      color: "info",
      emptyMsg: "Already vibing! Code looks modern.",
    },
  ];

  phases.forEach((phase, idx) => {
    const section = document.createElement("div");
    section.className = "phase-section fade-in";
    section.style.animationDelay = `${idx * 0.1}s`;
    section.innerHTML = renderPhase(phase);
    $phasesContainer.appendChild(section);

    // Toggle expand/collapse
    section.querySelector(".phase-header").addEventListener("click", () => {
      const body = section.querySelector(".phase-body");
      const chevron = section.querySelector(".phase-chevron");
      if (body.style.display === "none") {
        body.style.display = "block";
        chevron.classList.add("open");
      } else {
        body.style.display = "none";
        chevron.classList.remove("open");
      }
    });
  });

  // Comment status
  $commentStatus.classList.add("hidden");
  if (data.commentPosted) {
    $commentStatus.className = "comment-success";
    $commentStatus.innerHTML = `✅ Review posted as PR comment!${
      data.commentResult?.htmlUrl
        ? ` <a href="${data.commentResult.htmlUrl}" style="color:#4ade80;text-decoration:underline;margin-left:auto;" target="_blank">View →</a>`
        : ""
    }`;
    $commentStatus.classList.remove("hidden");
  } else if (data.commentResult?.error) {
    $commentStatus.className = "comment-error";
    $commentStatus.textContent = `❌ ${data.commentResult.error}`;
    $commentStatus.classList.remove("hidden");
  }
}

function renderPhase({ title, icon, findings, color, emptyMsg }) {
  const countColor =
    {
      critical: "badge-critical",
      medium: "badge-medium",
      info: "badge-info",
    }[color] || "badge-info";

  return `
    <div class="phase-header">
      <div class="phase-header-left">
        <span class="phase-icon">${icon}</span>
        <span class="phase-title">${title}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge ${countColor}" style="font-size:11px">${findings.length}</span>
        <svg class="phase-chevron open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 9l-7 7-7-7"/></svg>
      </div>
    </div>
    <div class="phase-body">
      ${
        findings.length === 0
          ? `<div class="phase-empty"><div class="phase-empty-icon">✅</div>${emptyMsg}</div>`
          : findings.map((f) => renderFinding(f)).join("")
      }
    </div>
  `;
}

function renderFinding(f) {
  const sev = f.severity || "info";
  const sevMap = {
    critical: { cls: "badge-critical", label: "Critical" },
    high: { cls: "badge-high", label: "High" },
    medium: { cls: "badge-medium", label: "Medium" },
    low: { cls: "badge-low", label: "Low" },
    info: { cls: "badge-info", label: "Info" },
  };
  const badge = sevMap[sev] || sevMap.info;

  let html = `
    <div class="finding-card">
      <div class="finding-top">
        <div class="finding-left">
          <span class="badge ${badge.cls}">${badge.label}</span>
          <span class="finding-title">${esc(f.title)}</span>
        </div>
        <span class="finding-file">${esc(f.file)}${f.line && f.line !== "N/A" ? `:${f.line}` : ""}</span>
      </div>
      <div class="finding-desc">${esc(f.description)}</div>
  `;

  if (f.suggestion) {
    html += `
      <div class="finding-suggestion">
        <div class="suggestion-label">💡 Suggestion</div>
        <div class="suggestion-text">${esc(f.suggestion)}</div>
      </div>
    `;
  }

  if (f.before && f.after) {
    html += `
      <div class="before-after">
        <div class="ba-block ba-before">
          <div class="ba-label">Before</div>
          <div class="ba-code">${esc(f.before)}</div>
        </div>
        <div class="ba-block ba-after">
          <div class="ba-label">After</div>
          <div class="ba-code">${esc(f.after)}</div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// ─── Copy Markdown ───────────────────────────────────────
async function copyMarkdown() {
  if (!currentResult?.markdown) return;
  try {
    await navigator.clipboard.writeText(currentResult.markdown);
    $copyBtn.innerHTML = `✅ Copied!`;
    $copyBtn.classList.add("copied");
    setTimeout(() => {
      $copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy Markdown
      `;
      $copyBtn.classList.remove("copied");
    }, 2000);
  } catch (err) {
    console.error("Copy failed:", err);
  }
}

// ─── Helpers ─────────────────────────────────────────────
function showState(state) {
  [$notPr, $prDetected, $loading, $error, $results].forEach((el) =>
    el.classList.add("hidden"),
  );
  const map = {
    "not-pr": $notPr,
    "pr-detected": $prDetected,
    loading: $loading,
    error: $error,
    results: $results,
  };
  map[state]?.classList.remove("hidden");
}

function isGitHubPr(url) {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url);
}

function shortenUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

function parsePrUrlMeta(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return {};
  return {
    owner: match[1],
    repo: match[2],
    number: match[3],
  };
}

function renderPrMeta(meta) {
  const tags = [];
  if (meta.owner && meta.repo) {
    tags.push(
      `<span class="pr-meta-tag tag-author">📦 ${meta.owner}/${meta.repo}</span>`,
    );
  }
  if (meta.number) {
    tags.push(`<span class="pr-meta-tag tag-files">#${meta.number}</span>`);
  }
  if (meta.title) {
    $prUrlText.textContent = meta.title;
  }
  $prMeta.innerHTML = tags.join("");
}

function esc(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
