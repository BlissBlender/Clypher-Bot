const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const patterns = [/Titan Bot/gi, /TitanBot/gi, /titanbot/gi, /titan_bot/gi];

function getAllFiles(dir, maxDepth = 10) {
  if (maxDepth <= 0) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'logs' && entry.name !== 'backups') {
          results.push(...getAllFiles(fullPath, maxDepth - 1));
        }
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // skip
  }
  return results;
}

const files = getAllFiles(rootDir);
let foundAny = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const relative = path.relative(rootDir, file);
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        console.log(`${relative}:${i + 1}: ${line.trim()}`);
        foundAny = true;
        break;
      }
    }
  }
}

if (!foundAny) {
  console.log('No matches found.');
}
