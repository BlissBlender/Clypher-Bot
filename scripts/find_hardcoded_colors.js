import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

// Patterns to match hardcoded colors
const patterns = [
  /\.setColor\(0x([0-9a-fA-F]{6})\)/g,
  /\.setColor\(\s*['"](#[0-9a-fA-F]{6})['"]\s*\)/g,
  /color:\s*['"](#[0-9a-fA-F]{6})['"]/g,
  /color:\s*(0x[0-9a-fA-F]{6})/g,
  /'#[0-9a-fA-F]{6}'/g,
  /"#[0-9a-fA-F]{6}"/g,
];

function getAllFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'modules') {
      results.push(...getAllFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllFiles(srcDir);
const ignorePatterns = [/colors\s*:/, /color\s*:/, /getColor/, /successEmbed\b/, /infoEmbed\b/, /warningEmbed\b/, /errorEmbed\b/, /buildUserErrorEmbed\b/, /createEmbed/, /MUSIC_BUTTON_COLORS/, /priority/];

let foundAny = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..'), file);
  
  // Check if this file should be ignored (config files that define colors)
  const isConfig = file.includes('bot.js') || file.includes('application.js');
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // Skip config files since they define the colors
      if (isConfig) continue;
      
      // Get line number
      const lines = content.split('\n');
      let lineNum = 0;
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1;
        if (charCount > match.index) {
          lineNum = i + 1;
          break;
        }
      }
      
      const line = lines[lineNum - 1]?.trim() || '';
      foundAny = true;
      console.log(`${relativePath}:${lineNum}: ${line}`);
    }
  }
}

if (!foundAny) {
  console.log('No hardcoded colors found.');
}
