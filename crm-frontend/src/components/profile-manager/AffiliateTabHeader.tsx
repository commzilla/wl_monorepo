import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  X,
  Tag,
  Award,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AffiliateTabHeaderProps {
  isApproved: boolean;
  referralCode?: string;
  userName: string;
  onApprove: () => void;
  onDisapprove: () => void;
  onAssignReferralCode: () => void;
  onAssignTier: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyReferralUrl: (code: string) => void;
}

export default function AffiliateTabHeader({
  isApproved,
  referralCode,
  userName,
  onApprove,
  onDisapprove,
  onAssignReferralCode,
  onAssignTier,
  onEdit,
  onDelete,
  onCopyReferralUrl,
}: AffiliateTabHeaderProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-5">
        {/* Left: Icon-in-box + Title + Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Affiliate Profile</h3>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 h-5 border ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {isApproved ? 'Approved' : 'Pending'}
              </Badge>
            </div>
            {referralCode ? (
              <button
                onClick={() => onCopyReferralUrl(referralCode)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono mt-0.5 group"
              >
                <span className="bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 group-hover:border-primary/30 transition-colors flex items-center gap-1.5">
                  <Copy className="h-3 w-3" />
                  {referralCode}
                </span>
              </button>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">No referral code assigned</p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isApproved ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onApprove}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 rounded-lg border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={onDisapprove}
            >
              <X className="h-3.5 w-3.5" />
              Disapprove
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 rounded-lg"
            onClick={onEdit}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={onAssignReferralCode} className="gap-2 text-xs">
                <Tag className="h-3.5 w-3.5" />
                Assign Referral Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAssignTier} className="gap-2 text-xs">
                <Award className="h-3.5 w-3.5" />
                Assign Tier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
