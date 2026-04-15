import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, Target, Activity,
  Hash, LineChart as LineChartIcon, AlertTriangle, Trophy, Flame,
  Clock, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Zap, Calendar as CalendarIcon, LayoutGrid,
} from 'lucide-react';
import { usePublicJournal } from '@/hooks/useJournal';
import type { PublicJournalData } from '@/utils/journalApi';

// ─── Utility ────────────────────────────────────────────────────────

const fmt = (val: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const fmtCompact = (val: number) =>
  val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : fmt(val);

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDateFull = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const pnlColor = (v: number) => v >= 0 ? '#1BBF99' : '#ED5363';
const pnlBg = (v: number) => v >= 0 ? 'bg-[#1BBF99]' : 'bg-[#ED5363]';

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

const Metric: React.FC<{ label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <div className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#080808] border border-[#1E2D3D]/40 hover:border-[#1E2D3D]/70 transition-colors">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[#85A8C3]/60">{icon}</span>}
      <span className="text-[10px] font-medium text-[#85A8C3]/70 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-bold" style={{ color: color || '#E4EEF5' }}>{value}</span>
    {sub && <span className="text-[10px] text-[#85A8C3]/50">{sub}</span>}
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
        {p.drawdown > 0 && <div className="flex justify-between gap-6"><span className="text-[#85A8C3]">Drawdown</span><span className="font-medium text-[#ED5363]">{p.drawdown.toFixed(2)}%</span></div>}
      </div>
    </div>
  );
};

// ─── Calendar Heatmap ───────────────────────────────────────────────

