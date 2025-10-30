// Script per copiare la cartella dist/ in deploy/
import fs from 'fs';
import path from 'path';

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.error(`La cartella sorgente ${src} non esiste.`);
    process.exit(1);
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const srcDir = path.resolve('dist');
const destDir = path.resolve('deploy', 'dist');

console.log(`Copia da ${srcDir} a ${destDir}...`);
copyDir(srcDir, destDir);
console.log('Copia completata!');
