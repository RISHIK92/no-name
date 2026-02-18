import { Octokit } from "@octokit/rest";

/**
 * Parse a GitHub PR URL into its components.
 * Supports formats:
 *   - https://github.com/owner/repo/pull/123
 *   - github.com/owner/repo/pull/123
 *   - owner/repo#123
 */
export function parsePrUrl(url) {
  // Full URL format
  const fullMatch = url.match(
    /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
  );
  if (fullMatch) {
    return {
      owner: fullMatch[1],
      repo: fullMatch[2],
      pull_number: parseInt(fullMatch[3], 10),
    };
  }

  // Shorthand: owner/repo#123
  const shortMatch = url.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      pull_number: parseInt(shortMatch[3], 10),
    };
  }

  throw new Error(
    `Invalid PR URL format: "${url}". Expected: github.com/owner/repo/pull/123`,
  );
}

/**
 * Create an authenticated Octokit instance.
 */
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  return new Octokit(token ? { auth: token } : {});
}

/**
 * Fetch PR metadata (title, author, description, branch info, stats).
 */
export async function fetchPrMetadata(owner, repo, pull_number) {
  const octokit = getOctokit();

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });

  return {
    title: pr.title,
    number: pr.number,
    state: pr.state,
    author: pr.user?.login || "unknown",
    authorAvatar: pr.user?.avatar_url || "",
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    baseBranch: pr.base?.ref || "",
    headBranch: pr.head?.ref || "",
    description: pr.body || "",
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    htmlUrl: pr.html_url,
    mergeable: pr.mergeable,
    labels: (pr.labels || []).map((l) => l.name),
  };
}

/**
 * Fetch the raw unified diff for the PR.
 */
export async function fetchPrDiff(owner, repo, pull_number) {
  const octokit = getOctokit();

  const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: {
      format: "diff",
    },
  });

  return diff;
}

/**
 * Fetch the list of files changed in the PR.
 */
export async function fetchPrFiles(owner, repo, pull_number) {
  const octokit = getOctokit();

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 100,
  });

  return files.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch || "",
  }));
}

/**
 * Post a comment on the PR.
 */
export async function postPrComment(owner, repo, pull_number, body) {
  const octokit = getOctokit();

  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required to post PR comments");
  }

  const { data: comment } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body,
  });

  return {
    id: comment.id,
    htmlUrl: comment.html_url,
  };
}
