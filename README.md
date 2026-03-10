# OpenClaw Mechanicus Patch

IG Trading system for OpenClaw. Adds 23 strategies, batch backtesting with optimization memory, AI calibration, equity curve visualization, live signal monitoring, and the IG Trading Dashboard.

## Quick Install (Windows PowerShell)

Run this command to install directly from GitHub:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/JoeSzeles/openclaw-mechanicus-patches/main/install-node.cjs" -OutFile "$env:TEMP\mechanicus-install.cjs"; node "$env:TEMP\mechanicus-install.cjs"
```

## Manual Install

**Linux / Mac:**
```bash
git clone https://github.com/JoeSzeles/openclaw-mechanicus-patches.git
cd openclaw-mechanicus-patches
bash install.sh /path/to/openclaw
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/JoeSzeles/openclaw-mechanicus-patches.git
cd openclaw-mechanicus-patches
.\install.ps1
```

## Post-Install

Ensure you install the required trading dependencies in your OpenClaw folder:

```bash
npm install pg lightstreamer-client-node
```

## Post-Install Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IG_API_KEY` | Yes | IG Trading API key |
| `IG_IDENTIFIER` | Yes | IG account username |
| `IG_PASSWORD` | Yes | IG account password |
| `IG_ACCOUNT_TYPE` | Yes | `demo` or `live` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | No | Groq API key for AI calibration |
