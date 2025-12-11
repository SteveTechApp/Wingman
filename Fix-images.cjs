// Simple Image Removal Script - No complex regex
// Save as: fix-images.js
// Run: node fix-images.js

const fs = require('fs');
const path = require('path');

console.log('🔍 IMAGE REMOVAL SCRIPT');
console.log('======================\n');

const srcDir = __dirname; // Scan from root directory

console.log(`Scanning: ${srcDir}\n`);

let filesModified = 0;
let totalRemoved = 0;

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== 'build') {
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

function removeImages(content) {
    let modified = content;
    let count = 0;
    
    // Simple line-by-line removal
    const lines = modified.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip lines with imageUrl
        if (line.includes('imageUrl:') && (line.includes('http') || line.includes('https'))) {
            count++;
            continue; // Skip this line
        }
        
        // Replace img tags with div
        if (line.includes('<img') && line.includes('src=')) {
            newLines.push('                <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-lg p-8 flex items-center justify-center">');
            newLines.push('                  <div className="w-16 h-16 text-white/30">●</div>');
            newLines.push('                </div>');
            count++;
            continue;
        }
        
        newLines.push(line);
    }
    
    return {
        modified: newLines.join('\n'),
        count: count
    };
}

const files = getAllFiles(srcDir);

console.log(`Found ${files.length} files to scan\n`);

files.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('imageUrl') || content.includes('<img')) {
            console.log(`📝 Processing: ${path.relative(__dirname, filePath)}`);
            
            const result = removeImages(content);
            
            if (result.count > 0) {
                fs.writeFileSync(filePath, result.modified, 'utf8');
                filesModified++;
                totalRemoved += result.count;
                console.log(`   ✓ Removed/replaced ${result.count} image references`);
                console.log(`   ✅ File updated\n`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
});

console.log('\n📊 SUMMARY');
console.log('==========');
console.log(`Files modified: ${filesModified}`);
console.log(`Images removed: ${totalRemoved}`);
console.log('\n✅ DONE!\n');
console.log('Next steps:');
console.log('1. Stop dev server (Ctrl+C)');
console.log('2. Run: npm run dev');
console.log('3. Hard refresh: Ctrl+Shift+R\n');
