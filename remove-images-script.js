// Script to remove all imageUrl properties from your template files
// Run this in your project directory

const fs = require('fs');
const path = require('path');

// Files to update - adjust these paths to match your project
const filesToUpdate = [
  'src/data/mockTemplates.ts',
  'src/data/templates.ts',
  'src/types/ConceptTemplate.ts'
];

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove imageUrl properties and their values
    content = content.replace(/imageUrl:\s*['"`][^'"`]*['"`],?\s*/g, '');
    content = content.replace(/,\s*imageUrl:\s*['"`][^'"`]*['"`]/g, '');
    
    // Clean up double commas
    content = content.replace(/,\s*,/g, ',');
    
    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Removed images from ${filePath}`);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n✅ Done! Now refresh your browser with Ctrl+Shift+R');
