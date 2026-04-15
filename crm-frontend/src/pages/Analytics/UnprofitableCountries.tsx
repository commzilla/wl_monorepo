import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/layout/PageHeader";
import { AlertTriangle, DollarSign, TrendingDown, Globe } from "lucide-react";
import { unprofitableCountryAnalyticsService } from "@/services/unprofitableCountryAnalyticsService";
import { UnprofitableCountryAnalytics } from "@/lib/types/unprofitableCountryAnalytics";
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

const UnprofitableCountries = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["unprofitableCountries"],
    queryFn: unprofitableCountryAnalyticsService.getUnprofitableCountries,
    retry: 1,
  });

  if (error) {
    toast.error("Failed to load unprofitable countries analytics");
  }

  const calculateTotals = (data: UnprofitableCountryAnalytics[]) => {
    return data.reduce(
      (acc, item) => ({
        totalRevenue: acc.totalRevenue + parseFloat(item.total_revenue),
        totalPayouts: acc.totalPayouts + parseFloat(item.total_payouts),
        totalLoss: acc.totalLoss + parseFloat(item.total_loss),
        totalFundedAccounts: acc.totalFundedAccounts + item.funded_accounts_count,
      }),
      { totalRevenue: 0, totalPayouts: 0, totalLoss: 0, totalFundedAccounts: 0 }
    );
  };

  const totals = data ? calculateTotals(data) : null;

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title="Unprofitable Countries"
        subtitle="Countries where payouts exceed revenue"
      />

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : totals ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loss</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-destructive">
                {formatCurrency(totals.totalLoss)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {data?.length || 0} countries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {formatCurrency(totals.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From unprofitable countries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {formatCurrency(totals.totalPayouts)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exceeding revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funded Accounts</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {totals.totalFundedAccounts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In unprofitable regions
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Country Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Payouts</TableHead>
                  <TableHead className="text-right">Loss</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead className="text-right">Payout Count</TableHead>
                  <TableHead className="text-right">Funded Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data
                  .sort((a, b) => parseFloat(b.total_loss) - parseFloat(a.total_loss))
                  .map((item, index) => (
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
                      <TableCell className="text-right text-destructive font-semibold">
                        {formatCurrency(item.total_loss)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatPercentage(item.profit_margin_percentage)}
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No unprofitable countries found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnprofitableCountries;
