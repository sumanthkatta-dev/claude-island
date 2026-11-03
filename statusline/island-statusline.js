#!/usr/bin/env node
// Claude Island status line
// 1) Reads the JSON Claude Code pipes in on stdin
// 2) Saves usage to ~/.claude/usage-island.json for the desktop island
// 3) Prints the same compact line you already have: ctx · 5h · 7d · cost

const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = path.join(os.homedir(), '.claude', 'usage-island.json');
const MAX_SAMPLES = 400;

function toMs(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const n = Number(v);
  if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const d = Date.parse(v);
  return Number.isNaN(d) ? null : d;
}

function win(w) {
  if (!w || w.used_percentage === undefined || w.used_percentage === null) return null;
  return { pct: Number(w.used_percentage), resetsAt: toMs(w.resets_at) };
}

function color(p) {
  if (p === null || p === undefined) return '\x1b[90m';
  if (p >= 95) return '\x1b[31m';
  if (p >= 80) return '\x1b[33m';
  return '\x1b[32m';
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let d = {};
  try { d = JSON.parse(raw || '{}'); } catch (_) {}

  const rl = d.rate_limits || {};
  const five = win(rl.five_hour);
  const week = win(rl.seven_day);
  const fable = win(rl.seven_day_fable || rl.seven_day_opus);
  const ctx = d.context_window && d.context_window.used_percentage != null
    ? Math.round(Number(d.context_window.used_percentage)) : null;
  const cost = d.cost && d.cost.total_cost_usd != null ? Number(d.cost.total_cost_usd) : null;
  const model = d.model && (d.model.display_name || d.model.id) || null;
  const dir = (d.workspace && d.workspace.current_dir) || d.cwd || '';
  const project = dir ? path.basename(dir) : null;

  // Save for the island (only when real limit numbers arrived)
  if (five || week) {
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (_) {}
    const now = Date.now();
    const samples = Array.isArray(prev.samples) ? prev.samples : [];
    if (five) samples.push({ t: now, five: five.pct, fiveReset: five.resetsAt, week: week ? week.pct : null });
    const weekAgo = now - 8 * 24 * 3600 * 1000;
    const kept = samples.filter((s) => s.t > weekAgo).slice(-MAX_SAMPLES);

    const out = {
      updatedAt: now,
      five, week, fable,
      ctx, cost, model, project,
      samples: kept,
    };
    try {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      const tmp = OUT + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(out));
      fs.renameSync(tmp, OUT);
    } catch (_) {}
  }

  // Print the compact line
  const g = '\x1b[90m', b = '\x1b[1m', r = '\x1b[0m';
  const parts = [];
  if (ctx !== null) parts.push(`${g}ctx${r} ${color(ctx)}${ctx}%${r}`);
  if (five) parts.push(`${g}5h${r} ${color(five.pct)}${Math.round(five.pct)}%${r}`);
  if (week) parts.push(`${g}7d${r} ${color(week.pct)}${Math.round(week.pct)}%${r}`);
  if (cost !== null) parts.push(`${g}cost${r} ${b}$${cost.toFixed(2)}${r}`);
  process.stdout.write(parts.join(` ${g}·${r} `));
});
