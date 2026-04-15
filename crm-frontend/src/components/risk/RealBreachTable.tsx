import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { SoftBreach, HardBreach } from '@/lib/types/djangoRisk';
import { RiskService } from '@/services/riskService';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Eye, Undo2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { HardBreachDetailsDialog } from './HardBreachDetailsDialog';
import { HardBreachEvidenceDialog } from './HardBreachEvidenceDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SoftBreachTableProps {
  breaches: SoftBreach[];
}

interface HardBreachTableProps {
  breaches: HardBreach[];
  onBreachReverted?: () => void;
}

interface RevertedBreachTableProps {
  breaches: HardBreach[];
}

const formatCurrency = (amount: number | null): string => {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const extractAccountId = (reason: string): string | null => {
  const match = reason.match(/Account ID:\s*(\d+)/);
  return match ? match[1] : null;
};

const getSeverityBadge = (severity: string) => {
  const variant = severity === 'high' ? 'destructive' : 
                 severity === 'medium' ? 'warning' : 'secondary';
  
  return <Badge variant={variant}>{severity.toUpperCase()}</Badge>;
};

const getStatusBadge = (resolved: boolean) => {
  if (resolved) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Resolved
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
      <XCircle className="w-3 h-3 mr-1" />
      Active
    </Badge>
  );
};

