import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, Target, BarChart3, Activity, Hash,
  LineChart as LineChartIcon, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { fetchCertificateVerification, type CertificateVerificationData } from '@/utils/journalApi';

// ─── Utility ────────────────────────────────────────────────────────

const fmt = (val: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const pnlColor = (v: number) => v >= 0 ? '#1BBF99' : '#ED5363';

// ─── Section Wrapper ────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <div className={`bg-[#0A1114]/60 border border-[#1E2D3D]/40 rounded-xl overflow-hidden ${className}`}>
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#1E2D3D]/30">
      <span className="text-[#3AB3FF]">{icon}</span>
      <h3 className="text-sm font-semibold text-[#E4EEF5]">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Metric Card ────────────────────────────────────────────────────

const Metric: React.FC<{ label: string; value: string; color?: string; icon?: React.ReactNode }> = ({ label, value, color, icon }) => (
  <div className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#080808] border border-[#1E2D3D]/40 hover:border-[#1E2D3D]/70 transition-colors">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[#85A8C3]/60">{icon}</span>}
      <span className="text-[10px] font-medium text-[#85A8C3]/70 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-bold" style={{ color: color || '#E4EEF5' }}>{value}</span>
  </div>
);

// ─── Equity Chart Tooltip ───────────────────────────────────────────

const EquityTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl text-xs">
      <p className="text-[#E4EEF5] font-medium mb-1.5">{p.date}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6"><span className="text-[#85A8C3]">Balance</span><span className="font-medium text-[#3AB3FF]">{fmt(p.balance)}</span></div>
        <div className="flex justify-between gap-6"><span className="text-[#85A8C3]">Equity</span><span className="font-medium text-[#4EC1FF]">{fmt(p.equity)}</span></div>
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────

const EQUITY_PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: Infinity },
] as const;

