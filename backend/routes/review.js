import { Router } from "express";
import {
  parsePrUrl,
  fetchPrMetadata,
  fetchPrDiff,
  postPrComment,
} from "../lib/github.js";
import { filterDiff } from "../lib/filter.js";
import { runFullAnalysis } from "../lib/analyzer.js";
import { generateMarkdownReport } from "../lib/reporter.js";

export const reviewRouter = Router();

/**
 * POST /api/review
 * Body: { prUrl: string, postComment?: boolean }
 *
 * Orchestrates the full review pipeline:
 *   1. Parse PR URL
 *   2. Fetch metadata + diff
 *   3. Filter non-code files
 *   4. Run 3-phase AI analysis
 *   5. Generate Markdown report
 *   6. Optionally post as PR comment
 */
reviewRouter.post("/review", async (req, res) => {
  try {
    const { prUrl, postComment = false } = req.body;

    if (!prUrl) {
      return res.status(400).json({ error: "prUrl is required" });
    }

    // Step 1: Parse the PR URL
    const { owner, repo, pull_number } = parsePrUrl(prUrl);

    // Step 2: Fetch metadata and diff in parallel
    const [metadata, rawDiff] = await Promise.all([
      fetchPrMetadata(owner, repo, pull_number),
      fetchPrDiff(owner, repo, pull_number),
    ]);

    // Step 3: Filter the diff
    const { filteredDiff, stats: filterStats } = filterDiff(rawDiff);

    if (!filteredDiff || filteredDiff.trim().length === 0) {
      return res.json({
        metadata,
        filterStats,
        analysis: {
          breakingBugs: [],
          codeSmells: [],
          vibeRefactor: [],
          summary: {
            totalIssues: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
          },
        },
        markdown:
          "# No code changes to analyze\n\nAll changed files were non-code files (images, lock files, configs) and were filtered out.",
        commentPosted: false,
      });
    }

    // Step 4: Run AI analysis
    const analysis = await runFullAnalysis(filteredDiff);

    // Step 5: Generate report
    const markdown = generateMarkdownReport(metadata, analysis, filterStats);

    // Step 6: Optionally post as PR comment
    let commentResult = null;
    if (postComment) {
      try {
        commentResult = await postPrComment(owner, repo, pull_number, markdown);
      } catch (err) {
        commentResult = { error: err.message };
      }
    }

    return res.json({
      metadata,
      filterStats,
      analysis,
      markdown,
      commentPosted: !!commentResult && !commentResult.error,
      commentResult,
    });
  } catch (err) {
    console.error("Review error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});
