import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, ChildProcess, execSync } from 'child_process'
import { existsSync } from 'fs'
import net from 'net'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
let quitting = false
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
    execSync('python -c "import fastapi, uvicorn, pydantic, pygame, PyInstaller"', { stdio: 'pipe', timeout: 15000 })
    return true // all good
  } catch {
    // deps missing — fall through to prompt
  }

  // Ask user: install or quit?
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: '缺少依赖 — 游戏创作器',
    message: '检测到缺少必要的 Python 包。\n\n需要安装: FastAPI, Pygame-CE, Uvicorn, PyInstaller 等\n约需 2-3 分钟，需网络连接。',
    detail: '点击"安装依赖"将自动运行 pip install。\n点击"退出"将关闭程序。',
    buttons: ['安装依赖', '退出'],
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 1) {
    // User chose to quit
    app.quit()
    return false
  }

  // Run pip install
  try {
    execSync(
      'python -m pip install fastapi uvicorn pydantic pygame-ce pillow pyinstaller --quiet',
      { stdio: 'pipe', timeout: 240000, windowsHide: true }
    )
    return true
  } catch (e) {
    dialog.showMessageBox({
      type: 'error',
      title: '安装失败',
      message: '自动安装未成功。请检查网络连接后手动运行:',
      detail: 'pip install pygame-ce fastapi uvicorn pydantic pillow pyinstaller\n\n或双击 setup.bat',
      buttons: ['退出']
    })
    app.quit()
    return false
  }
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' })
    sock.once('connect', () => { sock.destroy(); resolve(true) })
    sock.once('error', () => resolve(false))
  })
}

function killStaleOnPort(port: number): void {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
    const pids = new Set<string>()
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid)) pids.add(pid)
    }
    for (const pid of pids) {
      try { process.kill(Number(pid)); console.log(`[Python] Killed stale process ${pid} on port ${port}`) }
      catch { /* ignore */ }
    }
  } catch { /* nothing listening */ }
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

  // A backend is already running and reachable → reuse it (prevents duplicate / port conflict)
  if (await isPortOpen(PYTHON_PORT)) {
    console.log(`[Python] Backend already running on :${PYTHON_PORT} — reusing`)
    return
  }
  // Otherwise free the port from any stale/zombie process left by a previous run, then start fresh
  killStaleOnPort(PYTHON_PORT)
  await new Promise<void>((r) => setTimeout(r, 400))

  return new Promise<void>((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    pythonProcess = spawn(pythonCmd, [mainPy, '--port', String(PYTHON_PORT)], {
      cwd: backendPath, env: { ...process.env, PYTHONUNBUFFERED: '1' }, windowsHide: true
    })

    let started = false
    pythonProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.log(`[Python] ${msg}`)
      if (!started && msg.includes('Uvicorn running')) { started = true; resolve() }
    })
    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.error(`[Python:err] ${msg}`)
    })
    pythonProcess.on('error', (err) => { console.error('[Python] Failed:', err.message); pythonProcess = null; resolve() })
    pythonProcess.on('exit', (code) => {
      console.log(`[Python] Exited ${code}`)
      pythonProcess = null
      if (!started) resolve()
      // Watchdog: if it crashed / failed unexpectedly (and we're not quitting), restart it
      if (!quitting) {
        setTimeout(() => { if (!quitting) startPythonBackend().catch(() => {}) }, 2000)
      }
    })
    setTimeout(() => { if (!started) resolve() }, 8000)
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
  const depsOk = await ensurePythonDeps(getBackendPath())
  if (!depsOk) return // user chose to quit
  await startPythonBackend()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { quitting = true; stopPythonBackend(); if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => { quitting = true; stopPythonBackend() })
