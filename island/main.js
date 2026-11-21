const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, globalShortcut, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE = path.join(os.homedir(), '.claude', 'usage-island.json');
const STATE_FILE = path.join(os.homedir(), '.claude', 'island-state.json');
const W = 460;
const H = 620;
let win = null;
let tray = null;

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
// Launching again (start-island.bat) restarts the running copy, so new code always loads
app.on('second-instance', () => { app.relaunch(); app.exit(0); });
const VERSION = require('./package.json').version;
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const PREFS = () => path.join(app.getPath('userData'), 'prefs.json');
let prefs = { soundPermission: true, soundDone: false };
function loadPrefs() { try { prefs = { ...prefs, ...JSON.parse(fs.readFileSync(PREFS(), 'utf8')) }; } catch (_) {} }
function savePrefs() { try { fs.writeFileSync(PREFS(), JSON.stringify(prefs)); } catch (_) {} if (win) win.webContents.send('prefs', prefs); }

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
  win.webContents.on('did-finish-load', () => { sendUsage(); sendActivity(); win.webContents.send('prefs', prefs); });
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
  tray.setToolTip('Usage Island v' + VERSION);
  const loginOpts = { path: process.execPath, args: [app.getAppPath()] };
  const startup = app.getLoginItemSettings(loginOpts).openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Usage Island v' + VERSION, enabled: false },
    { type: 'separator' },
    { label: 'Show / hide   (Ctrl+Alt+U)', click: toggleVisible },
    { label: 'Restart', click: () => { app.relaunch(); app.exit(0); } },
    {
      label: 'Start with Windows', type: 'checkbox', checked: startup,
      click: (item) => app.setLoginItemSettings({ ...loginOpts, openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Sound when Claude needs permission', type: 'checkbox', checked: prefs.soundPermission, click: (i) => { prefs.soundPermission = i.checked; savePrefs(); } },
    { label: 'Sound when Claude finishes', type: 'checkbox', checked: prefs.soundDone, click: (i) => { prefs.soundDone = i.checked; savePrefs(); } },
    { label: 'Play test sound', click: () => win && win.webContents.send('test-sound') },
    { label: 'Open debug console', click: () => win && win.webContents.openDevTools({ mode: 'detach' }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', toggleVisible);
}

ipcMain.on('beep', () => shell.beep());

ipcMain.on('mouse-over', (_e, over) => {
  if (win) win.setIgnoreMouseEvents(!over, { forward: true });
});

app.whenReady().then(() => {
  loadPrefs();
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
