# Old Eden — Repo Notes

## File Editing
- `replace_string_in_file` tool CORRUPTS files. Use .cjs patch scripts with `fs.readFileSync/writeFileSync` + `safeReplace()` + `cr()` for CRLF.
- VS Code can silently re-apply cached/modified buffer content after `git checkout -- file`, overwriting the clean checkout. ALWAYS verify `git status --short` immediately after checkout AND after patch application.
- After committing, check `git status --short` to confirm no leftover working tree changes.
- Template literals: use `"$"+"{varName}"` in .cjs patches for dynamic expressions.

## Project Structure
- Single-file client: `public/index.html` (~7550 lines)
- Server: `src/core/index.js` (19 systems)
- `<script type="module">` — strict mode, duplicate `const` = SyntaxError, TDZ enforced
- Port 3000, kill all node before restart: `taskkill /F /IM node.exe`

## QA + Commit Flow
1. Kill node → restart `node src/core/index.js` (background)
2. `node qa_board.cjs` → expect 5/5 APPROVED
3. `git add -A; git commit` (separate commands, NOT chained with `cd`)
4. `git status --short` — MUST be empty
5. `Remove-Item fix_*.cjs; git add -A; git commit -m "cleanup: ..."`
6. `git status --short` — MUST be empty again

## Audit Categories Completed (1-35)
Audits 1-30: All major systems. Audit 31: Timing/resources/input. Audit 32: CSS/balance/state/a11y. Audit 33: FTUE/combat feel/economy/code quality. Audit 34: NPC glow restore, shield shimmer, alt-universe guards, market guards, boss accuracy, mining laser quaternion, collectArtifact dedup. Audit 35: Stargate SyntaxError fix, collectArtifact TDZ fix, state.screen property, warp streaks guard.

## Key Gotcha
The subagent audit runner sometimes reads WORKING TREE content (including corrupted uncommitted changes) rather than COMMITTED content. Always verify findings against the committed file before building patches.
