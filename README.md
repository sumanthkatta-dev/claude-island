# Claude Island

A Dynamic-Island-style pill for Windows that shows your Claude usage limits at the top center of your screen, right under the camera.

> **Unofficial side project. Not affiliated with, endorsed by, or made by Anthropic.**

![Claude Island concept demo](docs/demo.gif)

*Animated concept demo*

## Why

I use Claude Code a lot and kept hitting the 5-hour limit without warning. Claude Code already knows your usage numbers. This app just puts them on screen where you can always see them.

## Features

- **Multiple sessions:** one dot per open Claude Code session, and the expanded panel lists each project with its state and last action ("✏️ Edited session.ts")
- **Sounds:** a chime when Claude needs permission (on by default) and when it finishes (off by default). Toggle both and play a test sound from the tray
- **Activity light:** 🟢 green while Claude works, 🔴 red when it is blocked on a permission or question prompt, ⚪ white "breathing" when it is ready for your next prompt, gray when idle for a while
- **Collapsed pill:** session %, reset time and weekly %. The session % turns amber at 80% and red at 95%
- **Click to expand:** session, weekly and Fable bars with reset times
- **Burn rate** and a "you'll hit the limit around X" forecast
- **Weekly pacing:** "Day 4 of 7, on track" or "ahead of pace"
- **7-day history** mini chart
- **Alerts:** "Claude needs you" and "Claude is done, your turn" pop-ups, an amber flash at 80%, red at 95%, and "Limit refreshed" when your window resets
- **Ctrl + Alt + U** to show or hide it, a tray icon, and an optional start-with-Windows setting

## How it works

```
Claude Code ──(status line JSON)──▶ island-statusline.js ──▶ ~/.claude/usage-island.json ──┐
Claude Code ──(hooks)─────────────▶ island-hook.js ───────▶ ~/.claude/island-state.json ──┴─▶ Island app
```

- **Usage numbers:** Claude Code passes the official `rate_limits` (5-hour and 7-day) to your status line on Pro and Max plans. The script saves them locally and prints your normal status line.
- **Multiple sessions:** one dot per open Claude Code session, and the expanded panel lists each project with its state and last action ("✏️ Edited session.ts")
- **Sounds:** a chime when Claude needs permission (on by default) and when it finishes (off by default). Toggle both and play a test sound from the tray
- **Activity light:** Claude Code [hooks](https://code.claude.com/docs/en/hooks) run a tiny script when you send a prompt or a tool finishes (working), when Claude needs input or permission (needs you), when it finishes (done), and when the session ends.
- **The island** watches those two files and shows them.

## Safety

- **No network:** nothing in this project makes a network request, and nothing leaves your machine.
- **No commands:** the app and scripts never launch programs.
- **Writes only:** `~/.claude/usage-island.json`, `~/.claude/island-state.json`, and copies of the scripts in `~/.claude/claude-island/`.
- **Never blocks Claude:** the hook prints nothing, always exits 0, and stops itself after 2 seconds. It takes about 0.05–0.1 s per run.
- **Locked-down window:** context isolation is on, Node is off in the page, and a strict CSP means it only loads its own files.
- **Reversible:** `setup.js` backs up your `settings.json` and only adds its own entries. Your other settings and hooks are untouched. `uninstall.js` removes exactly what was added and restores your previous status line.

## Setup (Windows)

Requires [Node.js](https://nodejs.org) LTS.

1. Download this repo (Code → Download ZIP) and unzip it somewhere permanent, like `C:\Users\<you>\claude-island`
2. Open a terminal in that folder and run:
   ```
   node setup.js
   cd island
   npm install
   ```
3. Double-click `start-island.bat`
4. Restart Claude Code and send a message

**Shortcut:** open the Code tab in the Claude desktop app and ask Claude to set this up by following this README.

### Using it
- **Click** the pill to expand. It collapses on its own 6 seconds after your mouse leaves
- **Ctrl + Alt + U** shows or hides it
- **Tray icon:** show or hide, Start with Windows, quit

### Uninstall
Quit the island from the tray icon, then run `node uninstall.js` in the folder and delete the folder.

## Limitations

- Numbers refresh only when Claude Code gets a response. Usage from claude.ai chats shows up at the next Claude Code reply. Data older than 10 minutes is marked amber.
- Live limits need a Pro or Max plan, and appear after the first response in a session.
- Built and tested on a virtual display. Windows testing is in progress, so please open an issue if something breaks.
- It's an Electron app, so it uses about 100 MB of RAM. A lighter Tauri version may come later.
- With several Claude Code sessions open, red wins: if any session needs you, the light is red.

## License

MIT
