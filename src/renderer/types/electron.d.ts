export {}

declare global {
  interface ElectronAPI {
    getPythonPort: () => Promise<number>
    openProjectDialog: () => Promise<string | null>
    saveProjectDialog: () => Promise<string | null>
    selectDirectory: () => Promise<string | null>
    importAssetsDialog: () => Promise<string[] | null>
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    platform: string
    isPackaged: boolean
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}
