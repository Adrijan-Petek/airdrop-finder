# Airdrop Finder

[![Daily Scan](https://img.shields.io/badge/scan-daily-brightgreen)](./.github/workflows/daily-airdrop.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> Airdrop Finder scans a list of wallets across **Base**, **Optimism**, and **Arbitrum** and reports which wallets are eligible to claim configured airdrops. Designed to run daily via GitHub Actions and optionally post reports to a webhook (Discord/Slack).

---

## ✨ Highlights
- Multi-chain: Base, Optimism, Arbitrum
- Config-driven: add new airdrops via `airdrops.config.json`
- Two airdrop types supported: **contract** (on-chain claimable calls) and **snapshot** (precomputed lists)
- Outputs timestamped JSON reports in `reports/`
- GitHub Actions workflow for daily scans included (uses `npm install` to avoid CI lockfile issues)

---

## 🚀 Quick start (copy/paste)

```bash
git clone https://github.com/your-username/airdrop-finder.git
cd airdrop-finder
npm install
cp .env.example .env
# edit .env to add your RPC URLs and webhook if needed
npm run scan:once
ls reports
cat reports/airdrop-report-*.json | jq
```

> Node 18+ is required (for global `fetch` and ESM compatibility with ethers v6).

---

## 🧭 Project structure
```
airdrop-finder/
├─ .github/workflows/
│  ├─ daily-airdrop.yml
│  └─ ci.yml
├─ src/
│  └─ airdrops.js
├─ snapshots/
│  └─ op_airdrop.json
├─ config/
│  └─ airdrops.config.json
├─ data/
│  └─ wallets.json
├─ reports/
├─ package.json
├─ .env.example
├─ vercel.json
└─ README.md
```

---

## ⚙️ Configure

1. Edit `config/airdrops.config.json` to add or modify airdrops. Each airdrop supports either a `contract` with a `method` (defaults to `claimable(address)`) or `snapshotFile` (path under `snapshots/`). Example:

```json
{
  "airdrops": [
    {
      "name": "Base Community Drop",
      "chain": "base",
      "type": "contract",
      "contract": "0x0000000000000000000000000000000000000000",
      "method": "claimable(address)"
    },
    {
      "name": "OP Snapshot Drop",
      "chain": "optimism",
      "type": "snapshot",
      "snapshotFile": "snapshots/op_airdrop.json"
    }
  ]
}
```

2. Put wallets to monitor in `data/wallets.json` (array of checksummed addresses).

3. Set RPCs and webhook in `.env` (or in GitHub Secrets for Actions). See `.env.example` for keys.

---

## 🛠 How it works (high level)

- Loads wallet list and airdrop config.
- For each airdrop and each wallet:
  - If `type` is `contract`, it calls the configured `method` on the contract (e.g. `claimable(address)`) and treats non-zero as claimable.
  - If `type` is `snapshot`, it looks up the wallet in the snapshot file and reports the amount if present.
- Produces `reports/airdrop-report-<timestamp>.json` with findings.
- Optionally posts the report to `SCAN_WEBHOOK_URL` when set.

---

## 📡 GitHub Actions

A daily workflow `./github/workflows/daily-airdrop.yml` runs every day at 09:00 UTC. It uses `npm install` (not `npm ci`) to avoid failing in repos without `package-lock.json`.

Secrets to configure in GitHub repository:
- `BASE_RPC`, `OP_RPC`, `ARBITRUM_RPC` — RPC URLs for each chain
- `REWARD_WEBHOOK` (optional) — webhook to POST the JSON report

---

## 🧪 Example output (report excerpt)

```json
{
  "generatedAt": "2025-09-28T11:22:33.000Z",
  "results": [
    {
      "chain": "optimism",
      "airdrop": "OP Snapshot Drop",
      "wallet": "0x123...",
      "claimable": "45000000000000000000"
    }
  ]
}
```

---

## ✅ Next steps / ideas
- Add token symbol/decimals normalization for nicer report output
- Add retries and pagination for `getLogs` / large snapshot scanning
- Build a Vercel dashboard to list reports and trigger scans manually

---

MIT © Crypto Mobb
