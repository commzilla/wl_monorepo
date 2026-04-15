import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { affiliateManagerService } from '@/services/affiliateManagerService';
import { Users } from 'lucide-react';

interface AffiliateManagerReferralsProps {
  userId: string;
}

export const AffiliateManagerReferrals: React.FC<AffiliateManagerReferralsProps> = ({ userId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-manager-referrals', userId],
    queryFn: () => affiliateManagerService.getReferrals(userId),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Referrals ({data?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No referrals found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((referral: any) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{referral.referred_user_name}</p>
                        <p className="text-sm text-muted-foreground">{referral.referred_user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{referral.challenge_name || 'N/A'}</TableCell>
                    <TableCell className="font-medium">
                      ${parseFloat(referral.commission_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(referral.commission_status)}>
                        {referral.commission_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(referral.date_referred).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {referral.note || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
