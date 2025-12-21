const fs = require('fs');
const glob = require('glob');

// Trouver tous les fichiers TS/TSX qui utilisent logger
const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**', 'dist/**', 'scripts/**']
});

let fixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Vérifier si le fichier utilise logger mais n'a pas l'import
  const usesLogger = /\blogger\.(info|error|warn|debug)\(/g.test(content);
  const hasImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');
  
  if (usesLogger && !hasImport) {
    // Trouver la position après les derniers imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && lines[i].includes(' from ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      // Insérer après le dernier import
      lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger';");
    } else {
      // Pas d'imports, ajouter au début
      lines.unshift("import { logger } from '@/lib/logger';", '');
    }
    
    content = lines.join('\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  }
});

console.log(`\n🎉 Done! Fixed ${fixed} files.`);
