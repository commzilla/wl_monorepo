import React from 'react';
import { X } from 'lucide-react';

interface TradeTagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
}

const TradeTagBadge: React.FC<TradeTagBadgeProps> = ({ name, color, onRemove }) => {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span className="max-w-[120px] truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/10"
          aria-label={`Remove ${name} tag`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default TradeTagBadge;
