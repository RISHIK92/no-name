"use client";

import { useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [prUrl, setPrUrl] = useState("");
  const [postComment, setPostComment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("visual");
  const resultRef = useRef(null);

  const isValidUrl = (url) => {
    return (
      /(?:https?:\/\/)?github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url) ||
      /^[^/]+\/[^#]+#\d+$/.test(url)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prUrl.trim() || !isValidUrl(prUrl.trim())) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("Parsing PR URL...");

    try {
      setProgress("Fetching PR data & running AI analysis...");

      const res = await fetch(`${API_URL}/api/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prUrl: prUrl.trim(), postComment }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setProgress("");

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdown = async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityBadge = (severity) => {
    const map = {
      critical: { class: "badge-critical", icon: "🔴", label: "Critical" },
      high: { class: "badge-high", icon: "🟠", label: "High" },
      medium: { class: "badge-medium", icon: "🟡", label: "Medium" },
      low: { class: "badge-low", icon: "🔵", label: "Low" },
      info: { class: "badge-info", icon: "💡", label: "Info" },
    };
    const s = map[severity] || map.info;
    return (
      <span className={`badge ${s.class}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8">
      {/* Hero Header */}
      <header className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-sm font-medium mb-6">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          AI-Powered Code Review
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          <span className="gradient-text">PR Review Bot</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Paste a GitHub PR URL and get an instant 3-phase analysis —
          <span className="text-critical font-medium"> breaking bugs</span>,
          <span className="text-medium font-medium"> code smells</span>, and
          <span className="text-info font-medium"> vibe refactors</span>.
        </p>
      </header>

      {/* Input Section */}
      <div className="max-w-3xl mx-auto mb-12">
        <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary-light"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub Pull Request URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-foreground placeholder-gray-500 font-mono text-sm transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !prUrl.trim() || !isValidUrl(prUrl.trim())}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold text-sm hover:from-primary-dark hover:to-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 justify-center whitespace-nowrap cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Review PR
                  </>
                )}
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={postComment}
                  onChange={(e) => setPostComment(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                  disabled={loading}
                />
                Post results as PR comment
              </label>
              {prUrl && !isValidUrl(prUrl) && (
                <span className="text-critical text-xs">
                  Invalid PR URL format
                </span>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-4xl mx-auto mb-12 fade-in">
          <div className="glass-card p-8 pulse-glow">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Analyzing Pull Request
                </h3>
                <p className="text-sm text-gray-400">{progress}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Scanning for breaking bugs...",
                "Detecting code smells...",
                "Generating vibe refactors...",
              ].map((phase, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="shimmer w-4 h-4 rounded-full" />
                  <div
                    className="shimmer h-4 rounded flex-1"
                    style={{ maxWidth: `${60 + i * 10}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-4xl mx-auto mb-12 fade-in">
          <div className="glass-card border-critical/30 p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-critical flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-critical">Analysis Failed</h3>
                <p className="text-sm text-gray-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div ref={resultRef} className="max-w-5xl mx-auto fade-in">
          {/* PR Metadata Card */}
          <div className="glass-card p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {result.metadata.authorAvatar && (
                  <img
                    src={result.metadata.authorAvatar}
                    alt={result.metadata.author}
                    className="w-12 h-12 rounded-full border-2 border-primary/30"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {result.metadata.title}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="text-primary-light font-medium">
                      #{result.metadata.number}
                    </span>
                    {" by "}
                    <span className="text-accent-light font-medium">
                      @{result.metadata.author}
                    </span>
                    {" • "}
                    <span className="font-mono text-xs">
                      {result.metadata.headBranch}
                    </span>
                    {" → "}
                    <span className="font-mono text-xs">
                      {result.metadata.baseBranch}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-lg bg-success/10 text-success border border-success/20 font-mono text-xs">
                  +{result.metadata.additions}
                </span>
                <span className="px-3 py-1 rounded-lg bg-critical/10 text-critical border border-critical/20 font-mono text-xs">
                  -{result.metadata.deletions}
                </span>
                <span className="text-gray-400">
                  {result.metadata.changedFiles} files
                </span>
              </div>
            </div>
            {/* Filter Stats */}
            {result.filterStats && result.filterStats.removedFiles > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50 text-sm text-gray-400">
                📁 Analyzed{" "}
                <span className="text-foreground font-semibold">
                  {result.filterStats.keptFiles}
                </span>
                /{result.filterStats.totalFiles} files
                <span className="text-gray-500 ml-1">
                  ({result.filterStats.removedFiles} non-code files filtered)
                </span>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {
                label: "Critical",
                count: result.analysis.summary.critical,
                color: "critical",
                icon: "🔴",
              },
              {
                label: "High",
                count: result.analysis.summary.high,
                color: "high",
                icon: "🟠",
              },
              {
                label: "Medium",
                count: result.analysis.summary.medium,
                color: "medium",
                icon: "🟡",
              },
              {
                label: "Low",
                count: result.analysis.summary.low,
                color: "low",
                icon: "🔵",
              },
              {
                label: "Info",
                count: result.analysis.summary.info,
                color: "info",
                icon: "💡",
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <div
                  className="text-2xl font-bold"
                  style={{ color: `var(--color-${stat.color})` }}
                >
                  {stat.count}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {stat.icon} {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 mb-6 p-1 glass-card w-fit">
            {[
              { key: "visual", label: "Visual Report", icon: "📊" },
              { key: "markdown", label: "Markdown", icon: "📝" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-primary text-white"
                    : "text-gray-400 hover:text-foreground hover:bg-surface-light"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button
              onClick={copyMarkdown}
              className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-foreground hover:bg-surface-light transition-all flex items-center gap-1 cursor-pointer"
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>

          {/* Visual Report */}
          {activeTab === "visual" && (
            <div className="space-y-6">
              {/* Phase A: Breaking Bugs */}
              <PhaseSection
                title="Breaking Bugs"
                icon="🐛"
                subtitle="Critical issues that could cause runtime failures"
                color="critical"
                findings={result.analysis.breakingBugs}
                severityBadge={severityBadge}
                emptyMessage="No breaking bugs found! The code looks solid."
              />

              {/* Phase B: Code Smells */}
              <PhaseSection
                title="Code Smells"
                icon="🧹"
                subtitle="Quality issues that hurt maintainability"
                color="medium"
                findings={result.analysis.codeSmells}
                severityBadge={severityBadge}
                emptyMessage="No code smells detected! Clean code practices observed."
              />

              {/* Phase C: Vibe Refactor */}
              <PhaseSection
                title="Vibe Refactor"
                icon="✨"
                subtitle="Modern patterns and idiomatic improvements"
                color="info"
                findings={result.analysis.vibeRefactor}
                severityBadge={severityBadge}
                emptyMessage="Already vibing! No modernization suggestions needed."
              />
            </div>
          )}

          {/* Markdown Output */}
          {activeTab === "markdown" && (
            <div className="glass-card p-6 fade-in">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">
                {result.markdown}
              </pre>
            </div>
          )}

          {/* Comment Status */}
          {result.commentPosted && (
            <div className="glass-card border-success/30 p-4 mt-6 flex items-center gap-3">
              <svg
                className="w-5 h-5 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-success">
                Review posted as PR comment!
              </span>
              {result.commentResult?.htmlUrl && (
                <a
                  href={result.commentResult.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-light hover:underline ml-auto"
                >
                  View comment →
                </a>
              )}
            </div>
          )}
          {result.commentResult?.error && (
            <div className="glass-card border-critical/30 p-4 mt-6 flex items-center gap-3">
              <svg
                className="w-5 h-5 text-critical"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01"
                />
              </svg>
              <span className="text-sm text-critical">
                Failed to post comment: {result.commentResult.error}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-20 pb-8 text-center text-xs text-gray-600">
        Built with Octokit + Gemini AI • 3-Phase Code Analysis Engine
      </footer>
    </div>
  );
}

// ─── Phase Section Component ─────────────────────────────────────────────────

function PhaseSection({
  title,
  icon,
  subtitle,
  color,
  findings,
  severityBadge,
  emptyMessage,
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="glass-card glass-card-hover overflow-hidden fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-surface-light/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <h3 className="text-lg font-bold text-foreground">
              Phase: {title}
            </h3>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-bold`}
            style={{ color: `var(--color-${color})` }}
          >
            {findings.length} {findings.length === 1 ? "issue" : "issues"}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {findings.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <span className="text-3xl block mb-2">✅</span>
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f, i) => (
                <div
                  key={i}
                  className="bg-surface/50 rounded-lg p-4 border border-border/50 hover:border-border-light transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {severityBadge(f.severity)}
                      <span className="text-sm font-semibold text-foreground">
                        {f.title}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500 bg-surface-light px-2 py-0.5 rounded">
                      {f.file}
                      {f.line && f.line !== "N/A" ? `:${f.line}` : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{f.description}</p>
                  {f.suggestion && (
                    <div className="text-sm bg-primary/5 border border-primary/10 rounded-lg p-3 mt-2">
                      <span className="text-xs font-semibold text-primary-light block mb-1">
                        💡 Suggestion
                      </span>
                      <p className="text-gray-300 whitespace-pre-wrap font-mono text-xs">
                        {f.suggestion}
                      </p>
                    </div>
                  )}
                  {f.before && f.after && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-critical/5 border border-critical/10 rounded-lg p-3">
                        <span className="text-xs font-semibold text-critical block mb-1">
                          Before
                        </span>
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                          {f.before}
                        </pre>
                      </div>
                      <div className="bg-success/5 border border-success/10 rounded-lg p-3">
                        <span className="text-xs font-semibold text-success block mb-1">
                          After
                        </span>
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                          {f.after}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
