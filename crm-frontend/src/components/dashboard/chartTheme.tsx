import React from 'react';

// Futuristic neon gradient color palette
export const NEON_COLORS = {
  cyan: { start: '#00d4ff', end: '#0070ff' },
  purple: { start: '#a855f7', end: '#6d28d9' },
  green: { start: '#00ff88', end: '#10b981' },
  pink: { start: '#ff3d8f', end: '#e11d48' },
  amber: { start: '#fbbf24', end: '#f59e0b' },
  blue: { start: '#3b82f6', end: '#1d4ed8' },
} as const;

export const GRADIENT_IDS = [
  'neonCyan',
  'neonPurple',
  'neonGreen',
  'neonPink',
  'neonAmber',
  'neonBlue',
] as const;

const GRADIENTS: { id: string; start: string; end: string }[] = [
  { id: 'neonCyan', ...NEON_COLORS.cyan },
  { id: 'neonPurple', ...NEON_COLORS.purple },
  { id: 'neonGreen', ...NEON_COLORS.green },
  { id: 'neonPink', ...NEON_COLORS.pink },
  { id: 'neonAmber', ...NEON_COLORS.amber },
  { id: 'neonBlue', ...NEON_COLORS.blue },
];

// Horizontal gradients for horizontal bar charts
const HORIZONTAL_GRADIENTS = GRADIENTS.map((g) => ({
  ...g,
  id: `${g.id}H`,
}));

/**
 * Returns raw SVG <defs> with all gradient definitions.
 * Must be called as a function {chartGradientDefs()} inside recharts charts,
 * NOT rendered as a component <ChartGradientDefs />.
 * Recharts only passes through native SVG elements (type must be a string like 'defs'),
 * not React components (type would be a function), so the component form is silently dropped.
 */
export const chartGradientDefs = () => (
  <defs>
    {GRADIENTS.map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={g.start} stopOpacity={1} />
        <stop offset="100%" stopColor={g.end} stopOpacity={0.8} />
      </linearGradient>
    ))}
    {HORIZONTAL_GRADIENTS.map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={g.end} stopOpacity={0.8} />
        <stop offset="100%" stopColor={g.start} stopOpacity={1} />
      </linearGradient>
    ))}
    <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/**
 * Returns the gradient fill URL for a given index.
 */
export const getGradientFill = (index: number, horizontal = false): string => {
  const suffix = horizontal ? 'H' : '';
  const ids = GRADIENTS.map((g) => g.id);
  return `url(#${ids[index % ids.length]}${suffix})`;
};

/**
 * Returns the primary (start) color for a given index — useful for legends/tooltips.
 */
export const getColor = (index: number): string => {
  return GRADIENTS[index % GRADIENTS.length].start;
};

/**
 * Futuristic glassmorphic tooltip.
 */
export const FuturisticTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="relative px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl"
      style={{
        background: 'rgba(10, 15, 30, 0.85)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.6), transparent)',
        }}
      />
      <p className="text-xs font-semibold text-cyan-300 mb-2 tracking-wide uppercase">
        {label || payload[0]?.name}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm py-0.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: entry.color || getColor(index),
              boxShadow: `0 0 6px ${entry.color || getColor(index)}`,
            }}
          />
          <span className="text-gray-400 text-xs">{entry.name}:</span>
          <span className="text-white font-medium text-xs">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Common axis tick style.
 */
export const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: 'rgba(148, 163, 184, 0.7)',
  fontFamily: 'inherit',
};

/**
 * Common grid style props.
 */
export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'rgba(148, 163, 184, 0.08)',
  strokeWidth: 1,
} as const;

/**
 * Axis line style.
 */
export const AXIS_LINE_STYLE = {
  stroke: 'rgba(148, 163, 184, 0.15)',
  strokeWidth: 1,
};
