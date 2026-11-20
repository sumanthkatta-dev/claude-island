#!/usr/bin/env node
// Claude Island activity hook
// Called by Claude Code hooks: node island-hook.js <working|needs-you|done|end>
// Saves Claude's current state to ~/.claude/island-state.json for the island's light.
// Safety: never prints anything, never blocks Claude, always exits 0.

const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = path.join(os.homedir(), '.claude', 'island-state.json');
const VALID = new Set(['working', 'needs-you', 'done', 'end']);
const state = process.argv[2];

function finish() { process.exit(0); }
setTimeout(finish, 2000); // hard stop, just in case

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { if (raw.length < 100000) raw += c; });
process.stdin.on('error', finish);
process.stdin.on('end', () => {
  try {
    if (!VALID.has(state)) return finish();
    let input = {};
    try { input = JSON.parse(raw || '{}'); } catch (_) {}

    let all = {};
    try { all = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (_) {}
    const sessions = all && typeof all.sessions === 'object' && all.sessions ? all.sessions : {};
    const id = String(input.session_id || 'default').slice(0, 100);
    const now = Date.now();

    if (state === 'end') {
      delete sessions[id];
    } else {
      sessions[id] = {
        state,
        t: now,
        project: input.cwd ? path.basename(String(input.cwd)).slice(0, 80) : null,
        message: state === 'needs-you' && input.message ? String(input.message).slice(0, 120) : null,
        kind: state === 'needs-you' && input.notification_type ? String(input.notification_type).slice(0, 40) : null,
      };
    }

    // Forget sessions untouched for 12 hours
    for (const k of Object.keys(sessions)) if (now - (sessions[k].t || 0) > 12 * 3600e3) delete sessions[k];

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const tmp = OUT + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ updatedAt: now, sessions }));
    fs.renameSync(tmp, OUT);
  } catch (_) {}
  finish();
});
