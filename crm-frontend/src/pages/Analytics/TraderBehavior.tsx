import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { traderBehaviorService } from "@/services/traderBehaviorService";
import { TraderBehaviorFilters } from "@/lib/types/traderBehavior";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  success: "hsl(var(--chart-3))",
  accent: "hsl(var(--chart-4))",
  warning: "hsl(var(--chart-5))",
};

export default function TraderBehavior() {
  const [filters, setFilters] = useState<TraderBehaviorFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ["traderBehavior", filters],
    queryFn: () => traderBehaviorService.getTraderBehaviorAnalytics(filters),
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleFilterChange = (key: keyof TraderBehaviorFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-6 p-3 sm:p-6">
        <PageHeader
          title="Trader Behavior Analytics"
          subtitle="Analyze trader behavior patterns and trading styles"
        />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const summary = data?.summary;
  const behavior = data?.behavior;
  const topProfitSymbols = data?.top_profitable_symbols || [];
  const topLossSymbols = data?.top_loss_symbols || [];

  // Trading style distribution data
  const styleData = behavior?.style_distribution
    ? [
        { name: "Scalping", value: behavior.style_distribution.scalping_trades_pct },
        { name: "Intraday", value: behavior.style_distribution.intraday_trades_pct },
        { name: "Swing", value: behavior.style_distribution.swing_trades_pct },
      ]
    : [];

  // Win/Loss rate data
  const winLossData = summary
    ? [
        { name: "Win Rate", value: summary.win_rate_pct, fill: CHART_COLORS.success },
        { name: "Loss Rate", value: summary.loss_rate_pct, fill: CHART_COLORS.warning },
      ]
    : [];

  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-6">
      <PageHeader
        title="Trader Behavior Analytics"
        subtitle="Analyze trader behavior patterns and trading styles"
      />

      {/* Filters */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label>Program</Label>
              <Input
                placeholder="Filter by program"
                value={filters.program || ""}
                onChange={(e) => handleFilterChange("program", e.target.value)}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                placeholder="Filter by country"
                value={filters.country || ""}
                onChange={(e) => handleFilterChange("country", e.target.value)}
              />
            </div>
            <div>
              <Label>Account Size</Label>
              <Input
                placeholder="Filter by size"
                value={filters.account_size || ""}
                onChange={(e) => handleFilterChange("account_size", e.target.value)}
              />
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.from_date || ""}
                onChange={(e) => handleFilterChange("from_date", e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.to_date || ""}
                onChange={(e) => handleFilterChange("to_date", e.target.value)}
              />
            </div>
            <div>
              <Label>Trade From</Label>
              <Input
                type="date"
                value={filters.trade_from || ""}
                onChange={(e) => handleFilterChange("trade_from", e.target.value)}
              />
            </div>
            <div>
              <Label>Trade To</Label>
              <Input
                type="date"
                value={filters.trade_to || ""}
                onChange={(e) => handleFilterChange("trade_to", e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={clearFilters} variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{summary?.total_trades.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{summary?.total_accounts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{summary?.total_traders.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{formatCurrency(summary?.net_profit || "0")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{summary?.win_rate_pct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Loss Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{summary?.loss_rate_pct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Trade Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{summary?.avg_trade_duration_human}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Trading Style Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Trading Style Distribution</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <PieChart>
                <Pie
                  data={styleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill={CHART_COLORS.primary}
                  dataKey="value"
                >
                  {styleData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.accent][index]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win/Loss Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Win vs Loss Rate</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Behavior Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Behavior Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <p className="text-sm text-muted-foreground">SL Usage</p>
              <p className="text-xl font-bold">{behavior?.sl_usage_pct}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TP Usage</p>
              <p className="text-xl font-bold">{behavior?.tp_usage_pct}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">EA Usage</p>
              <p className="text-xl font-bold">{behavior?.ea_usage_pct}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Trades/Account</p>
              <p className="text-xl font-bold">{behavior?.avg_trades_per_account}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Volume</p>
              <p className="text-xl font-bold">{behavior?.avg_volume.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Symbol Concentration (Top 3)</p>
              <p className="text-xl font-bold">{behavior?.symbol_concentration_top3_pct}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Profitable Symbols */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Top Profitable Symbols</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={400}>
            <BarChart data={topProfitSymbols.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="net_profit" fill={CHART_COLORS.success} name="Net Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Loss Symbols */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Top Loss Symbols</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={400}>
            <BarChart data={topLossSymbols.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="net_profit" fill={CHART_COLORS.warning} name="Net Loss" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
