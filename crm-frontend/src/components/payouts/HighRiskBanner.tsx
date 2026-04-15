import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HighRiskBannerProps {
  onViewNotes: () => void;
}

const HighRiskBanner: React.FC<HighRiskBannerProps> = ({ onViewNotes }) => {
  return (
    <div className="mt-3 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-semibold">ACTIVE RISK FLAG</span>
      <span className="text-sm">— This payout has high-risk notes requiring attention.</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewNotes}
        className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
      >
        View Notes
      </Button>
    </div>
  );
};

export default HighRiskBanner;