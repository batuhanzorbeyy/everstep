const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifestPath = path.join(root, 'Package.appxmanifest');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const parts = String(packageJson.version || '1.0.0').split('.').map((part) => {
  const numeric = Number.parseInt(part, 10);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
});
while (parts.length < 4) parts.push(0);
const msixVersion = parts.slice(0, 4).join('.');
const versionPattern = /(<Identity[\s\S]*?\bVersion=")[^"]+("[\s\S]*?\/?>)/;
if (!versionPattern.test(manifest)) {
  console.error('Package.appxmanifest içindeki Identity Version alanı bulunamadı.');
  process.exit(1);
}
const updated = manifest.replace(versionPattern, (_match, prefix, suffix) => `${prefix}${msixVersion}${suffix}`);
fs.writeFileSync(manifestPath, updated, 'utf8');
console.log(`MSIX manifest sürümü ${msixVersion} olarak güncellendi.`);
