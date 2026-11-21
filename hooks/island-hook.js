#!/usr/bin/env node
// Usage Island activity hook
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

    const prev = sessions[id] || {};
    let last = null;
    if (input.tool_name && state === 'needs-you') {
      last = '❓ Asked you a question';
    } else if (input.tool_name) {
      const t = String(input.tool_name), ti = input.tool_input || {};
      const file = ti.file_path || ti.notebook_path ? path.basename(String(ti.file_path || ti.notebook_path)) : null;
      if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(t)) last = '✏️ Edited ' + (file || 'a file');
      else if (t === 'Read') last = '📖 Read ' + (file || 'a file');
      else if (t === 'Bash' || t === 'PowerShell') last = ti.description ? '▶️ ' + String(ti.description) : '▶️ Ran ' + (t === 'PowerShell' ? 'a PowerShell command' : String(ti.command || 'a command'));
      else if (/^(Grep|Glob)$/.test(t)) last = '🔍 Searched the code';
      else if (/^Web/.test(t)) last = '🌐 Looked something up';
      else if (/^(Task|Agent)$/.test(t)) last = '🤖 Ran a subagent';
      else last = '⚙️ ' + t.replace(/^mcp__/, '').slice(0, 30);
      last = last.slice(0, 60);
    }

    if (state === 'end') {
      delete sessions[id];
    } else {
      sessions[id] = {
        state,
        t: now,
        project: input.cwd ? (path.resolve(String(input.cwd)).toLowerCase() === path.resolve(os.homedir()).toLowerCase() ? 'Home folder' : path.basename(String(input.cwd)).slice(0, 80)) : prev.project || null,
        message: state === 'needs-you' && input.message ? String(input.message).slice(0, 120) : null,
        kind: state === 'needs-you' ? (input.tool_name === 'AskUserQuestion' ? 'question' : input.notification_type ? String(input.notification_type).slice(0, 40) : null) : null,
        last: (last || (state === 'working' && !input.tool_name ? '💬 Thinking about your message'
          : state === 'done' ? '✅ Finished' + (prev.last && !prev.last.startsWith('💬') && !prev.last.startsWith('✅') ? ' · ' + prev.last.replace(/^\S+\s/, '') : '')
          : prev.last || null) || '').slice(0, 60) || null,
        since: prev.state === state && prev.since ? prev.since : now,
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
