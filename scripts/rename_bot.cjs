const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Files to skip
const skipFiles = new Set([
  'node_modules',
  '.git',
  'package-lock.json',  // Will be regenerated
  'scripts/find_titan.cjs',  // Our temp script
  'scripts/find_hardcoded_colors.js',
  'scripts/find_colors.cjs',
  'scripts/rename_bot.cjs',  // This file
]);

// Replacement rules: [pattern, replacement]
// Order matters — more specific patterns first
const replacements = [
  // Class/identifier names (uppercase T)
  [/class TitanBotError/g, 'class ClypherBotError'],
  [/TitanBotError/g, 'ClypherBotError'],
  [/class TitanBot extends/g, 'class ClypherBot extends'],
  [/\bTitanBot\b(?!Error)/g, 'ClypherBot'],
  
  // Text brand names
  [/\bTitan Bot\b/g, 'Clypher Bot'],
  [/\btitanbot\b/g, 'clypher'],
  [/\bTITANBOT\b/g, 'CLYPHER'],
];

function getAllFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipFiles.has(entry.name)) {
          results.push(...getAllFiles(fullPath));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.md', '.json', '.yml', '.yaml', '.env', '.txt'].includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {
    // Permission errors on system directories
  }
  return results;
}

const files = getAllFiles(rootDir);
let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const relative = path.relative(rootDir, file);
  
  // Skip our script and temp files
  if (skipFiles.has(path.basename(file))) continue;
  if (file === __filename) continue;
  
  let content;
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch (e) {
    continue;
  }
  
  let modified = false;
  let newContent = content;
  
  for (const [pattern, replacement] of replacements) {
    const matchCount = (newContent.match(pattern) || []).length;
    if (matchCount > 0) {
      newContent = newContent.replace(pattern, replacement);
      totalReplacements += matchCount;
      modified = true;
    }
  }
  
  if (modified) {
    try {
      fs.writeFileSync(file, newContent, 'utf-8');
      changedFiles++;
      console.log(`✓ ${relative}`);
    } catch (e) {
      console.error(`✗ ${relative}: ${e.message}`);
    }
  }
}

console.log(`\nDone! ${changedFiles} files changed, ${totalReplacements} replacements made.`);
