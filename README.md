# Airdrop Finder

Automated, config-driven airdrop eligibility scans across Base, Optimism, and Arbitrum with daily GitHub Actions runs and a GitHub Pages dashboard.

---

## Overview

Airdrop Finder scans a set of wallets against configured airdrops and generates timestamped JSON reports. It supports:

- Contract-based checks with customizable method signatures and arguments.
- Snapshot-based checks using JSON lists or maps.
- Daily automation via GitHub Actions, with optional webhook delivery.
- A professional, static Next.js dashboard optimized for GitHub Pages.

---

## Highlights

- Multi-chain support: Base, Optimism, Arbitrum.
- Flexible airdrop config: custom ABI method + args, return types, rate limits.
- Snapshot formats: address maps, arrays, or object entries with custom fields.
- Daily automation: scheduled GitHub Actions scan + report commit.
- GitHub Pages site: static Next.js export, auto-deployed.

---

## Quick Start

```bash
git clone https://github.com/your-username/airdrop-finder.git
cd airdrop-finder
npm install
cp .env.example .env
# edit .env to add your RPC URLs and webhook if needed
npm run scan:once
ls reports
```

Node 18+ is required.

---

## Configuration

Edit `config/airdrops.config.json` to add or modify airdrops.

### Contract airdrop

```json
{
  "name": "Base Community Drop",
  "chain": "base",
  "type": "contract",
  "contract": "0x0000000000000000000000000000000000000000",
  "method": "claimable(address)",
  "returnType": "uint256",
  "args": ["wallet"],
  "minClaimable": "1",
  "decimals": 18,
  "symbol": "BASE"
}
```

### Snapshot airdrop

```json
{
  "name": "OP Snapshot Drop",
  "chain": "optimism",
  "type": "snapshot",
  "snapshotFile": "snapshots/op_airdrop.json",
  "snapshotAddressField": "wallet",
  "snapshotAmountField": "amount",
  "decimals": 18,
  "symbol": "OP"
}
```

### Fields (summary)

- `enabled`: set to `false` to disable an airdrop.
- `chain`: `base`, `optimism`, `arbitrum`.
- `type`: `contract` or `snapshot`.
- `method`: contract method signature, e.g. `claimable(address)`.
- `returnType`: `uint256` or `bool`.
- `args`: array of args; use `wallet` or `$wallet` to inject the current wallet.
- `minClaimable`: minimum raw amount required to include.
- `decimals` / `symbol`: used for formatted output.
- `rateLimitMs`: delay between calls to avoid RPC throttling.
- `snapshotAddressField` / `snapshotAmountField`: used when snapshot is an array of objects.

Wallets live in `data/wallets.json` (array of addresses). Override with `WALLETS_FILE`.

---

## CLI Options

```
--airdrop "<name>"          Filter by airdrop name (partial match)
--chains base,optimism      Filter by chain
--wallet 0x...              Scan a single wallet
--wallets-file path.json    Use a custom wallets file
--min-claimable 1000        Minimum raw claimable amount
--include-zero              Include zero results in report
--dry-run                   Skip contract calls (snapshot only)
--report-dir path           Custom report output directory
```

---

## Automation

### Daily scan workflow

The scheduled workflow runs every day at 09:00 UTC and commits the generated report into `reports/`.

Secrets required:

- `BASE_RPC`, `OP_RPC`, `ARBITRUM_RPC`
- `REWARD_WEBHOOK` (optional)

### GitHub Pages dashboard

The Next.js site in `web/` is built as a static export and deployed automatically on every push to `main`.

To enable:

1. In GitHub, go to **Settings → Pages**.
2. Select **GitHub Actions** as the source.
3. Push to `main` or run the `Pages` workflow manually.

---

## Project Structure

```
airdrop-finder/
├─ .github/workflows/
│  ├─ daily-airdrop.yml
│  └─ pages.yml
├─ config/
│  └─ airdrops.config.json
├─ data/
│  └─ wallets.json
├─ reports/
├─ src/
│  └─ airdrops.js
└─ web/
   ├─ pages/
   ├─ public/
   ├─ scripts/
   └─ styles/
```

---

## License

MIT © Crypto Mobb
