import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

/**
 * Send a prompt to Gemini and parse the JSON response.
 */
async function analyzeWithGemini(prompt) {
  const ai = getModel();

  const result = await ai.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    console.error(
      "Failed to parse Gemini response as JSON:",
      text.substring(0, 500),
    );
    return { findings: [] };
  }
}

/**
 * Phase A: Scan for Breaking Bugs
 * Critical issues that could cause runtime errors or security vulnerabilities.
 */
export async function scanBreakingBugs(diff) {
  const prompt = `You are an expert code reviewer. Analyze the following Git diff for **Breaking Bugs** — critical issues that would cause runtime failures or security vulnerabilities.

Look specifically for:
- Syntax errors
- Null/undefined pointer dereferences
- Unhandled exceptions or missing error handling
- Race conditions
- Type mismatches or incorrect type coercions
- Security vulnerabilities (SQL injection, XSS, path traversal, etc.)
- Resource leaks (unclosed connections, file handles)
- Off-by-one errors
- Infinite loops or recursion without base cases
- Breaking API contract changes

For each finding, provide:
- "file": the filename
- "line": approximate line number in the diff (or "N/A")
- "severity": "critical" or "high"
- "title": short title (max 10 words)
- "description": clear explanation of the bug
- "suggestion": how to fix it (with code snippet if helpful)

Return a JSON object: { "findings": [...] }
If no issues are found, return: { "findings": [] }

DIFF:
${diff}`;

  return analyzeWithGemini(prompt);
}

/**
 * Phase B: Scan for Code Smells
 * Code quality issues that aren't bugs but hurt maintainability.
 */
export async function scanCodeSmells(diff) {
  const prompt = `You are an expert code reviewer. Analyze the following Git diff for **Code Smells** — issues that hurt maintainability, readability, or violate best practices.

Look specifically for:
- DRY violations (repeated code patterns)
- Magic numbers or hardcoded strings
- Overly complex functions (high cyclomatic complexity)
- Poor error handling patterns
- Missing input validation
- Excessive coupling between modules
- God functions/classes (too many responsibilities)
- Dead code or unreachable branches
- Inconsistent naming conventions
- Missing or misleading comments
- Poor separation of concerns

For each finding, provide:
- "file": the filename
- "line": approximate line number in the diff (or "N/A")
- "severity": "medium" or "low"
- "title": short title (max 10 words)
- "description": clear explanation of the smell
- "suggestion": how to improve it

Return a JSON object: { "findings": [...] }
If no issues are found, return: { "findings": [] }

DIFF:
${diff}`;

  return analyzeWithGemini(prompt);
}

/**
 * Phase C: Generate Vibe Refactor suggestions
 * Modern patterns, better naming, idiomatic improvements.
 */
export async function generateVibeRefactor(diff) {
  const prompt = `You are a senior developer who loves modern, clean code. Analyze the following Git diff and suggest **Vibe Refactor** improvements — ways to make the code more modern, expressive, and idiomatic.

Focus on:
- Modern ES6+ patterns (destructuring, optional chaining, nullish coalescing, etc.)
- Better variable/function/class naming
- Idiomatic patterns for the language/framework being used
- Performance improvements (unnecessary loops, better data structures)
- Readability wins (simplifying conditionals, early returns)
- Modern async patterns (async/await instead of callbacks)
- Better use of built-in methods (Array.map, filter, reduce, etc.)
- Template literals instead of string concatenation
- Const/let instead of var
- Arrow functions where appropriate

For each suggestion, provide:
- "file": the filename
- "line": approximate line number in the diff (or "N/A")
- "severity": "info"
- "title": short title (max 10 words)
- "description": what could be improved
- "suggestion": the modernized code or approach
- "before": brief code snippet of current approach (optional)
- "after": brief code snippet of suggested approach (optional)

Return a JSON object: { "findings": [...] }
If no suggestions, return: { "findings": [] }

DIFF:
${diff}`;

  return analyzeWithGemini(prompt);
}

/**
 * Run all 3 analysis phases and return combined results.
 */
export async function runFullAnalysis(diff) {
  // Run all three phases in parallel for speed
  const [bugsResult, smellsResult, refactorResult] = await Promise.all([
    scanBreakingBugs(diff),
    scanCodeSmells(diff),
    generateVibeRefactor(diff),
  ]);

  return {
    breakingBugs: bugsResult.findings || [],
    codeSmells: smellsResult.findings || [],
    vibeRefactor: refactorResult.findings || [],
    summary: {
      totalIssues:
        (bugsResult.findings?.length || 0) +
        (smellsResult.findings?.length || 0) +
        (refactorResult.findings?.length || 0),
      critical: (bugsResult.findings || []).filter(
        (f) => f.severity === "critical",
      ).length,
      high: (bugsResult.findings || []).filter((f) => f.severity === "high")
        .length,
      medium: (smellsResult.findings || []).filter(
        (f) => f.severity === "medium",
      ).length,
      low: (smellsResult.findings || []).filter((f) => f.severity === "low")
        .length,
      info: (refactorResult.findings || []).length,
    },
  };
}
