import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, ChildProcess, execSync } from 'child_process'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
const PYTHON_PORT = 18721

function getBackendPath(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'backend')
  return path.join(app.getAppPath(), 'backend')
}

async function ensurePythonDeps(backendPath: string): Promise<boolean> {
  const mainPy = path.join(backendPath, 'main.py')
  if (!existsSync(mainPy)) return false

  // Check if core packages are installed
  try {
    execSync('python -c "import fastapi, uvicorn, pydantic, pygame"', { stdio: 'pipe', timeout: 15000 })
    return true
  } catch {
    console.log('[Setup] Missing Python packages. Auto-installing...')
  }

  // Ask user before installing
  if (mainWindow) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '安装依赖',
      message: '检测到缺少必要的 Python 包（FastAPI, Pygame 等）。是否自动安装？',
      detail: '将运行: pip install -r requirements.txt\n\n约需 1-2 分钟，需要网络连接。',
      buttons: ['自动安装', '跳过（部分功能不可用）'],
      defaultId: 0
    })
    if (response === 1) return false
  }

  // Run pip install
  const reqFile = path.join(backendPath, 'requirements.txt')
  try {
    // Try pip install
    execSync(`python -m pip install fastapi uvicorn pydantic pygame-ce pillow openai python-multipart aiofiles pyinstaller --quiet`, {
      stdio: 'pipe', timeout: 120000, windowsHide: true
    })
    console.log('[Setup] Packages installed successfully')
    return true
  } catch (e) {
    console.error('[Setup] Failed to install packages:', e)
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: '安装提示',
        message: '自动安装未完全成功。请手动运行:',
        detail: 'pip install pygame-ce fastapi uvicorn pydantic pillow\n\n或运行 setup.bat',
        buttons: ['确定']
      })
    }
    return false
  }
}

async function startPythonBackend(): Promise<void> {
  const backendPath = getBackendPath()
  const mainPy = path.join(backendPath, 'main.py')

  if (!existsSync(mainPy)) {
    console.warn('[Python] main.py not found:', mainPy)
    return
  }

  // Auto-install deps on first launch
  await ensurePythonDeps(backendPath)

  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    pythonProcess = spawn(pythonCmd, [mainPy, '--port', String(PYTHON_PORT)], {
      cwd: backendPath, env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    let started = false
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      console.log(`[Python] ${msg}`)
      if (!started && msg.includes('Uvicorn running')) { started = true; resolve() }
    })
    pythonProcess.stderr?.on('data', (data: Buffer) => { console.error(`[Python:err] ${data.toString().trim()}`) })
    pythonProcess.on('error', (err) => { console.error('[Python] Failed:', err.message); resolve() })
    pythonProcess.on('exit', (code) => { console.log(`[Python] Exited ${code}`); pythonProcess = null })
    setTimeout(() => { if (!started) resolve() }, 5000)
  })
}

function stopPythonBackend(): void {
  if (pythonProcess) { pythonProcess.kill(); pythonProcess = null }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 800, minHeight: 600, resizable: true,
    title: '游戏创作器', backgroundColor: '#1e1e2e',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  })
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  mainWindow.on('closed', () => { mainWindow = null })
}

ipcMain.handle('get-python-port', () => PYTHON_PORT)

ipcMain.handle('dialog:openProject', async () => {
  if (!mainWindow) return null
  const r = await dialog.showOpenDialog(mainWindow, { title: '打开项目', filters: [{ name: 'Game Creator Project', extensions: ['gcproj','json'] }], properties: ['openFile'] })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('dialog:saveProject', async () => {
  if (!mainWindow) return null
  const r = await dialog.showSaveDialog(mainWindow, { title: '保存项目', filters: [{ name: 'Game Creator Project', extensions: ['gcproj'] }] })
  return r.canceled ? null : r.filePath
})

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null
  const r = await dialog.showOpenDialog(mainWindow, { title: '选择目录', properties: ['openDirectory', 'createDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('dialog:importAssets', async () => {
  if (!mainWindow) return null
  const r = await dialog.showOpenDialog(mainWindow, { title: '导入素材', filters: [{ name: '图片', extensions: ['png','jpg','jpeg','gif','webp','bmp'] }, { name: '音频', extensions: ['wav','mp3','ogg'] }, { name: '全部', extensions: ['*'] }], properties: ['openFile', 'multiSelections'] })
  return r.canceled ? null : r.filePaths
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  await startPythonBackend()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { stopPythonBackend(); if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { stopPythonBackend() })
