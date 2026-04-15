import { useState, useEffect } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, DollarSign, TrendingUp, Users } from "lucide-react";
import { countryPayoutAnalyticsService } from "@/services/countryPayoutAnalyticsService";
import { CountryPayoutAnalytics } from "@/lib/types/countryPayoutAnalytics";
import { toast } from "sonner";
import { getCountryName } from "@/lib/utils/countryUtils";

const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

const formatPercentage = (value: string | number): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return `${numValue.toFixed(2)}%`;
};

export default function CountryWisePayouts() {
  const [analytics, setAnalytics] = useState<CountryPayoutAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await countryPayoutAnalyticsService.getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to fetch country payout analytics:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const totals = analytics.reduce(
    (acc, item) => ({
      revenue: acc.revenue + parseFloat(item.total_revenue),
      payouts: acc.payouts + parseFloat(item.total_payouts),
      profit: acc.profit + parseFloat(item.profit_margin_value),
      payoutCount: acc.payoutCount + item.payout_count,
      fundedAccounts: acc.fundedAccounts + item.funded_accounts_count,
    }),
    { revenue: 0, payouts: 0, profit: 0, payoutCount: 0, fundedAccounts: 0 }
  );

  const avgProfitPercentage =
    totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title="Country Wise Payouts"
        subtitle="Analytics breakdown by country"
      />

        {loading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
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
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
                  <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totals.profit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercentage(avgProfitPercentage)}
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
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Country Breakdown</CardTitle>
                <CardDescription>
                  Detailed analytics by country
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Payouts</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Profit %</TableHead>
                      <TableHead className="text-right">Avg Payout</TableHead>
                      <TableHead className="text-right">Payout Count</TableHead>
                      <TableHead className="text-right">Funded Accounts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {getCountryName(item.country)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total_payouts)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.profit_margin_value)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            parseFloat(item.profit_margin_percentage) < 0
                              ? "text-destructive"
                              : "text-green-600"
                          }`}
                        >
                          {formatPercentage(item.profit_margin_percentage)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.average_payout_value)}
                        </TableCell>
                        <TableCell className="text-right">{item.payout_count}</TableCell>
                        <TableCell className="text-right">
                          {item.funded_accounts_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}
