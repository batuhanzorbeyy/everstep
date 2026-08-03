const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, nativeImage, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { fileURLToPath } = require('node:url');

const APP_NAME = 'Everstep';
const APP_USER_MODEL_ID = 'Zorbey.Everstep';
const MAX_EXPORT_BYTES = 25 * 1024 * 1024;
const MAX_PDF_HTML_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const DIST_ROOT = path.resolve(__dirname, '..', 'dist');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let currentLanguage = 'en';
let trustedDevOrigin = null;

const trayLabels = {
  tr: { open: 'Everstep’i Aç', quit: 'Çıkış' },
  en: { open: 'Open Everstep', quit: 'Quit' },
  es: { open: 'Abrir Everstep', quit: 'Salir' },
  ja: { open: 'Everstep を開く', quit: '終了' },
  de: { open: 'Everstep öffnen', quit: 'Beenden' },
  it: { open: 'Apri Everstep', quit: 'Esci' },
  az: { open: 'Everstep-i aç', quit: 'Çıxış' }
};

function migrateLegacyUserDataDirectory() {
  try {
    const appData = app.getPath('appData');
    const destination = path.join(appData, APP_NAME);
    const legacyCandidates = [path.join(appData, 'FocusFlow'), path.join(appData, 'focusflow')];
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
      const source = legacyCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'Local Storage')));
      if (source) {
        fs.cpSync(path.join(source, 'Local Storage'), path.join(destination, 'Local Storage'), { recursive: true, errorOnExist: false });
      }
    }
    app.setPath('userData', destination);
  } catch (error) {
    console.warn('Legacy user data migration skipped:', error instanceof Error ? error.message : String(error));
  }
}

migrateLegacyUserDataDirectory();
app.enableSandbox();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function getIconPath() {
  return path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
}

function isPathInside(basePath, candidatePath) {
  const relative = path.relative(basePath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function parseTrustedDevOrigin() {
  const raw = process.env.VITE_DEV_SERVER_URL;
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function isTrustedRendererUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (trustedDevOrigin && parsed.origin === trustedDevOrigin) return true;
    if (parsed.protocol !== 'file:') return false;
    const filePath = path.resolve(fileURLToPath(parsed));
    return isPathInside(DIST_ROOT, filePath);
  } catch {
    return false;
  }
}

function isTrustedIpcSender(event) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (event.sender.id !== mainWindow.webContents.id) return false;
  const senderUrl = event.senderFrame?.url || event.sender.getURL();
  return isTrustedRendererUrl(senderUrl);
}

function requireTrustedSender(event) {
  if (!isTrustedIpcSender(event)) throw new Error('Untrusted IPC sender');
}

function safeText(value, maxLength, fallback = '') {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function safeFilename(value, fallback) {
  const base = path.basename(safeText(value, 180, fallback)).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return base || fallback;
}

function safeFilters(value) {
  if (!Array.isArray(value)) return undefined;
  const filters = value.slice(0, 8).map((item) => {
    if (!item || typeof item !== 'object') return null;
    const name = safeText(item.name, 60, 'File');
    const extensions = Array.isArray(item.extensions)
      ? item.extensions.slice(0, 8).filter((ext) => typeof ext === 'string' && /^[a-z0-9]{1,12}$/i.test(ext))
      : [];
    return extensions.length ? { name, extensions } : null;
  }).filter(Boolean);
  return filters.length ? filters : undefined;
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function configureSessionSecurity(targetSession, options = {}) {
  const allowDevOrigin = options.allowDevOrigin || null;
  const allowData = options.allowData !== false;
  const allowFile = options.allowFile !== false;
  const allowBlob = options.allowBlob !== false;

  targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  targetSession.setPermissionCheckHandler(() => false);

  targetSession.webRequest.onBeforeRequest((details, callback) => {
    try {
      const parsed = new URL(details.url);
      const allowed =
        (allowFile && parsed.protocol === 'file:') ||
        (allowData && parsed.protocol === 'data:') ||
        (allowBlob && parsed.protocol === 'blob:') ||
        (allowDevOrigin && (() => {
          const dev = new URL(allowDevOrigin);
          return parsed.hostname === dev.hostname && parsed.port === dev.port && ['http:', 'ws:'].includes(parsed.protocol);
        })()) ||
        (!app.isPackaged && ['devtools:', 'chrome-extension:'].includes(parsed.protocol));
      callback({ cancel: !allowed });
    } catch {
      callback({ cancel: true });
    }
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function refreshTrayMenu() {
  if (!tray) return;
  const labels = trayLabels[currentLanguage] ?? trayLabels.en;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: labels.open, click: showMainWindow },
    { type: 'separator' },
    { label: labels.quit, click: () => { isQuitting = true; app.quit(); } }
  ]));
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  refreshTrayMenu();
  tray.on('double-click', showMainWindow);
}

function hardenWebContents(webContents) {
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  webContents.on('will-attach-webview', (event) => event.preventDefault());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0b1020',
    autoHideMenuBar: true,
    show: false,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,
      spellcheck: false,
      devTools: !app.isPackaged
    }
  });

  hardenWebContents(mainWindow.webContents);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl && trustedDevOrigin) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(DIST_ROOT, 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  trustedDevOrigin = parseTrustedDevOrigin();
  app.setAppUserModelId(APP_USER_MODEL_ID);
  configureSessionSecurity(session.defaultSession, { allowDevOrigin: trustedDevOrigin });
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showMainWindow();
  });
});

