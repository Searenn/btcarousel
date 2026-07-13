const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveImagesDialog: (images) => ipcRenderer.invoke('save-images-dialog', { images }),
  saveVideo: (webmBase64) => ipcRenderer.invoke('save-video', { webmBase64 }),
  saveUserTemplates: (templates) => ipcRenderer.invoke('save-user-templates', { templates }),
  loadUserTemplates: () => ipcRenderer.invoke('load-user-templates'),
  saveCarouselConfig: (config) => ipcRenderer.invoke('save-carousel-config', { config }),
  loadCarouselConfig: () => ipcRenderer.invoke('load-carousel-config'),
  isElectron: true,
});

