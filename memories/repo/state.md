# Old Eden — Repo Memory

## File Layout
- Single-file client: `public/index.html` (~7610 lines, CRLF)
- Server entry: `src/core/index.js` (19 systems, port 3000)
- QA board: `node qa_board.cjs` (5 specialists, Puppeteer+SwiftShader)

## Critical Build Facts
- ALL files use CRLF line endings
- `replace_string_in_file` tool is UNRELIABLE for complex matches — use `.cjs` patch scripts
- `multi_replace_string_in_file` works for SIMPLE replacements but can match wrong occurrences
- For anything with `${}`, quotes, or unicode — always use a `.cjs` script
- Node `-e` one-liners choke on complex quoting in PowerShell — always use .cjs files
- QA Board paren check counts ALL parens file-wide — doesn't catch local mismatches

## Audit State
- Audits 1-41 complete (~200+ total fixes)
- HEAD: `959daf3` on `copilot/vscode-mnjwo8jb-b3zd`
- Client code at polish plateau — most simple bugs found
- Server-side audited once (audit 37)

## Known Non-Issues
- "1 non-fatal console error" in QA = headless WebGL context (SwiftShader). Not actionable.
- Socket.IO polling HTTP 400 = no active session. Expected.

## QA Workflow
1. `taskkill /F /IM node.exe 2>$null`
2. `node src/core/index.js` (background)
3. `node qa_board.cjs` — must show 5/5 APPROVED
4. `git add -A; git commit -m "..."`
5. `git status --short` MUST be empty
6. Clean up temp .cjs files in separate commit
