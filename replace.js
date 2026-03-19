const fs = require('fs');
const path = require('path');

const tables = [
    'users',
    'roles_admin',
    'roles_superadmin',
    'donations',
    'halaqahs',
    'halaqah_registrations',
    'quiz_attempts',
    'page_exams',
    'tikrar_registrations'
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const table of tables) {
                const doubleQuote = `"aqli_${table}"`;
                const singleQuote = `'aqli_${table}'`;
                if (content.includes(doubleQuote) || content.includes(singleQuote)) {
                    content = content.split(doubleQuote).join(`"${table}"`);
                    content = content.split(singleQuote).join(`'${table}'`);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

processDirectory('d:\\Hi-AQLI\\src');
console.log('Done replacement');