const CalendarHeatmap: React.FC<{ data: PublicJournalData['calendar_data'] }> = ({ data }) => {
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, daysInMonth, firstDayOfWeek, monthName, pnlMap } = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - monthOffset);
    const y = now.getFullYear();
    const m = now.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const fdw = new Date(y, m, 1).getDay();
    const mn = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const map: Record<string, { pnl: number; trades: number }> = {};
    data.forEach((d) => { map[d.date] = { pnl: d.pnl, trades: d.trades }; });
    return { year: y, month: m, daysInMonth: dim, firstDayOfWeek: fdw, monthName: mn, pnlMap: map };
  }, [data, monthOffset]);

  const maxPnl = useMemo(() => {
    const vals = data.map((d) => Math.abs(d.pnl)).filter(Boolean);
    return Math.max(...vals, 1);
  }, [data]);

  const getCellStyle = (pnl: number | undefined) => {
    if (pnl === undefined) return {};
    const intensity = Math.min(Math.abs(pnl) / maxPnl, 1) * 0.5 + 0.1;
    return { backgroundColor: pnl >= 0 ? `rgba(27, 191, 153, ${intensity})` : `rgba(237, 83, 99, ${intensity})` };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthOffset((p) => Math.min(p + 1, 2))} className="px-2 py-1 rounded text-[#85A8C3] hover:text-[#E4EEF5] hover:bg-[#1E2D3D]/30 transition-colors text-xs">&larr;</button>
        <span className="text-xs font-medium text-[#E4EEF5]">{monthName}</span>
        <button onClick={() => setMonthOffset((p) => Math.max(p - 1, 0))} disabled={monthOffset === 0} className="px-2 py-1 rounded text-[#85A8C3] hover:text-[#E4EEF5] hover:bg-[#1E2D3D]/30 transition-colors text-xs disabled:opacity-30">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-[#85A8C3]/40 font-medium pb-0.5">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = pnlMap[ds];
          return (
            <div
              key={day}
              className="aspect-square flex flex-col items-center justify-center rounded-md text-[10px] border border-transparent hover:border-[#3AB3FF]/20 transition-colors cursor-default relative group"
              style={getCellStyle(entry?.pnl)}
              title={entry ? `${ds}: ${fmt(entry.pnl)} (${entry.trades} trades)` : ds}
            >
              <span className={entry ? 'text-[#E4EEF5]/90 font-medium' : 'text-[#85A8C3]/40'}>{day}</span>
              {entry && (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block bg-[#0A1114] border border-[#1E2D3D] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  <span className="text-[9px]" style={{ color: pnlColor(entry.pnl) }}>{fmt(entry.pnl)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 text-[9px] text-[#85A8C3]/50">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#1BBF99]/40" /> Profit</div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#ED5363]/40" /> Loss</div>
      </div>
    </div>
  );
};

// ─── Symbol Performance ─────────────────────────────────────────────

const SymbolTable: React.FC<{ symbols: PublicJournalData['symbol_performance']; currency: string }> = ({ symbols, currency }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? symbols : symbols.slice(0, 6);
  const maxPnl = Math.max(...symbols.map((s) => Math.abs(s.pnl)), 1);

  return (
    <div className="space-y-2">
      {visible.map((s) => {
        const barW = Math.abs(s.pnl) / maxPnl * 100;
        return (
          <div key={s.symbol} className="flex items-center gap-3 group hover:bg-[#1E2D3D]/10 rounded-lg px-2 py-1.5 transition-colors">
            <span className="w-20 text-xs font-semibold text-[#E4EEF5] truncate">{s.symbol}</span>
            <div className="flex-1 h-5 bg-[#080808] rounded overflow-hidden relative">
              <div className={`h-full rounded ${s.pnl >= 0 ? 'bg-[#1BBF99]/30' : 'bg-[#ED5363]/30'}`} style={{ width: `${barW}%` }} />
              <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-medium" style={{ color: pnlColor(s.pnl) }}>{fmt(s.pnl, currency)}</span>
            </div>
            <span className="w-10 text-[10px] text-[#85A8C3] text-right">{s.trades}t</span>
            <span className="w-12 text-[10px] text-right" style={{ color: s.win_rate >= 50 ? '#1BBF99' : '#ED5363' }}>{s.win_rate.toFixed(0)}%</span>
          </div>
        );
      })}
      {symbols.length > 6 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full text-center text-xs text-[#3AB3FF] hover:text-[#4EC1FF] py-1.5 transition-colors flex items-center justify-center gap-1">
          {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {symbols.length} symbols</>}
        </button>
      )}
    </div>
  );
};

// ─── Trades Table ───────────────────────────────────────────────────

const TradesTable: React.FC<{ trades: PublicJournalData['recent_trades']; currency: string }> = ({ trades, currency }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 10;
  const pageCount = Math.ceil(trades.length / perPage);
  const visible = trades.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1E2D3D]/30 text-[#85A8C3]/60">
              <th className="text-left px-3 py-2 font-medium">Symbol</th>
              <th className="text-left px-3 py-2 font-medium">Side</th>
              <th className="text-right px-3 py-2 font-medium">Vol</th>
              <th className="text-right px-3 py-2 font-medium">Open</th>
              <th className="text-right px-3 py-2 font-medium">Close</th>
              <th className="text-right px-3 py-2 font-medium">P&L</th>
              <th className="text-right px-3 py-2 font-medium hidden md:table-cell">Duration</th>
              <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const profit = Number(t.profit);
              const duration = (new Date(t.close_time).getTime() - new Date(t.open_time).getTime()) / 60000;
              const durationStr = duration < 60 ? `${duration.toFixed(0)}m` : duration < 1440 ? `${(duration / 60).toFixed(1)}h` : `${(duration / 1440).toFixed(1)}d`;
              const isExpanded = expanded === t.order;

              return (
                <React.Fragment key={t.order}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : t.order)}
                    className={`border-b border-[#1E2D3D]/10 cursor-pointer transition-colors ${isExpanded ? 'bg-[#1E2D3D]/15' : 'hover:bg-[#1E2D3D]/8'}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-[#E4EEF5]">{t.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.cmd === 0 ? 'bg-[#1BBF99]/10 text-[#1BBF99]' : 'bg-[#ED5363]/10 text-[#ED5363]'}`}>
                        {t.cmd === 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.cmd === 0 ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#85A8C3]">{t.volume}</td>
                    <td className="px-3 py-2.5 text-right text-[#85A8C3] font-mono">{Number(t.open_price).toFixed(t.symbol.includes('JPY') ? 3 : 5)}</td>
                    <td className="px-3 py-2.5 text-right text-[#85A8C3] font-mono">{Number(t.close_price).toFixed(t.symbol.includes('JPY') ? 3 : 5)}</td>
                    <td className="px-3 py-2.5 text-right font-bold" style={{ color: pnlColor(profit) }}>
                      {profit >= 0 ? '+' : ''}{fmt(profit, currency)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#85A8C3]/60 hidden md:table-cell">{durationStr}</td>
                    <td className="px-3 py-2.5 text-right text-[#85A8C3]/60 hidden lg:table-cell">{fmtDate(t.close_time)}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-[#1E2D3D]/8">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                          <div><span className="text-[#85A8C3]/50">Open Time</span><p className="text-[#E4EEF5] mt-0.5">{fmtDateFull(t.open_time)}</p></div>
                          <div><span className="text-[#85A8C3]/50">Close Time</span><p className="text-[#E4EEF5] mt-0.5">{fmtDateFull(t.close_time)}</p></div>
                          <div><span className="text-[#85A8C3]/50">SL</span><p className="text-[#E4EEF5] mt-0.5">{Number(t.sl) > 0 ? Number(t.sl).toFixed(5) : 'None'}</p></div>
                          <div><span className="text-[#85A8C3]/50">TP</span><p className="text-[#E4EEF5] mt-0.5">{Number(t.tp) > 0 ? Number(t.tp).toFixed(5) : 'None'}</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`w-7 h-7 rounded-md text-[10px] font-medium transition-colors ${page === i ? 'bg-[#3AB3FF]/15 text-[#3AB3FF] border border-[#3AB3FF]/30' : 'text-[#85A8C3]/50 hover:text-[#85A8C3] hover:bg-[#1E2D3D]/20'}`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Distribution Chart ─────────────────────────────────────────────

const DistributionChart: React.FC<{ data: PublicJournalData['distribution'] }> = ({ data }) => {
  if (!data.length) return <p className="text-xs text-[#85A8C3]/50 text-center py-4">Not enough data</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="10%">
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" strokeOpacity={0.3} vertical={false} />
        <XAxis dataKey="range_min" tick={false} axisLine={{ stroke: '#1E2D3D' }} />
        <YAxis tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 shadow-xl text-xs">
                <p className="text-[#85A8C3]">{fmt(d.range_min)} to {fmt(d.range_max)}</p>
                <p className="text-[#E4EEF5] font-medium">{d.count} trades</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.range_min >= 0 ? 'rgba(27,191,153,0.6)' : 'rgba(237,83,99,0.6)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Holding Time Chart ─────────────────────────────────────────────

const HoldingTimeChart: React.FC<{ data: PublicJournalData['holding_time'] }> = ({ data }) => {
  if (!data.length) return <p className="text-xs text-[#85A8C3]/50 text-center py-4">Not enough data</p>;
  return (
    <div className="space-y-2">
      {data.map((b) => {
        const maxTrades = Math.max(...data.map((d) => d.trades));
        const w = (b.trades / maxTrades) * 100;
        return (
          <div key={b.label} className="flex items-center gap-3">
            <span className="w-16 text-[10px] text-[#85A8C3] text-right shrink-0">{b.label}</span>
            <div className="flex-1 h-6 bg-[#080808] rounded-md overflow-hidden relative">
              <div className="h-full rounded-md" style={{ width: `${w}%`, backgroundColor: b.pnl >= 0 ? 'rgba(27,191,153,0.35)' : 'rgba(237,83,99,0.35)' }} />
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <span className="text-[10px] text-[#E4EEF5]/70">{b.trades} trades</span>
                <span className="text-[10px] font-medium" style={{ color: pnlColor(b.pnl) }}>{fmt(b.pnl)}</span>
              </div>
            </div>
            <span className="w-10 text-[10px] text-right" style={{ color: b.win_rate >= 50 ? '#1BBF99' : '#ED5363' }}>{b.win_rate.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Time Heatmap ───────────────────────────────────────────────────

const TimeHeatmap: React.FC<{ data: PublicJournalData['time_heatmap'] }> = ({ data }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const grid = useMemo(() => {
    const map: Record<string, { pnl: number; trades: number; win_rate: number }> = {};
    data.forEach((d) => { map[`${d.weekday}-${d.hour}`] = { pnl: d.pnl, trades: d.trades, win_rate: d.win_rate }; });
    return map;
  }, [data]);

  const maxTrades = useMemo(() => Math.max(...data.map((d) => d.trades), 1), [data]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex">
          <div className="w-10" />
          {hours.filter((h) => h % 3 === 0).map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-[#85A8C3]/40">{h}:00</div>
          ))}
        </div>
        {dayNames.map((day, di) => (
          <div key={day} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-10 text-[9px] text-[#85A8C3]/50 text-right pr-2">{day}</span>
            {hours.map((h) => {
              const cell = grid[`${di + 1}-${h}`];
              const intensity = cell ? (cell.trades / maxTrades) * 0.7 + 0.1 : 0;
              const color = cell ? (cell.pnl >= 0 ? `rgba(27,191,153,${intensity})` : `rgba(237,83,99,${intensity})`) : 'rgba(30,45,61,0.1)';
              return (
                <div
                  key={h}
                  className="flex-1 aspect-[2/1] rounded-[2px] cursor-default group relative"
                  style={{ backgroundColor: color }}
                  title={cell ? `${day} ${h}:00 — ${cell.trades} trades, ${fmt(cell.pnl)}, ${cell.win_rate.toFixed(0)}% WR` : `${day} ${h}:00`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Win Rate Donut ─────────────────────────────────────────────────

const WinRateDonut: React.FC<{ winRate: number; wins: number; losses: number }> = ({ winRate, wins, losses }) => {
  const data = [
    { name: 'Wins', value: wins, fill: '#1BBF99' },
    { name: 'Losses', value: losses, fill: '#ED5363' },
  ];
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={40} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-[#E4EEF5]">{winRate.toFixed(0)}%</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-[#1BBF99]" /><span className="text-[#85A8C3]">{wins} Wins</span></div>
        <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-[#ED5363]" /><span className="text-[#85A8C3]">{losses} Losses</span></div>
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

const SharedJournalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicJournal(token || '');
  const [equityPeriod, setEquityPeriod] = useState<number>(Infinity);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'analytics'>('overview');

  const filteredEquity = useMemo(() => {
    if (!data?.equity_curve.length) return [];
    if (equityPeriod === Infinity) return data.equity_curve;
    return data.equity_curve.slice(-equityPeriod);
  }, [data?.equity_curve, equityPeriod]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          <span className="text-xs text-[#85A8C3]">Loading journal...</span>
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
          <h2 className="text-xl font-semibold text-[#E4EEF5] mb-2">Journal Not Found</h2>
          <p className="text-sm text-[#85A8C3]">This share link may have been deactivated, expired, or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const d = data;
  const pnlPos = d.net_pnl >= 0;
  const returnPct = d.account_size > 0 ? (d.net_pnl / d.account_size * 100) : 0;

  return (
    <div className="min-h-screen bg-[#080808] text-[#E4EEF5]">
      {/* Header */}
      <header className="border-b border-[#1E2D3D]/30 bg-[#0A1114]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/LogoWithName.svg" alt="WeFund" className="h-7" />
          </div>
          <a href="https://we-fund.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#85A8C3] hover:text-[#3AB3FF] transition-colors">Start Trading &rarr;</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1E2D3D]/40 bg-gradient-to-br from-[#0A1114] to-[#0D161C]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSg1OCwxNzksMjU1LDAuMDMpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3AB3FF]/20 to-[#4EC1FF]/10 flex items-center justify-center border border-[#3AB3FF]/20 text-lg font-bold text-[#3AB3FF]">
                    {d.trader_first_name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#E4EEF5]">{d.trader_first_name}'s Journal</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#85A8C3]">
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30">MT5 #{d.account_id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30">{d.challenge_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#1E2D3D]/30 border border-[#1E2D3D]/30">{fmt(d.account_size, d.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className={`text-3xl font-bold ${pnlPos ? 'text-[#1BBF99]' : 'text-[#ED5363]'}`}>
                    {pnlPos ? '+' : ''}{fmt(d.net_pnl, d.currency)}
                  </div>
                  <div className={`text-sm font-medium ${pnlPos ? 'text-[#1BBF99]/70' : 'text-[#ED5363]/70'}`}>
                    {pnlPos ? '+' : ''}{returnPct.toFixed(2)}% return
                  </div>
                </div>
                <WinRateDonut winRate={d.win_rate} wins={d.win_count} losses={d.loss_count} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-[#1E2D3D]/30 overflow-x-auto">
          {[
            { key: 'overview' as const, label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
            { key: 'trades' as const, label: 'Trades', icon: <Activity className="w-4 h-4" /> },
            { key: 'analytics' as const, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#3AB3FF] text-[#E4EEF5]'
                  : 'border-transparent text-[#85A8C3] hover:text-[#E4EEF5]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <Metric label="Net P&L" value={`${pnlPos ? '+' : ''}${fmt(d.net_pnl, d.currency)}`} color={pnlColor(d.net_pnl)} icon={<TrendingUp className="w-3 h-3" />} />
              <Metric label="Win Rate" value={`${d.win_rate.toFixed(1)}%`} color={d.win_rate >= 50 ? '#1BBF99' : '#ED5363'} icon={<Target className="w-3 h-3" />} />
              <Metric label="Profit Factor" value={d.profit_factor.toFixed(2)} icon={<BarChart3 className="w-3 h-3" />} />
              <Metric label="Expectancy" value={fmt(d.expectancy, d.currency)} color={pnlColor(d.expectancy)} icon={<Zap className="w-3 h-3" />} />
              <Metric label="Sharpe" value={d.sharpe_ratio.toFixed(2)} icon={<LineChartIcon className="w-3 h-3" />} />
              <Metric label="Avg R:R" value={d.avg_rr.toFixed(2)} icon={<Activity className="w-3 h-3" />} />
              <Metric label="Total Trades" value={d.total_trades.toLocaleString()} icon={<Hash className="w-3 h-3" />} />
              <Metric label="Trading Days" value={String(d.trading_days)} icon={<CalendarIcon className="w-3 h-3" />} />
            </div>

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
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={filteredEquity}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3AB3FF" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3AB3FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" strokeOpacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={{ stroke: '#1E2D3D' }} tickLine={false} minTickGap={40} />
                    <YAxis tick={{ fill: '#85A8C3', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<EquityTooltip />} />
                    <ReferenceLine y={d.account_size} stroke="#85A8C3" strokeDasharray="4 4" strokeOpacity={0.2} />
                    <Area type="monotone" dataKey="balance" stroke="#3AB3FF" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>
            )}

            {/* Calendar + Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Section title="Calendar" icon={<CalendarIcon className="w-4 h-4" />} className="lg:col-span-2">
                <CalendarHeatmap data={d.calendar_data} />
              </Section>
              <div className="space-y-3">
                <Section title="Streaks" icon={<Flame className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Best Win Streak</span>
                      <span className="text-sm font-bold text-[#1BBF99]">{d.win_streak} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Worst Loss Streak</span>
                      <span className="text-sm font-bold text-[#ED5363]">{d.loss_streak} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Winning Days</span>
                      <span className="text-sm font-bold text-[#E4EEF5]">{d.winning_days} / {d.trading_days}</span>
                    </div>
                  </div>
                </Section>
                <Section title="Extremes" icon={<Trophy className="w-4 h-4" />}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Best Day</span>
                      <span className="text-sm font-bold text-[#1BBF99]">{fmt(d.best_day_pnl, d.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Worst Day</span>
                      <span className="text-sm font-bold text-[#ED5363]">{fmt(d.worst_day_pnl, d.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Largest Win</span>
                      <span className="text-sm font-bold text-[#1BBF99]">{fmt(d.largest_win, d.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Largest Loss</span>
                      <span className="text-sm font-bold text-[#ED5363]">{fmt(d.largest_loss, d.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Avg Win</span>
                      <span className="text-sm font-bold text-[#E4EEF5]">{fmt(d.avg_win, d.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#85A8C3]">Avg Loss</span>
                      <span className="text-sm font-bold text-[#E4EEF5]">{fmt(d.avg_loss, d.currency)}</span>
                    </div>
                  </div>
                </Section>
              </div>
            </div>

            {/* Symbol Performance */}
            {d.symbol_performance.length > 0 && (
              <Section title="Symbol Performance" icon={<BarChart3 className="w-4 h-4" />}>
                <SymbolTable symbols={d.symbol_performance} currency={d.currency} />
              </Section>
            )}
          </div>
        )}

        {/* ─── TRADES TAB ────────────────────────────────────────── */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            <Section title={`Recent Trades (${d.recent_trades.length})`} icon={<Activity className="w-4 h-4" />}>
              <TradesTable trades={d.recent_trades} currency={d.currency} />
            </Section>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="P&L Distribution" icon={<BarChart3 className="w-4 h-4" />}>
                <DistributionChart data={d.distribution} />
              </Section>
              <Section title="Holding Time Analysis" icon={<Clock className="w-4 h-4" />}>
                <HoldingTimeChart data={d.holding_time} />
              </Section>
            </div>
            <Section title="Trading Time Heatmap" icon={<LayoutGrid className="w-4 h-4" />}>
              <TimeHeatmap data={d.time_heatmap} />
              <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-[#85A8C3]/50">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#1BBF99]/40" /> Profitable</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#ED5363]/40" /> Unprofitable</div>
                <span>Intensity = trade volume</span>
              </div>
            </Section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2D3D]/20 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center gap-2 text-xs text-[#85A8C3]/40">
          <span>Powered by</span>
          <a href="https://we-fund.com" target="_blank" rel="noopener noreferrer" className="text-[#3AB3FF]/60 hover:text-[#3AB3FF] transition-colors font-medium">WeFund</a>
        </div>
      </footer>
    </div>
  );
};

export default SharedJournalPage;