const VerifyCertificatePage: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [data, setData] = useState<CertificateVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [equityPeriod, setEquityPeriod] = useState<number>(Infinity);

  useEffect(() => {
    if (!certificateId) { setIsLoading(false); setError(true); return; }
    fetchCertificateVerification(certificateId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [certificateId]);

  const filteredEquity = useMemo(() => {
    if (!data?.equity_curve?.length) return [];
    if (equityPeriod === Infinity) return data.equity_curve;
    return data.equity_curve.slice(-equityPeriod);
  }, [data?.equity_curve, equityPeriod]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          <span className="text-xs text-[#85A8C3]">Verifying certificate...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E2D3D]/20 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[#85A8C3]" />
          </div>
          <h2 className="text-xl font-semibold text-[#E4EEF5] mb-2">Verification Failed</h2>
          <p className="text-sm text-[#85A8C3]">Unable to verify this certificate. Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const isValid = data.valid;
  const cert = data.certificate;
  const trader = data.trader;
  const payout = data.payout;
  const enrollment = data.enrollment;
  const summary = data.trading_summary;
  const currency = enrollment?.currency || 'USD';

  return (
    <div className="min-h-screen bg-[#080808] text-[#E4EEF5] select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Header */}
      <header className="border-b border-[#1E2D3D]/30 bg-[#0A1114]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/LogoWithName.svg" alt="WeFund" className="h-7" />
            <span className="text-xs text-[#85A8C3]/50 hidden sm:inline">Certificate Verification</span>
          </div>
          <a href="https://we-fund.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#85A8C3] hover:text-[#3AB3FF] transition-colors">we-fund.com &rarr;</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Validity Banner */}
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          isValid
            ? 'border-[#1BBF99]/30 bg-[#1BBF99]/5'
            : 'border-[#ED5363]/30 bg-[#ED5363]/5'
        }`}>
          {isValid ? (
            <CheckCircle2 className="w-8 h-8 text-[#1BBF99] shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-[#ED5363] shrink-0" />
          )}
          <div>
            <h2 className={`text-lg font-bold ${isValid ? 'text-[#1BBF99]' : 'text-[#ED5363]'}`}>
              {isValid ? 'Verified Certificate' : 'Invalid Certificate'}
            </h2>
            <p className="text-xs text-[#85A8C3] mt-0.5">
              {isValid
                ? 'This payout certificate has been verified as authentic and issued by WeFund.'
                : 'This certificate could not be verified. It may be invalid or tampered with.'}
            </p>
          </div>
        </div>

        {isValid && cert && (
          <>
            {/* Certificate Image */}
            {cert.image_url && (
              <div className="rounded-xl border border-[#1E2D3D]/40 bg-[#0A1114]/60 p-4 flex justify-center">
                <img
                  src={cert.image_url}
                  alt="Payout Certificate"
                  className="max-w-md w-full rounded-lg pointer-events-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            )}

            {/* Certificate Details Card */}
            <div className="rounded-xl border border-[#1E2D3D]/40 bg-[#0A1114]/60 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Trader Avatar */}
                {trader && (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3AB3FF]/20 to-[#4EC1FF]/10 flex items-center justify-center border border-[#3AB3FF]/20 text-xl font-bold text-[#3AB3FF] shrink-0">
                    {trader.initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#E4EEF5] truncate">{trader?.display_name || 'Trader'}</h3>
                  <p className="text-sm text-[#85A8C3] mt-0.5">{cert.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                    {cert.issued_date && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30 text-[#85A8C3]">
                        Issued: {new Date(cert.issued_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    {enrollment?.challenge_name && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30 text-[#85A8C3]">
                        {enrollment.challenge_name}
                      </span>
                    )}
                    {enrollment && (
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30 text-[#85A8C3]">
                        {fmt(enrollment.account_size, currency)} Account
                      </span>
                    )}
                  </div>
                </div>
                {/* Payout Amount */}
                {payout && (
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-[#1BBF99]">{fmt(payout.released_fund, currency)}</div>
                    <div className="text-xs text-[#85A8C3] mt-0.5">
                      {payout.profit_share_percent}% profit share
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trading Metrics Grid */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <Metric label="Net P&L" value={fmt(summary.net_pnl, currency)} color={pnlColor(summary.net_pnl)} icon={<TrendingUp className="w-3 h-3" />} />
                <Metric label="Win Rate" value={`${summary.win_rate.toFixed(1)}%`} color={summary.win_rate >= 50 ? '#1BBF99' : '#ED5363'} icon={<Target className="w-3 h-3" />} />
                <Metric label="Profit Factor" value={summary.profit_factor.toFixed(2)} icon={<BarChart3 className="w-3 h-3" />} />
                <Metric label="Total Trades" value={summary.total_trades.toLocaleString()} icon={<Hash className="w-3 h-3" />} />
                <Metric label="Avg Win" value={fmt(summary.avg_win, currency)} color="#1BBF99" icon={<Activity className="w-3 h-3" />} />
                <Metric label="Avg Loss" value={fmt(summary.avg_loss, currency)} color="#ED5363" icon={<Activity className="w-3 h-3" />} />
              </div>
            )}

            {/* Equity Curve */}
            {filteredEquity.length > 0 && (
              <Section title="Equity Curve" icon={<LineChartIcon className="w-4 h-4" />}>
                <div className="flex items-center gap-1 mb-4">
                  {EQUITY_PERIODS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setEquityPeriod(p.days)}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                        equityPeriod === p.days
                          ? 'bg-[#3AB3FF]/15 text-[#3AB3FF] border border-[#3AB3FF]/25'
                          : 'text-[#85A8C3]/60 hover:text-[#85A8C3] hover:bg-[#1E2D3D]/20 border border-transparent'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={filteredEquity}>
                    <defs>
                      <linearGradient id="eqGradVerify" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3AB3FF" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3AB3FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" strokeOpacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={{ stroke: '#1E2D3D' }} tickLine={false} minTickGap={40} />
                    <YAxis tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<EquityTooltip />} />
                    {enrollment && <ReferenceLine y={enrollment.account_size} stroke="#85A8C3" strokeDasharray="4 4" strokeOpacity={0.2} />}
                    <Area type="monotone" dataKey="balance" stroke="#3AB3FF" fill="url(#eqGradVerify)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>
            )}

            {/* Daily P&L Chart */}
            {data.daily_pnl && data.daily_pnl.length > 0 && (
              <Section title="Daily P&L" icon={<BarChart3 className="w-4 h-4" />}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.daily_pnl} barCategoryGap="10%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" strokeOpacity={0.3} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={{ stroke: '#1E2D3D' }} tickLine={false} minTickGap={40} />
                    <YAxis tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 shadow-xl text-xs">
                            <p className="text-[#85A8C3] mb-1">{d.date}</p>
                            <p className="font-medium" style={{ color: pnlColor(d.pnl) }}>{d.pnl >= 0 ? '+' : ''}{fmt(d.pnl, currency)}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke="#1E2D3D" strokeOpacity={0.5} />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                      {data.daily_pnl.map((entry, index) => (
                        <Cell key={index} fill={entry.pnl >= 0 ? 'rgba(27,191,153,0.6)' : 'rgba(237,83,99,0.6)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2D3D]/20 mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2 text-xs text-[#85A8C3]/40">
          <span>Powered by</span>
          <a href="https://we-fund.com" target="_blank" rel="noopener noreferrer" className="text-[#3AB3FF]/60 hover:text-[#3AB3FF] transition-colors font-medium">WeFund</a>
        </div>
      </footer>
    </div>
  );
};

export default VerifyCertificatePage;
