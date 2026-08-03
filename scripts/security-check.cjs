const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('electron/main.cjs');
const preload = read('electron/preload.cjs');
const html = read('index.html');
const manifest = read('Package.appxmanifest');
const renderer = [read('src/App.tsx'), read('src/storage.ts'), read('src/main.tsx')].join('\n');

const checks = [
  ['context isolation enabled', /contextIsolation:\s*true/.test(main)],
  ['Node integration disabled', /nodeIntegration:\s*false/.test(main)],
  ['renderer sandbox enabled', /sandbox:\s*true/.test(main) && /app\.enableSandbox\(\)/.test(main)],
  ['web security enabled', /webSecurity:\s*true/.test(main)],
  ['webviews disabled', /webviewTag:\s*false/.test(main) && /will-attach-webview/.test(main)],
  ['permission requests denied', /setPermissionRequestHandler/.test(main) && /callback\(false\)/.test(main)],
  ['unexpected navigation blocked', /will-navigate/.test(main) && /preventDefault/.test(main)],
  ['new windows blocked', /setWindowOpenHandler/.test(main) && /action:\s*'deny'/.test(main)],
  ['production network requests filtered', /webRequest\.onBeforeRequest/.test(main)],
  ['trusted IPC sender validation present', /isTrustedIpcSender/.test(main) && /requireTrustedSender/.test(main)],
  ['isolated PDF renderer has JavaScript disabled', /javascript:\s*false/.test(main)],
  ['preload exposes scoped API', /contextBridge\.exposeInMainWorld\('everstepDesktop'/.test(preload)],
  ['CSP blocks remote connections', /connect-src 'none'/.test(html)],
  ['CSP blocks objects and frames', /object-src 'none'/.test(html) && /frame-src 'none'/.test(html)],
  ['CSP blocks forms and base URL changes', /form-action 'none'/.test(html) && /base-uri 'none'/.test(html)],
  ['Partner Center identity applied', /Name="Zorbey\.Everstep"/.test(manifest) && /CN=7E9C97B3-EC5B-4A25-A7BF-3C59BAA59DF3/.test(manifest)],
  ['no dangerous renderer HTML injection', !/dangerouslySetInnerHTML|\beval\s*\(|new\s+Function\s*\(/.test(renderer)]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'FAIL'} - ${name}`);
if (failed.length) {
  console.error(`\n${failed.length} security check(s) failed.`);
  process.exit(1);
}
console.log('\nEverstep security checks passed.');
