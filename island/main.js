const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE = path.join(os.homedir(), '.claude', 'usage-island.json');
const STATE_FILE = path.join(os.homedir(), '.claude', 'island-state.json');
const W = 460;
const H = 500;
let win = null;
let tray = null;

if (!app.requestSingleInstanceLock()) app.quit();

function place() {
  const { bounds } = screen.getPrimaryDisplay();
  win.setBounds({ x: Math.round(bounds.x + (bounds.width - W) / 2), y: bounds.y + 4, width: W, height: H });
}

function createWindow() {
  win = new BrowserWindow({
    width: W,
    height: H,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  });
  place();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('did-finish-load', () => { sendUsage(); sendActivity(); });
}

function sendUsage() {
  if (!win) return;
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    win.webContents.send('usage', data);
  } catch (_) {
    win.webContents.send('usage', null);
  }
}

function sendActivity() {
  if (!win) return;
  try {
    win.webContents.send('activity', JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
  } catch (_) {
    win.webContents.send('activity', null);
  }
}

function toggleVisible() {
  if (!win) return;
  if (win.isVisible()) win.hide(); else { win.showInactive(); place(); }
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')));
  tray.setToolTip('Claude Island');
  const startup = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / hide   (Ctrl+Alt+U)', click: toggleVisible },
    {
      label: 'Start with Windows', type: 'checkbox', checked: startup,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', toggleVisible);
}

ipcMain.on('mouse-over', (_e, over) => {
  if (win) win.setIgnoreMouseEvents(!over, { forward: true });
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Alt+U', toggleVisible);
  fs.watchFile(FILE, { interval: 1500 }, sendUsage);
  fs.watchFile(STATE_FILE, { interval: 700 }, sendActivity);
  setInterval(() => { sendUsage(); sendActivity(); }, 30000);
  screen.on('display-metrics-changed', place);
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
