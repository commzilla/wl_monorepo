import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Award, Users } from "lucide-react";
import { challengePayoutAnalyticsService } from "@/services/challengePayoutAnalyticsService";

const ChallengeWisePayouts = () => {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['challenge-wise-payouts'],
    queryFn: () => challengePayoutAnalyticsService.getChallengeWisePayouts(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${numValue.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Error loading analytics: {error.message}</p>
      </div>
    );
  }

  // Calculate totals
  const totals = analytics?.reduce(
    (acc, item) => ({
      revenue: acc.revenue + parseFloat(item.total_revenue),
      payouts: acc.payouts + parseFloat(item.total_payouts),
      profit: acc.profit + parseFloat(item.profit_margin_value),
      payoutCount: acc.payoutCount + item.payout_count,
      fundedAccounts: acc.fundedAccounts + item.funded_accounts_count,
      enrollments: acc.enrollments + item.total_enrollments,
    }),
    { revenue: 0, payouts: 0, profit: 0, payoutCount: 0, fundedAccounts: 0, enrollments: 0 }
  );

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title="Challenge Wise Payouts"
        subtitle="Revenue, payouts, and profit analysis by challenge"
      />

      {totals && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totals.revenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totals.payouts)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.payoutCount} payouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totals.profit)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPercentage((totals.profit / totals.revenue) * 100)} margin
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funded Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{totals.fundedAccounts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                of {totals.enrollments} enrollments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Challenge Breakdown</CardTitle>
          <CardDescription>
            Detailed analytics for each challenge type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challenge</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Payouts</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Payout Count</TableHead>
                  <TableHead className="text-right">Payout %</TableHead>
                  <TableHead className="text-right">Funded</TableHead>
                  <TableHead className="text-right">Total Enrollments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.map((item) => (
                  <TableRow key={item.challenge_id}>
                    <TableCell className="font-medium">{item.challenge_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(item.total_revenue))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parseFloat(item.total_payouts))}</TableCell>
                    <TableCell className="text-right">
                      <span className={parseFloat(item.profit_margin_value) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(parseFloat(item.profit_margin_value))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={parseFloat(item.profit_margin_percentage) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPercentage(item.profit_margin_percentage)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{item.payout_count}</TableCell>
                    <TableCell className="text-right">{formatPercentage(item.payout_percentage)}</TableCell>
                    <TableCell className="text-right">{item.funded_accounts_count}</TableCell>
                    <TableCell className="text-right">{item.total_enrollments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChallengeWisePayouts;
