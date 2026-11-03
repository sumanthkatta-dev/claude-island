const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('island', {
  onUsage: (cb) => ipcRenderer.on('usage', (_e, data) => cb(data)),
  setMouseOver: (over) => ipcRenderer.send('mouse-over', over),
});
