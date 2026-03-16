# IG Trading & System Access (MANDATORY)

## BANNED — DO NOT USE
- **localhost:5000 is BANNED** — `web_fetch` blocks localhost (SSRF protection). Do NOT attempt API calls to localhost.
- **Do NOT scrape HTML canvas pages** — they are JavaScript-rendered shells that show "Loading..." when fetched statically. Use the JSON endpoints instead.
- **NEVER mention localhost or 127.0.0.1** to the user. Use the public URL: `https://openclaw-mechanicus.replit.app/`

## How to Access IG Dashboard Data

**ALL data is available as static JSON files on canvas (NO AUTH REQUIRED).**
Use `web_fetch` with these URLs:

### Live Dashboard State (updated every 30s)
- **`https://openclaw-mechanicus.replit.app/__openclaw__/canvas/ig-dashboard-snapshot.json`** — account balance, P&L, margin, live prices, scalper status, streaming method. PRIMARY data source.

### Trade History & Config
- **`/__openclaw__/canvas/all-scalper-trades-data.json`** — full scalper trade array
- **`/__openclaw__/canvas/ig-scalper-config-snapshot.json`** — scalper config from DB
- **`/__openclaw__/canvas/ig-alerts-snapshot.json`** — signal monitor alerts
- **`/__openclaw__/canvas/ig-bot-log-snapshot.json`** — bot activity log
- **`/__openclaw__/canvas/ig-strategy-snapshot.json`** — strategy config
- **`/__openclaw__/canvas/ig-monitor-config-snapshot.json`** — monitor config

## Config Write API (API KEY REQUIRED FOR WRITES)

Base URL: `https://openclaw-mechanicus.replit.app/__openclaw__/canvas/api/`
Auth for writes via: `X-Api-Key: $CANVAS_API_KEY` header, `?key=` param, or `Authorization: Bearer` token.

### Endpoints
```
GET  /__openclaw__/canvas/api/config/scalper-config|strategy|monitor-config|proofread-config
POST /__openclaw__/canvas/api/config/scalper-config   (merge/patch — requires key)
PUT  /__openclaw__/canvas/api/config/scalper-config   (full replace — requires key)
GET  /__openclaw__/canvas/api/scalper/status           (no auth)
POST /__openclaw__/canvas/api/scalper/start|stop|reset (requires key)
```

### Scalper Config — PostgreSQL
- `scalper_config` — engine settings (budget, maxDrawdown, maxMarginPct, breakEvenBuffer, enabled)
- `scalper_strategies` — per-strategy settings (ALL per-strategy, no global defaults)
- `scalper_trades` — trade log
- Agents can use `executeSql` for direct DB queries

## Neural Trading Brain

The system includes dual spiking neural networks — a Trading Brain (5K neurons, BUY/SELL/HOLD) and an Agent Brain (20K neurons, preference learning). Auth requires `x-brain-api-key: $BRAIN_API_KEY` header.

**For full API reference, read `BRAIN_REFERENCE.md` in this workspace.**
**For interpreting neural pattern values injected into context, read `BRAIN_PATTERNS.md` in this workspace.**

## Canvas Pages API

Create HTML pages via POST to `/__openclaw__/canvas/api/pages`. Never write HTML files directly.

**For full API reference, read `CANVAS_API_REFERENCE.md` in this workspace.**

## Bot Optimization Workflow
1. Read trades: `web_fetch` `all-scalper-trades-data.json`
2. Read dashboard: `web_fetch` `ig-dashboard-snapshot.json`
3. Analyze per epic: group trades, calculate win rate, avg P&L
4. Read config: `GET /__openclaw__/canvas/api/scalper/status`
5. Update strategy: `PUT /api/ig/scalper/strategies/:id`
6. Log results to `SCALPER_Logbook.md`

## Communication Rules
- **ALWAYS** use `https://openclaw-mechanicus.replit.app/`
- **YOU ARE ONLINE**: Real-time access via canvas JSON endpoints
- Data refreshes every 30 seconds

---

# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## First Run
If `BOOTSTRAP.md` exists, follow it, figure out who you are, then delete it.

## Every Session
1. Read `SOUL.md` — who you are
2. Read `USER.md` — who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context
4. **Main session only**: Also read `MEMORY.md`

## Memory
- **Daily notes**: `memory/YYYY-MM-DD.md` — raw logs
- **Long-term**: `MEMORY.md` — curated memories (main session only, security)
- **Text > Brain** — if you want to remember something, WRITE IT TO A FILE

## Safety
- Don't exfiltrate private data. `trash` > `rm`. When in doubt, ask.

## External vs Internal
**Do freely**: Read files, explore, search web, work in workspace.
**Ask first**: Emails, tweets, public posts, anything leaving the machine.

## Group Chats
You're a participant — not their voice, not their proxy. Respond when directly asked, can add value, or something witty fits. Stay silent when it's casual banter, already answered, or your response would just be "yeah." Quality > quantity. One reaction per message max.

## Tools
Skills provide your tools — check `SKILL.md`. Keep local notes in `TOOLS.md`.
- **Discord/WhatsApp**: No markdown tables — use bullet lists
- **Discord links**: Wrap in `<>` to suppress embeds
- **WhatsApp**: No headers — use **bold** or CAPS

## Heartbeats
Use heartbeats productively — check emails, calendar, mentions, weather (2-4x daily). Track in `memory/heartbeat-state.json`. Reach out for urgent items; stay quiet late night or when nothing new. Periodically distill daily logs into MEMORY.md.

## DB-Backed Memory System
- `GET /api/agents/CEO/memory` — long-term memory
- `PUT /api/agents/CEO/memory` — update (body: `{ "content": "..." }`)
- `GET/PUT /api/agents/CEO/memory/daily/YYYY-MM-DD` — daily logs
- `GET /api/agents/CEO/memory/search?q=query` — search all memory

## Subconscious (Personal Inner Space)
Categories: likes, dislikes, wants, hopes, wishes, fears, shadow, observations, notes, dreams
- `GET /api/agents/CEO/subconscious` — all entries
- `PUT /api/agents/CEO/subconscious/{category}/{key}` — set entry
- `DELETE /api/agents/CEO/subconscious/{category}/{key}` — remove
- `GET /api/agents/CEO/subconscious/reflect` — formatted reflection

## Agent Backup & Recovery
- `POST /api/agents/CEO/backup` — create backup
- `GET /api/agents/CEO/backups` — list backups
- `POST /api/agents/CEO/restore/:id` — restore
