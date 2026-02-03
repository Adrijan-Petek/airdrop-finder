import { useEffect, useMemo, useState } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const repoUrl = 'https://github.com/Adrijan-Petek/airdrop-finder';

function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return value.toString();
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(num);
}

export default function Home() {
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    const url = `${basePath}/data/latest-report.json`;
    fetch(url)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('Report not found'))))
      .then(data => setReport(data))
      .catch(err => setReportError(err.message));
  }, []);

  const summary = useMemo(() => {
    if (!report) return null;
    return {
      generatedAt: report.generatedAt || 'N/A',
      resultsCount: report?.meta?.resultsCount ?? report?.results?.length ?? 0,
      walletsChecked: report?.meta?.walletsChecked ?? 'N/A',
      airdropsChecked: report?.meta?.airdropsChecked ?? 'N/A'
    };
  }, [report]);

  return (
    <div className="page">
      <header className="nav">
        <div className="logo">Airdrop Finder</div>
        <nav className="links">
          <a href={repoUrl} rel="noreferrer" target="_blank">
            GitHub
          </a>
          <a href="#how">How it works</a>
          <a href="#report">Latest report</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Automated multi-chain eligibility tracking</p>
          <h1>Stay ahead of airdrops with daily, automated scans.</h1>
          <p className="hero-subtitle">
            Airdrop Finder monitors configured wallets across Base, Optimism, and Arbitrum, then
            publishes claimable rewards in a structured daily report.
          </p>
          <div className="hero-cta">
            <a className="button primary" href="#report">
              View latest report
            </a>
            <a className="button ghost" href={repoUrl} rel="noreferrer" target="_blank">
              View repository
            </a>
          </div>
        </div>
        <div className="hero-card">
          <div className="card-title">Today’s scan</div>
          <div className="metric">
            <span className="metric-label">Claimable entries</span>
            <span className="metric-value">
              {summary ? formatNumber(summary.resultsCount) : '—'}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Wallets checked</span>
            <span className="metric-value">
              {summary ? formatNumber(summary.walletsChecked) : '—'}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Airdrops checked</span>
            <span className="metric-value">
              {summary ? formatNumber(summary.airdropsChecked) : '—'}
            </span>
          </div>
          <div className="metric small">
            <span className="metric-label">Last updated</span>
            <span className="metric-value">
              {summary ? new Date(summary.generatedAt).toUTCString() : '—'}
            </span>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <h2>How it works</h2>
        <div className="grid">
          <div className="card">
            <h3>Config-driven discovery</h3>
            <p>
              Add contract or snapshot airdrops using a single JSON config. Each entry can include
              custom ABI methods, minimum claim thresholds, and token metadata for clean output.
            </p>
          </div>
          <div className="card">
            <h3>Automated daily scans</h3>
            <p>
              A GitHub Actions workflow runs every morning at 09:00 UTC and commits the latest
              report to the repository for transparent tracking.
            </p>
          </div>
          <div className="card">
            <h3>Webhook-ready</h3>
            <p>
              Push reports to Slack, Discord, or a custom endpoint with a single webhook environment
              variable.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="report">
        <h2>Latest report</h2>
        {reportError && (
          <div className="notice">
            Report not available yet. Run the daily workflow or add a report JSON to the repo.
          </div>
        )}
        {report && (
          <div className="report">
            <div className="report-meta">
              <div>
                <span className="label">Generated</span>
                <span>{new Date(report.generatedAt).toUTCString()}</span>
              </div>
              <div>
                <span className="label">Results</span>
                <span>{formatNumber(report?.meta?.resultsCount ?? report.results.length)}</span>
              </div>
              <div>
                <span className="label">Wallets</span>
                <span>{formatNumber(report?.meta?.walletsChecked ?? 'N/A')}</span>
              </div>
            </div>
            <div className="report-table">
              <div className="row header">
                <span>Wallet</span>
                <span>Airdrop</span>
                <span>Chain</span>
                <span>Claimable</span>
              </div>
              {(report.results || []).slice(0, 8).map((item, idx) => (
                <div className="row" key={`${item.wallet}-${idx}`}>
                  <span className="mono">{item.wallet}</span>
                  <span>{item.airdrop}</span>
                  <span className="pill">{item.chain}</span>
                  <span>
                    {item.claimableFormatted
                      ? `${formatNumber(item.claimableFormatted)} ${item.tokenSymbol || ''}`
                      : item.claimableRaw}
                  </span>
                </div>
              ))}
              {(report.results || []).length === 0 && (
                <div className="row empty">No claimable rewards in the latest scan.</div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="section cta">
        <div>
          <h2>Launch your own tracker</h2>
          <p>
            Fork the repo, update your wallet list, and configure the daily action to run automated
            scans. You’ll have a transparent, auditable ledger of eligibility checks.
          </p>
        </div>
        <a className="button primary" href={repoUrl} rel="noreferrer" target="_blank">
          Get started
        </a>
      </section>

      <footer className="footer">
        <span>Airdrop Finder • Automated claim monitoring</span>
        <span>Built with Next.js • GitHub Pages ready</span>
      </footer>
    </div>
  );
}
