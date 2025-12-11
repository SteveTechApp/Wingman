// Aggressive Image Removal - catches ALL patterns
// Run: node fix-images-aggressive.cjs

const fs = require('fs');
const path = require('path');

console.log('🔍 AGGRESSIVE IMAGE REMOVAL');
console.log('===========================\n');

let filesModified = 0;
let linesRemoved = 0;

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== 'build' && file !== '.git') {
                getAllFiles(filePath, fileList);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
                fileList.push(filePath);
            }
        }
    });
    
    return fileList;
}

function aggressiveRemoveImages(content, filename) {
    const lines = content.split('\n');
    const newLines = [];
    let removed = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Remove ANY line containing imageUrl with a URL
        if (trimmed.includes('imageUrl') && 
            (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('unsplash'))) {
            console.log(`   🗑️  Removed: ${trimmed.substring(0, 60)}...`);
            removed++;
            continue;
        }
        
        // Remove lines with img tags
        if (trimmed.includes('<img') && trimmed.includes('src=')) {
            console.log(`   🗑️  Removed img tag`);
            removed++;
            continue;
        }
        
        newLines.push(line);
    }
    
    return {
        modified: newLines.join('\n'),
        removed: removed
    };
}

const files = getAllFiles(__dirname);

console.log(`Scanning ${files.length} files...\n`);

files.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(__dirname, filePath);
        
        // Check if file has any image references
        if (content.includes('imageUrl') || content.includes('<img')) {
            console.log(`\n📝 ${relativePath}`);
            
            const result = aggressiveRemoveImages(content, relativePath);
            
            if (result.removed > 0) {
                fs.writeFileSync(filePath, result.modified, 'utf8');
                filesModified++;
                linesRemoved += result.removed;
                console.log(`   ✅ Removed ${result.removed} lines`);
            } else {
                console.log(`   ℹ️  No removable lines found`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
});

console.log('\n\n📊 SUMMARY');
console.log('==========');
console.log(`Files modified: ${filesModified}`);
console.log(`Lines removed:  ${linesRemoved}`);

if (linesRemoved === 0) {
    console.log('\n⚠️  No image URLs were found!');
    console.log('This might mean:');
    console.log('1. Images are already removed');
    console.log('2. Images are defined differently than expected');
    console.log('3. Need to clear browser cache harder\n');
    console.log('Try this:');
    console.log('- Open DevTools (F12)');
    console.log('- Right-click refresh button');
    console.log('- Select "Empty Cache and Hard Reload"');
} else {
    console.log('\n✅ DONE!\n');
    console.log('Next steps:');
    console.log('1. KILL dev server completely (Ctrl+C)');
    console.log('2. Clear terminal');
    console.log('3. Run: npm run dev');
    console.log('4. Open browser in INCOGNITO mode');
    console.log('5. Visit localhost:3000/templates');
}

console.log('\n');