export const SoftBreachTable: React.FC<SoftBreachTableProps> = ({ breaches }) => {
  const navigate = useNavigate();

  const handleReviewProfile = (userId: string) => {
    navigate(`/traders/${userId}/review`);
  };

  if (breaches.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Soft Breaches</h3>
        <p className="text-muted-foreground">All accounts are operating within soft limits.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Detected At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breaches.map((breach) => (
            <TableRow key={breach.id}>
              <TableCell className="font-mono">{breach.account_id}</TableCell>
              <TableCell className="font-medium">{breach.user_name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{breach.rule.replace(/_/g, ' ')}</span>
                </div>
              </TableCell>
              <TableCell>{getSeverityBadge(breach.severity)}</TableCell>
              <TableCell>{formatCurrency(breach.value)}</TableCell>
              <TableCell>{getStatusBadge(breach.resolved)}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(breach.detected_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewProfile(breach.user_id)}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Review Profile
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const HardBreachTable: React.FC<HardBreachTableProps> = ({ breaches, onBreachReverted }) => {
  const navigate = useNavigate();
  const [selectedBreach, setSelectedBreach] = useState<HardBreach | null>(null);
  const [selectedEvidenceBreach, setSelectedEvidenceBreach] = useState<HardBreach | null>(null);
  const [revertingBreachId, setRevertingBreachId] = useState<number | null>(null);
  const [selectedBreaches, setSelectedBreaches] = useState<number[]>([]);
  const [isBulkReverting, setIsBulkReverting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const handleReviewProfile = (userId: string) => {
    navigate(`/traders/${userId}/review`);
  };

  const toNumericId = (id: number | string): number | null => {
    if (typeof id === 'number') return id;
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleViewDetails = (breach: HardBreach) => {
    setSelectedBreach(breach);
  };

  const handleRevertBreach = async (breach: HardBreach) => {
    const numericId = toNumericId(breach.id);
    if (numericId === null) {
      toast({
        title: "Not Supported",
        description: "This breach record cannot be reverted from this screen.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRevertingBreachId(numericId);
      
      const result = await RiskService.revertBreach(numericId);
      
      toast({
        title: "Success",
        description: `Breach reverted successfully. Enrollment ${result.enrollment_id} is now ${result.new_status}`,
        variant: "default",
      });

      // Call the callback to refresh data
      onBreachReverted?.();
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to revert breach",
        variant: "destructive",
      });
    } finally {
      setRevertingBreachId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const nonRevertedBreaches = breaches
        .filter((b) => !isBreachReverted(b))
        .map((b) => toNumericId(b.id))
        .filter((id): id is number => id !== null);
      setSelectedBreaches(nonRevertedBreaches);
    } else {
      setSelectedBreaches([]);
    }
  };

  const handleSelectBreach = (breachId: number, checked: boolean) => {
    if (checked) {
      setSelectedBreaches(prev => [...prev, breachId]);
    } else {
      setSelectedBreaches(prev => prev.filter(id => id !== breachId));
    }
  };

  const isBreachReverted = (breach: HardBreach): boolean => {
    return breach.reverted || breach.rule.toLowerCase().includes('breach reverted');
  };

  const handleBulkRevert = async () => {
    setShowBulkConfirm(false);
    setIsBulkReverting(true);
    try {
      const result = await RiskService.bulkRevertBreaches(selectedBreaches);
      
      if (result.success_count > 0) {
        toast({
          title: "Success",
          description: `Successfully reverted ${result.success_count} breach(es)`,
          variant: "default",
        });
      }
      
      if (result.failed_count > 0) {
        const failedDetails = result.failed.map(f => `Breach ${f.breach_id}: ${f.error}`).join('\n');
        toast({
          title: "Partial Failure",
          description: `Failed to revert ${result.failed_count} breach(es). ${failedDetails}`,
          variant: "destructive",
        });
      }
      
      setSelectedBreaches([]);
      onBreachReverted?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to bulk revert breaches",
        variant: "destructive",
      });
    } finally {
      setIsBulkReverting(false);
    }
  };

  const nonRevertedBreaches = breaches.filter((b) => !isBreachReverted(b) && toNumericId(b.id) !== null);
  const allSelected = nonRevertedBreaches.length > 0 && selectedBreaches.length === nonRevertedBreaches.length;
  const someSelected = selectedBreaches.length > 0 && selectedBreaches.length < nonRevertedBreaches.length;

  if (breaches.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Hard Breaches</h3>
        <p className="text-muted-foreground">No accounts have violated hard limits.</p>
      </div>
    );
  }

  return (
    <>
      {selectedBreaches.length > 0 && (
        <div className="mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm font-medium">
              {selectedBreaches.length} breach(es) selected
            </span>
          </div>
          <div className="flex-1" />
          <Button
            onClick={() => setShowBulkConfirm(true)}
            disabled={isBulkReverting}
            variant="default"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isBulkReverting ? 'Reverting...' : 'Bulk Revert'}
          </Button>
          <Button
            onClick={() => setSelectedBreaches([])}
            variant="outline"
            size="sm"
          >
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Breached At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breaches.map((breach) => {
              const numericId = toNumericId(breach.id);
              const isSelected = numericId !== null && selectedBreaches.includes(numericId);
              const canRevert = numericId !== null;
              return (
              <TableRow key={breach.id}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => numericId !== null && handleSelectBreach(numericId, checked as boolean)}
                    disabled={isBreachReverted(breach) || !canRevert}
                    aria-label={`Select breach ${breach.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <Badge variant="destructive" className="capitalize">
                      {breach.rule.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </TableCell>
              <TableCell className="max-w-md">
                <p className="text-sm text-muted-foreground truncate" title={breach.reason}>
                  {breach.reason}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(breach.breached_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
               <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(breach)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvidenceBreach(breach)}
                    disabled={!breach.evidence}
                    className="flex items-center gap-1"
                  >
                    Evidence
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => breach.user_id && handleReviewProfile(breach.user_id)}
                    disabled={!breach.user_id}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Profile
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleRevertBreach(breach)}
                    disabled={!canRevert || isBreachReverted(breach) || (numericId !== null && revertingBreachId === numericId)}
                    className="flex items-center gap-1"
                  >
                    <Undo2 className="h-3 w-3" />
                    {(numericId !== null && revertingBreachId === numericId) ? 'Reverting...' : isBreachReverted(breach) ? 'Reverted' : 'Revert'}
                  </Button>
                </div>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>

        <HardBreachDetailsDialog
          breach={selectedBreach}
          open={!!selectedBreach}
          onOpenChange={() => setSelectedBreach(null)}
        />

        <HardBreachEvidenceDialog
          breach={selectedEvidenceBreach}
          open={!!selectedEvidenceBreach}
          onOpenChange={() => setSelectedEvidenceBreach(null)}
        />
      </div>

      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Revert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert {selectedBreaches.length} breach(es)? 
              This will reactivate the associated accounts and restore their previous states.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRevert}>
              Revert All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const RevertedBreachTable: React.FC<RevertedBreachTableProps> = ({ breaches }) => {
  const navigate = useNavigate();
  const [selectedBreach, setSelectedBreach] = useState<HardBreach | null>(null);
  const [selectedEvidenceBreach, setSelectedEvidenceBreach] = useState<HardBreach | null>(null);

  const handleReviewProfile = (userId: string) => {
    navigate(`/traders/${userId}/review`);
  };

  const handleViewDetails = (breach: HardBreach) => {
    setSelectedBreach(breach);
  };

  if (breaches.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Reverted Breach Logs</h3>
        <p className="text-muted-foreground">No breach reversions have been recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Account ID</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Reverted At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breaches.map((breach) => (
            <TableRow key={breach.id}>
              <TableCell className="font-medium">{breach.user_name}</TableCell>
              <TableCell className="font-mono">
                {breach.account_id || extractAccountId(breach.reason) || 'N/A'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-green-500" />
                  <Badge variant="outline" className="capitalize text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:border-green-700 dark:bg-green-950">
                    {breach.rule.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="max-w-md">
                <p className="text-sm text-muted-foreground truncate" title={breach.reason}>
                  {breach.reason}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(breach.breached_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(breach)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvidenceBreach(breach)}
                    disabled={!breach.evidence}
                    className="flex items-center gap-1"
                  >
                    Evidence
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => breach.user_id && handleReviewProfile(breach.user_id)}
                    disabled={!breach.user_id}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Profile
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <HardBreachDetailsDialog
        breach={selectedBreach}
        open={!!selectedBreach}
        onOpenChange={() => setSelectedBreach(null)}
      />

      <HardBreachEvidenceDialog
        breach={selectedEvidenceBreach}
        open={!!selectedEvidenceBreach}
        onOpenChange={() => setSelectedEvidenceBreach(null)}
      />
    </div>
  );
};
