import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPythonPort: () => ipcRenderer.invoke('get-python-port'),

  // Dialog operations
  openProjectDialog: () => ipcRenderer.invoke('dialog:openProject'),
  saveProjectDialog: () => ipcRenderer.invoke('dialog:saveProject'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  importAssetsDialog: () => ipcRenderer.invoke('dialog:importAssets'),

  // Generic IPC invoke
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  // App info
  platform: process.platform,
  isPackaged: process.env.NODE_ENV !== 'development'
})
