import fs from 'fs';
import path from 'path';

const distUi = path.resolve('dist/ui');
if (!fs.existsSync(distUi)) {
  fs.mkdirSync(distUi, { recursive: true });
}
fs.copyFileSync('src/ui/index.html', 'dist/ui/index.html');
fs.copyFileSync('src/ui/styles.css', 'dist/ui/styles.css');

const distElectron = path.resolve('dist/electron');
if (!fs.existsSync(distElectron)) {
  fs.mkdirSync(distElectron, { recursive: true });
}
fs.copyFileSync('src/electron/preload.cjs', 'dist/electron/preload.cjs');

console.log('UI and Preload assets copied successfully.');
