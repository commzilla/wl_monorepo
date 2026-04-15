
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BreachDetection } from '@/lib/types/risk';
import BreachBadge from './BreachBadge';

interface BreachDetectionTableProps {
  breaches: BreachDetection[];
}

const BreachDetectionTable = ({ breaches }: BreachDetectionTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' ? 'destructive' : 
                   status === 'investigating' ? 'warning' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Risk Score</TableHead>
            <TableHead>Value/Threshold</TableHead>
            <TableHead>Detected</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breaches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                No breaches detected
              </TableCell>
            </TableRow>
          ) : (
            breaches.map((breach) => (
              <TableRow key={breach.id}>
                <TableCell>
                  <BreachBadge severity={breach.severity} category={breach.category} />
                </TableCell>
                <TableCell>
                  <Badge variant={breach.severity === 'hard' ? 'destructive' : 'warning'}>
                    {breach.severity.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{breach.title}</p>
                    <p className="text-sm text-muted-foreground">{breach.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      breach.riskScore >= 70 ? 'text-red-600' : 
                      breach.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {breach.riskScore}
                    </span>
                    <span className="text-muted-foreground text-sm">/100</span>
                  </div>
                </TableCell>
                <TableCell>
                  {breach.value && breach.threshold ? (
                    <div className="text-sm">
                      <div>{formatCurrency(breach.value)} / {formatCurrency(breach.threshold)}</div>
                      <div className="text-muted-foreground">
                        {((breach.value / breach.threshold) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ) : breach.value ? (
                    <div className="text-sm">{breach.value}</div>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {breach.detectedAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {getStatusBadge(breach.status)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BreachDetectionTable;
