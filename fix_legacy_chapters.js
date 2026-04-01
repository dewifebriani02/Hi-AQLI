
const fs = require('fs');
const path = require('path');

const files = ['chapters_fixed.json', 'chapters_utf8.json'];

files.forEach(file => {
  const filePath = path.join(__dirname, 'src', 'data', file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.chapters.forEach(chapter => {
      const raw = chapter.translated_name;
      if (typeof raw === 'string') {
        const nameMatch = raw.match(/name=([^};}]+)/);
        if (nameMatch) {
          chapter.translated_name = nameMatch[1].replace(/\\'/g, "'").trim();
        }
      }
    });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Successfully cleaned ${file}`);
  }
});
