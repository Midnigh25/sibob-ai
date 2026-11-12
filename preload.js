const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sibob', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  transcribe: audio => ipcRenderer.invoke('dictation:transcribe', audio),
  onToggle: callback => ipcRenderer.on('dictation:toggle', () => callback())
});
