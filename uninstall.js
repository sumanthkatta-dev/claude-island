#!/usr/bin/env node
// Usage Island uninstall: run with `node uninstall.js`
// Removes only what setup.js added and puts your old status line back.
// Quit the island from its tray icon first.

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAUDE = path.join(os.homedir(), '.claude');
const DEST = path.join(CLAUDE, 'usage-island');
const OLD_DEST = path.join(CLAUDE, 'claude-island'); // folder name used before v1.5
const SETTINGS = path.join(CLAUDE, 'settings.json');

if (fs.existsSync(SETTINGS)) {
  let settings;
  try { settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); }
  catch (e) { console.error('\n  settings.json is not valid JSON, so it was left alone.\n'); process.exit(1); }

  const backup = SETTINGS + '.island-uninstall-backup-' + new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(SETTINGS, backup);

  if (settings.statusLine && String(settings.statusLine.command || '').includes('island-statusline.js')) {
    let prevFile = path.join(DEST, 'previous-statusline.json');
    if (!fs.existsSync(prevFile)) prevFile = path.join(OLD_DEST, 'previous-statusline.json');
    if (fs.existsSync(prevFile)) {
      try { settings.statusLine = JSON.parse(fs.readFileSync(prevFile, 'utf8')); } catch (_) { delete settings.statusLine; }
    } else delete settings.statusLine;
  }

  if (settings.hooks && typeof settings.hooks === 'object') {
    for (const event of Object.keys(settings.hooks)) {
      if (!Array.isArray(settings.hooks[event])) continue;
      settings.hooks[event] = settings.hooks[event]
        .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !(h.command || '').includes('island-hook.js')) }))
        .filter((g) => g.hooks.length > 0);
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  const tmp = SETTINGS + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
  fs.renameSync(tmp, SETTINGS);
  console.log('\n  Settings restored. Backup of the previous file: ' + backup);
}

for (const f of ['usage-island.json', 'island-state.json']) {
  try { fs.unlinkSync(path.join(CLAUDE, f)); } catch (_) {}
}
for (const d of [DEST, OLD_DEST]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {} }

// Shortcuts made by make-shortcuts.bat
const shortcutDirs = [
  path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'OneDrive', 'Desktop'),
];
for (const d of shortcutDirs) { try { fs.unlinkSync(path.join(d, 'Usage Island.lnk')); } catch (_) {} }

console.log('  Usage Island files removed. You can now delete this folder.\n');
