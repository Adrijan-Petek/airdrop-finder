#!/usr/bin/env node
/**
 * Airdrop Finder
 * - Reads config/airdrops.config.json
 * - Reads data/wallets.json (or custom list via CLI)
 * - Supports contract + snapshot types with flexible args/return types
 *
 * Requirements: Node 18+ (global fetch), ethers v6
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'airdrops.config.json');
const DEFAULT_WALLETS_PATH = path.join(__dirname, '..', 'data', 'wallets.json');
const DEFAULT_REPORT_DIR = path.join(__dirname, '..', 'reports');

const WEBHOOK = process.env.SCAN_WEBHOOK_URL || process.env.REWARD_WEBHOOK || null;

function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseArgs(argv) {
  const options = {
    airdropFilter: null,
    chainFilter: null,
    walletFilter: null,
    walletsFile: null,
    includeZero: false,
    dryRun: false,
    minClaimable: null,
    reportDir: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--airdrop' && argv[i + 1]) {
      options.airdropFilter = argv[i + 1];
      i += 1;
    } else if (arg === '--chains' && argv[i + 1]) {
      options.chainFilter = argv[i + 1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      i += 1;
    } else if (arg === '--wallet' && argv[i + 1]) {
      options.walletFilter = argv[i + 1];
      i += 1;
    } else if (arg === '--wallets-file' && argv[i + 1]) {
      options.walletsFile = argv[i + 1];
      i += 1;
    } else if (arg === '--include-zero') {
      options.includeZero = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--min-claimable' && argv[i + 1]) {
      options.minClaimable = argv[i + 1];
      i += 1;
    } else if (arg === '--report-dir' && argv[i + 1]) {
      options.reportDir = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return null;
  try {
    return ethers.getAddress(addr);
  } catch {
    return addr.toLowerCase();
  }
}

function loadWallets(options) {
  if (options.walletFilter) return [options.walletFilter];
  const walletPath = options.walletsFile || process.env.WALLETS_FILE || DEFAULT_WALLETS_PATH;
  const wallets = loadJSON(walletPath) || [];
  return wallets;
}

function formatUnitsSafe(raw, decimals) {
  if (raw === null || raw === undefined) return null;
  if (decimals === null || decimals === undefined) return null;
  try {
    return ethers.formatUnits(raw.toString(), Number(decimals));
  } catch {
    return null;
  }
}

async function callContractMethod({ rpc, contractAddr, methodSig, returnType, args }) {
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const abi = [`function ${methodSig} view returns (${returnType})`];
    const contract = new ethers.Contract(contractAddr, abi, provider);
    const methodName = methodSig.split('(')[0];
    const res = await contract[methodName](...args);
    if (returnType === 'bool') return res ? '1' : '0';
    return res ? res.toString() : '0';
  } catch (e) {
    return null;
  }
}

function resolveSnapshotValue({ snapshot, wallet, airdrop }) {
  if (!snapshot) return '0';
  const walletLower = wallet.toLowerCase();

  if (Array.isArray(snapshot)) {
    const addressField = airdrop.snapshotAddressField || 'wallet';
    const amountField = airdrop.snapshotAmountField || 'amount';

    for (const entry of snapshot) {
      if (typeof entry === 'string') {
        if (entry.toLowerCase() === walletLower) return '1';
      } else if (entry && typeof entry === 'object') {
        const entryAddress = entry[addressField] || entry.address || entry.wallet;
        if (entryAddress && entryAddress.toLowerCase() === walletLower) {
          return entry[amountField] || entry.amount || entry.claimable || '1';
        }
      }
    }
    return '0';
  }

  if (typeof snapshot === 'object') {
    return snapshot[wallet] || snapshot[walletLower] || '0';
  }

  return '0';
}

async function checkAirdropForWallet({ airdrop, wallet, rpcs, dryRun }) {
  if (airdrop.type === 'snapshot') {
    const snapshotPath = path.join(__dirname, '..', airdrop.snapshotFile);
    const snap = loadJSON(snapshotPath) || {};
    return resolveSnapshotValue({ snapshot: snap, wallet, airdrop });
  }

  if (airdrop.type === 'contract') {
    if (dryRun) return '0';
    const chain = (airdrop.chain || 'base').toLowerCase();
    const rpc = rpcs[chain];
    if (!rpc) return null;
    const method = airdrop.method || 'claimable(address)';
    const returnType = airdrop.returnType || 'uint256';

    const args = (airdrop.args || ['wallet']).map(arg => {
      if (arg === 'wallet' || arg === '$wallet') return wallet;
      return arg;
    });

    return callContractMethod({
      rpc,
      contractAddr: airdrop.contract,
      methodSig: method,
      returnType,
      args
    });
  }

  return null;
}

function passesMinClaimable(claimable, minClaimable) {
  if (!minClaimable) return true;
  try {
    return BigInt(claimable || '0') >= BigInt(minClaimable);
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadJSON(CONFIG_PATH);
  if (!config) {
    console.error('Missing config/airdrops.config.json');
    process.exit(1);
  }

  const wallets = loadWallets(options);
  const rpcs = {
    base: process.env.BASE_RPC,
    optimism: process.env.OP_RPC,
    arbitrum: process.env.ARBITRUM_RPC
  };

  const reportDir = options.reportDir || process.env.REPORT_DIR || process.env.REPORTS_DIR || DEFAULT_REPORT_DIR;

  const airdrops = (config.airdrops || [])
    .filter(a => a && a.enabled !== false)
    .filter(a => {
      if (!options.chainFilter || options.chainFilter.length === 0) return true;
      return options.chainFilter.includes((a.chain || '').toLowerCase());
    })
    .filter(a => {
      if (!options.airdropFilter) return true;
      return a.name && a.name.toLowerCase().includes(options.airdropFilter.toLowerCase());
    });

  const results = [];
  for (const airdrop of airdrops) {
    for (const wallet of wallets) {
      const normalizedWallet = normalizeAddress(wallet);
      process.stdout.write(`Checking ${airdrop.name} on ${airdrop.chain} for ${normalizedWallet} ... `);
      const claimableRaw = await checkAirdropForWallet({
        airdrop,
        wallet: normalizedWallet,
        rpcs,
        dryRun: options.dryRun
      });

      if (claimableRaw === null) {
        console.log('error');
        continue;
      }

      const isZero = !claimableRaw || claimableRaw === '0';
      const minClaimable = airdrop.minClaimable || options.minClaimable;
      const passesMin = passesMinClaimable(claimableRaw, minClaimable);
      const shouldInclude = options.includeZero || (!isZero && passesMin);

      if (shouldInclude) {
        const formatted = formatUnitsSafe(claimableRaw, airdrop.decimals);
        console.log('✓ claimable:', claimableRaw);
        results.push({
          chain: airdrop.chain,
          airdrop: airdrop.name,
          wallet: normalizedWallet,
          claimableRaw: claimableRaw.toString(),
          claimableFormatted: formatted,
          tokenSymbol: airdrop.symbol || null,
          decimals: airdrop.decimals ?? null
        });
      } else {
        console.log('no');
      }

      if (airdrop.rateLimitMs) {
        await new Promise(resolve => setTimeout(resolve, Number(airdrop.rateLimitMs)));
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    meta: {
      airdropsChecked: airdrops.length,
      walletsChecked: wallets.length,
      resultsCount: results.length,
      dryRun: options.dryRun
    },
    results
  };

  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(reportDir, `airdrop-report-${now}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote', outPath);

  if (WEBHOOK) {
    try {
      await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(out)
      });
      console.log('Posted report to webhook');
    } catch (e) {
      console.error('Webhook post failed:', e.message);
    }
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
