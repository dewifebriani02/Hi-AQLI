
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'chapters.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

data.chapters.forEach(chapter => {
  const raw = chapter.translated_name;
  if (typeof raw === 'string') {
    // If it starts with @{ or has indonesian; name=
    const nameMatch = raw.match(/name=([^};}]+)/);
    if (nameMatch) {
      chapter.translated_name = nameMatch[1].replace(/\\'/g, "'").trim();
    }
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
console.log('Successfully cleaned chapters.json');
