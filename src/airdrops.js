#!/usr/bin/env node
/**
 * Simple Airdrop Finder
 * - Reads config/airdrops.config.json
 * - Reads data/wallets.json
 * - For 'contract' type, calls the provided method (e.g., claimable(address))
 * - For 'snapshot' type, looks up the wallet in the provided snapshot file
 *
 * Requirements: Node 18+ (global fetch), ethers v6
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'airdrops.config.json');
const WALLETS_PATH = path.join(__dirname, '..', 'data', 'wallets.json');
const REPORT_DIR = process.env.REPORT_DIR || process.env.REPORTS_DIR || path.join(__dirname, '..', 'reports');
const WEBHOOK = process.env.SCAN_WEBHOOK_URL || process.env.REWARD_WEBHOOK || null;

function loadJSON(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function callContractMethod(rpc, contractAddr, methodSig, wallet) {
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    // Build minimal ABI from methodSig like "claimable(address)"
    const abi = [ `function ${methodSig} view returns (uint256)` ];
    const iface = new ethers.Interface(abi);
    const contract = new ethers.Contract(contractAddr, abi, provider);
    // call the method with wallet
    const methodName = methodSig.split('(')[0];
    const res = await contract[methodName](wallet);
    // normalize to string
    return res ? res.toString() : '0';
  } catch (e) {
    return null;
  }
}

async function checkAirdropForWallet(airdrop, wallet, rpcs) {
  if (airdrop.type === 'snapshot') {
    const snapshotPath = path.join(__dirname, '..', airdrop.snapshotFile);
    const snap = loadJSON(snapshotPath) || {};
    return snap[wallet] || '0';
  } else if (airdrop.type === 'contract') {
    const chain = (airdrop.chain || 'base').toLowerCase();
    const rpc = rpcs[chain];
    if (!rpc) return null;
    const method = airdrop.method || 'claimable(address)';
    const res = await callContractMethod(rpc, airdrop.contract, method, wallet);
    return res;
  }
  return null;
}

async function main() {
  const config = loadJSON(CONFIG_PATH);
  if (!config) {
    console.error('Missing config/airdrops.config.json');
    process.exit(1);
  }
  const wallets = loadJSON(WALLETS_PATH) || [];
  const rpcs = {
    base: process.env.BASE_RPC,
    optimism: process.env.OP_RPC,
    arbitrum: process.env.ARBITRUM_RPC
  };

  const results = [];
  for (const airdrop of config.airdrops) {
    for (const wallet of wallets) {
      process.stdout.write(`Checking ${airdrop.name} on ${airdrop.chain} for ${wallet} ... `);
      const claimable = await checkAirdropForWallet(airdrop, wallet, rpcs);
      if (claimable === null) {
        console.log('error');
        continue;
      }
      if (claimable && claimable !== '0') {
        console.log('✅ claimable:', claimable);
        results.push({
          chain: airdrop.chain,
          airdrop: airdrop.name,
          wallet,
          claimable
        });
      } else {
        console.log('no');
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    results
  };

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(REPORT_DIR, `airdrop-report-${now}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote', outPath);

  if (WEBHOOK) {
    try {
      await fetch(WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(out) });
      console.log('Posted report to webhook');
    } catch (e) {
      console.error('Webhook post failed:', e.message);
    }
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
