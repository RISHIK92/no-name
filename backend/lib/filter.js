/**
 * Diff filtering — strips non-code files from the unified diff
 * to save tokens and focus the AI analysis on meaningful code changes.
 */

// File extensions to exclude (binary, images, fonts)
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".bmp",
  ".tiff",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".webm",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

// Exact filenames to exclude
const EXCLUDED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierignore",
  ".eslintignore",
  ".DS_Store",
  "Thumbs.db",
]);

// Filename patterns to exclude
const EXCLUDED_PATTERNS = [
  /\.min\.(js|css)$/, // Minified files
  /\.map$/, // Source maps
  /\.d\.ts$/, // TypeScript declaration files (optional, debatable)
  /\.snap$/, // Jest snapshots
  /\.lock$/, // Generic lock files
  /node_modules\//, // Shouldn't appear but just in case
  /dist\//, // Built artifacts
  /build\//, // Built artifacts
  /\.next\//, // Next.js build output
  /coverage\//, // Test coverage
];

/**
 * Check if a filename should be excluded from analysis.
 */
function shouldExclude(filename) {
  // Check exact filename match (basename)
  const basename = filename.split("/").pop();
  if (EXCLUDED_FILENAMES.has(basename)) return true;

  // Check extension
  const ext = "." + basename.split(".").pop()?.toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return true;

  // Check patterns
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filename)) return true;
  }

  return false;
}

/**
 * Parse a unified diff into per-file sections.
 * Returns an array of { filename, content } objects.
 */
function parseDiffIntoFiles(rawDiff) {
  const files = [];
  const diffLines = rawDiff.split("\n");

  let currentFile = null;
  let currentContent = [];

  for (const line of diffLines) {
    // Detect new file header: "diff --git a/path b/path"
    if (line.startsWith("diff --git ")) {
      // Save previous file
      if (currentFile) {
        files.push({
          filename: currentFile,
          content: currentContent.join("\n"),
        });
      }
      // Extract filename from "diff --git a/foo/bar.js b/foo/bar.js"
      const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
      currentFile = match ? match[2] : null;
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Don't forget the last file
  if (currentFile) {
    files.push({ filename: currentFile, content: currentContent.join("\n") });
  }

  return files;
}

/**
 * Filter a unified diff, removing non-code files.
 * Returns { filteredDiff, stats }.
 */
export function filterDiff(rawDiff) {
  if (!rawDiff || typeof rawDiff !== "string") {
    return {
      filteredDiff: "",
      stats: { totalFiles: 0, keptFiles: 0, removedFiles: 0, removedNames: [] },
    };
  }

  const files = parseDiffIntoFiles(rawDiff);
  const kept = [];
  const removedNames = [];

  for (const file of files) {
    if (shouldExclude(file.filename)) {
      removedNames.push(file.filename);
    } else {
      kept.push(file);
    }
  }

  const filteredDiff = kept.map((f) => f.content).join("\n");

  return {
    filteredDiff,
    stats: {
      totalFiles: files.length,
      keptFiles: kept.length,
      removedFiles: removedNames.length,
      removedNames,
    },
  };
}
