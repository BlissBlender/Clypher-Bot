const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const hexPattern = /['"](#[0-9a-fA-F]{6})['"]/g;
const hexPattern2 = /0x([0-9a-fA-F]{6})/g;

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

const allFiles = getAllFiles(srcDir);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relative = path.relative(path.join(__dirname, '..'), file);
  const lines = content.split('\n');
  let found = false;
  
  // Skip config files
  if (file.includes('bot.js') || file.includes('application.js')) continue;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that use getColor or semantic helpers
    if (trimmed.includes('getColor') || trimmed.includes('successEmbed') || 
        trimmed.includes('infoEmbed') || trimmed.includes('warningEmbed') ||
        trimmed.includes('errorEmbed') || trimmed.includes('buildUserErrorEmbed') ||
        trimmed.includes('createEmbed(') || trimmed.includes('MUSIC_BUTTON_COLORS') ||
        trimmed.includes('priority')) continue;
    
    // Check for #XXXXXX hex strings
    const hexMatch = line.match(/['"](#[0-9a-fA-F]{6})['"]/);
    if (hexMatch && !line.includes('colors:')) {
      console.log(`${relative}:${i + 1}: ${trimmed}`);
      found = true;
    }
    
    // Check for 0xXXXXXX hex numbers
    const oxMatch = line.match(/\b0x([0-9a-fA-F]{6})\b/);
    if (oxMatch) {
      console.log(`${relative}:${i + 1}: ${trimmed}`);
      found = true;
    }
  }
}
