#!/usr/bin/env node
// Claude Island setup: run with `node setup.js` from this folder.
// 1. Copies the two small scripts into ~/.claude/claude-island/
// 2. Backs up ~/.claude/settings.json
// 3. Adds the island status line and activity hooks (your other settings and hooks are left alone)

const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAUDE = path.join(os.homedir(), '.claude');
const DEST = path.join(CLAUDE, 'claude-island');
const SETTINGS = path.join(CLAUDE, 'settings.json');
const fwd = (p) => p.replace(/\\/g, '/');

function fail(msg) { console.error('\n  Setup stopped: ' + msg + '\n  Nothing was changed.\n'); process.exit(1); }

// Read settings first, so we stop before touching anything if it is broken
let settings = {};
let hadSettings = false;
if (fs.existsSync(SETTINGS)) {
  hadSettings = true;
  try { settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); }
  catch (e) { fail(`${SETTINGS} is not valid JSON. Fix it first, then run setup again.`); }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) fail('settings.json has an unexpected format.');
}

// Copy scripts
fs.mkdirSync(DEST, { recursive: true });
const statusSrc = path.join(__dirname, 'statusline', 'island-statusline.js');
const hookSrc = path.join(__dirname, 'hooks', 'island-hook.js');
if (!fs.existsSync(statusSrc) || !fs.existsSync(hookSrc)) fail('Run this from the claude-island folder.');
const statusDest = path.join(DEST, 'island-statusline.js');
const hookDest = path.join(DEST, 'island-hook.js');
fs.copyFileSync(statusSrc, statusDest);
fs.copyFileSync(hookSrc, hookDest);

// Backup
let backup = null;
if (hadSettings) {
  backup = SETTINGS + '.island-backup-' + new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(SETTINGS, backup);
}

// Remember a status line that isn't ours, so uninstall can put it back
const isOurs = (cmd) => typeof cmd === 'string' && cmd.includes('island-statusline.js');
const prevFile = path.join(DEST, 'previous-statusline.json');
if (settings.statusLine && !isOurs(settings.statusLine.command)) {
  fs.writeFileSync(prevFile, JSON.stringify(settings.statusLine, null, 2));
}
settings.statusLine = { type: 'command', command: `node "${fwd(statusDest)}"` };

// Hooks: remove old island entries, then add fresh ones
const events = {
  PreToolUse: 'needs-you',
  UserPromptSubmit: 'working',
  PostToolUse: 'working',
  Notification: 'needs-you',
  Stop: 'done',
  SessionEnd: 'end',
};
settings.hooks = settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {};
for (const [event, state] of Object.entries(events)) {
  const list = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
  const cleaned = list
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !(h.command || '').includes('island-hook.js')) }))
    .filter((g) => g.hooks.length > 0);
  const entry = { hooks: [{ type: 'command', command: `node "${fwd(hookDest)}" ${state}`, timeout: 5 }] };
  if (event === 'PostToolUse') entry.matcher = '*';
  if (event === 'PreToolUse') entry.matcher = 'AskUserQuestion';
  cleaned.push(entry);
  settings.hooks[event] = cleaned;
}

// Write atomically
fs.mkdirSync(CLAUDE, { recursive: true });
const tmp = SETTINGS + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
fs.renameSync(tmp, SETTINGS);

console.log('\n  Claude Island is set up.');
console.log('  Scripts:  ' + DEST);
if (backup) console.log('  Backup:   ' + backup);
console.log('\n  Next:');
console.log('   1. cd island && npm install');
console.log('   2. Double-click start-island.bat');
console.log('   3. Restart Claude Code and send a message\n');
console.log('  To undo everything later: node uninstall.js\n');
