import React from 'react';

// Purple-violet palette matching the new light lavender design
export const NEON_COLORS = {
  cyan:   { start: '#8b5cf6', end: '#6d28d9' },   // primary purple (renamed slot, keep key)
  purple: { start: '#a78bfa', end: '#7c3aed' },   // violet
  green:  { start: '#34d399', end: '#059669' },   // green (keep for positive metrics)
  pink:   { start: '#f472b6', end: '#db2777' },   // pink/rose
  amber:  { start: '#fbbf24', end: '#d97706' },   // amber (keep for warnings)
  blue:   { start: '#60a5fa', end: '#2563eb' },   // blue (keep for variety)
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
  { id: 'neonCyan',   ...NEON_COLORS.cyan },
  { id: 'neonPurple', ...NEON_COLORS.purple },
  { id: 'neonGreen',  ...NEON_COLORS.green },
  { id: 'neonPink',   ...NEON_COLORS.pink },
  { id: 'neonAmber',  ...NEON_COLORS.amber },
  { id: 'neonBlue',   ...NEON_COLORS.blue },
];

const HORIZONTAL_GRADIENTS = GRADIENTS.map((g) => ({ ...g, id: `${g.id}H` }));

export const chartGradientDefs = () => (
  <defs>
    {GRADIENTS.map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={g.start} stopOpacity={1} />
        <stop offset="100%" stopColor={g.end}   stopOpacity={0.7} />
      </linearGradient>
    ))}
    {HORIZONTAL_GRADIENTS.map((g) => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor={g.end}   stopOpacity={0.7} />
        <stop offset="100%" stopColor={g.start} stopOpacity={1} />
      </linearGradient>
    ))}
  </defs>
);

export const getGradientFill = (index: number, horizontal = false): string => {
  const suffix = horizontal ? 'H' : '';
  return `url(#${GRADIENTS[index % GRADIENTS.length].id}${suffix})`;
};

export const getColor = (index: number): string => {
  return GRADIENTS[index % GRADIENTS.length].start;
};

// Clean, light tooltip that fits the new design
export const FuturisticTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2.5 shadow-lg text-xs">
      <p className="text-muted-foreground font-medium mb-1.5">{label || payload[0]?.name}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color || getColor(index) }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: 'hsl(240 10% 55%)',
  fontFamily: 'inherit',
};

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: 'hsl(250 25% 90%)',
  strokeWidth: 1,
} as const;

export const AXIS_LINE_STYLE = {
  stroke: 'hsl(250 25% 90%)',
  strokeWidth: 1,
};
