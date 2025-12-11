// Directory checker - finds where your source files are
// Run: node check-dirs.cjs

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking directory structure...\n');
console.log('Current directory:', __dirname);
console.log('\nLooking for source files...\n');

const possibleDirs = ['src', 'client', 'app', 'source', 'frontend'];

possibleDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ Found: ${dir}/`);
        
        // List subdirectories
        const contents = fs.readdirSync(fullPath);
        const dirs = contents.filter(item => {
            const itemPath = path.join(fullPath, item);
            return fs.statSync(itemPath).isDirectory() && item !== 'node_modules';
        });
        
        if (dirs.length > 0) {
            console.log(`   Subdirectories: ${dirs.join(', ')}`);
        }
    }
});

console.log('\nAll files in current directory:');
const files = fs.readdirSync(__dirname);
files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const isDir = fs.statSync(filePath).isDirectory();
    console.log(`   ${isDir ? '📁' : '📄'} ${file}`);
});

console.log('\nSearching for TypeScript/React files...');

function findTsFiles(dir, depth = 0) {
    if (depth > 3) return []; // Don't go too deep
    
    const results = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            if (item === 'node_modules' || item === '.git') return;
            
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                results.push(...findTsFiles(fullPath, depth + 1));
            } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
                results.push(fullPath.replace(__dirname, '.'));
            }
        });
    } catch (err) {
        // Skip directories we can't read
    }
    
    return results;
}

const tsFiles = findTsFiles(__dirname);

if (tsFiles.length > 0) {
    console.log(`\n✅ Found ${tsFiles.length} TypeScript files:`);
    tsFiles.slice(0, 10).forEach(file => console.log(`   ${file}`));
    if (tsFiles.length > 10) {
        console.log(`   ... and ${tsFiles.length - 10} more`);
    }
} else {
    console.log('\n❌ No TypeScript files found!');
}
