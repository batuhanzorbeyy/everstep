const { contextBridge, ipcRenderer } = require('electron');

const api = Object.freeze({
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
  exportFile: (defaultPath, content, filters) => ipcRenderer.invoke('export-file', { defaultPath, content, filters }),
  importJson: () => ipcRenderer.invoke('import-json'),
  exportPdf: (defaultPath, html) => ipcRenderer.invoke('export-pdf', { defaultPath, html }),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', value === true),
  setProgress: (value) => ipcRenderer.send('set-progress', Number(value)),
  updateTray: (text) => ipcRenderer.send('update-tray', String(text ?? '')),
  setLanguage: (language) => ipcRenderer.send('set-language', String(language ?? 'en')),
  minimize: () => ipcRenderer.send('minimize'),
  quit: () => ipcRenderer.send('quit')
});

contextBridge.exposeInMainWorld('everstepDesktop', api);