app.on('second-instance', showMainWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => { isQuitting = true; });

ipcMain.handle('get-app-version', (event) => {
  requireTrustedSender(event);
  return app.getVersion();
});

ipcMain.handle('notify', (event, payload) => {
  requireTrustedSender(event);
  const title = safeText(payload?.title, 100, APP_NAME);
  const body = safeText(payload?.body, 500, '');
  if (Notification.isSupported()) new Notification({ title, body, icon: getIconPath() }).show();
});

ipcMain.handle('export-file', async (event, payload) => {
  requireTrustedSender(event);
  const content = safeText(payload?.content, MAX_EXPORT_BYTES, '');
  if (byteLength(content) > MAX_EXPORT_BYTES) throw new Error('Export content is too large');
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: safeFilename(payload?.defaultPath, 'everstep-export.json'),
    filters: safeFilters(payload?.filters)
  });
  if (result.canceled || !result.filePath) return { ok: false };
  await fsp.writeFile(result.filePath, content, { encoding: 'utf8', flag: 'w' });
  return { ok: true, filePath: result.filePath };
});

ipcMain.handle('export-pdf', async (event, payload) => {
  requireTrustedSender(event);
  const html = safeText(payload?.html, MAX_PDF_HTML_BYTES, '');
  if (byteLength(html) > MAX_PDF_HTML_BYTES) throw new Error('Report content is too large');

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: safeFilename(payload?.defaultPath, 'everstep-report.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };

  const partition = `everstep-pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const reportSession = session.fromPartition(partition, { cache: false });
  configureSessionSecurity(reportSession, { allowFile: false, allowBlob: false, allowData: true });

  const reportWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      partition,
      javascript: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      devTools: false
    }
  });
  reportWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  reportWindow.webContents.on('will-navigate', (navigateEvent, url) => { if (!url.startsWith('data:')) navigateEvent.preventDefault(); });
  reportWindow.webContents.on('will-attach-webview', (attachEvent) => attachEvent.preventDefault());

  try {
    await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await reportWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    await fsp.writeFile(result.filePath, pdf, { flag: 'w' });
    return { ok: true, filePath: result.filePath };
  } finally {
    if (!reportWindow.isDestroyed()) reportWindow.destroy();
  }
});

ipcMain.handle('import-json', async (event) => {
  requireTrustedSender(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };

  const filePath = result.filePaths[0];
  if (path.extname(filePath).toLowerCase() !== '.json') throw new Error('Only JSON files are accepted');
  const stat = await fsp.stat(filePath);
  if (!stat.isFile() || stat.size > MAX_IMPORT_BYTES) throw new Error('Import file is invalid or too large');
  const content = await fsp.readFile(filePath, 'utf8');
  JSON.parse(content);
  return { ok: true, content, filePath };
});

ipcMain.on('set-always-on-top', (event, value) => {
  if (!isTrustedIpcSender(event)) return;
  mainWindow?.setAlwaysOnTop(value === true, 'floating');
});

ipcMain.on('set-progress', (event, value) => {
  if (!isTrustedIpcSender(event) || !mainWindow) return;
  const progress = Number(value);
  mainWindow.setProgressBar(Number.isFinite(progress) ? Math.max(-1, Math.min(1, progress)) : -1);
});

ipcMain.on('update-tray', (event, text) => {
  if (!isTrustedIpcSender(event) || !tray) return;
  tray.setToolTip(safeText(text, 120, APP_NAME));
});

ipcMain.on('set-language', (event, language) => {
  if (!isTrustedIpcSender(event)) return;
  currentLanguage = ['tr', 'en', 'es', 'ja', 'de', 'it', 'az'].includes(language) ? language : 'en';
  refreshTrayMenu();
});

ipcMain.on('minimize', (event) => {
  if (isTrustedIpcSender(event)) mainWindow?.minimize();
});

ipcMain.on('quit', (event) => {
  if (!isTrustedIpcSender(event)) return;
  isQuitting = true;
  app.quit();
});
