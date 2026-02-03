const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, '..', '..', 'reports');
const outDir = path.join(__dirname, '..', 'public', 'data');
const outFile = path.join(outDir, 'latest-report.json');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function findLatestReport(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(name => name.startsWith('airdrop-report-') && name.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

function main() {
  ensureDir(outDir);
  const latest = findLatestReport(reportsDir);
  if (!latest) {
    fs.writeFileSync(outFile, JSON.stringify({ generatedAt: null, meta: {}, results: [] }, null, 2));
    console.log('No report found. Wrote empty latest-report.json');
    return;
  }
  fs.copyFileSync(latest, outFile);
  console.log(`Copied ${latest} -> ${outFile}`);
}

main();
