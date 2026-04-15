import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Users, TrendingUp, AlertTriangle, Trophy } from "lucide-react";
import { traderJourneyService } from "@/services/traderJourneyService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const TraderJourney = () => {
  const [filters, setFilters] = useState({
    program: "",
    country: "",
    account_size: "",
    quick_date: "",
    from_date: "",
    to_date: "",
    trade_from: "",
    trade_to: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trader-journey", filters],
    queryFn: () => traderJourneyService.getAnalytics(filters),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overview = data?.overview;
  const conversions = data?.conversions;
  const breaches = data?.breaches;

  // Funnel data for visualization
  const funnelData = overview
    ? [
        { stage: "Orders", count: overview.orders, color: "hsl(var(--chart-1))" },
        { stage: "Starts", count: overview.starts, color: "hsl(var(--chart-2))" },
        { stage: "Phase 1 Pass", count: overview.phase1_pass, color: "hsl(var(--chart-3))" },
        { stage: "Phase 2 Pass", count: overview.phase2_pass, color: "hsl(var(--chart-4))" },
        { stage: "Live", count: overview.live, color: "hsl(var(--chart-5))" },
        { stage: "Payout", count: overview.payout_accounts, color: "hsl(var(--primary))" },
      ]
    : [];

  // Conversion rates data
  const conversionData = conversions
    ? [
        { stage: "Buy → Start", rate: conversions.buy_to_start_pct },
        { stage: "Start → Phase 1", rate: conversions.start_to_phase1_pct },
        { stage: "Phase 1 → Phase 2", rate: conversions.phase1_to_phase2_pct },
        { stage: "Phase 2 → Live", rate: conversions.phase2_to_live_pct },
        { stage: "Live → Payout", rate: conversions.live_to_payout_pct },
      ]
    : [];

  // Breach by rule data
  const breachRuleData = breaches
    ? [
        { rule: "Max Daily Loss", count: breaches.by_rule.max_daily_loss },
        { rule: "Max Total Loss", count: breaches.by_rule.max_total_loss },
        { rule: "Inactivity", count: breaches.by_rule.Inactivity },
      ]
    : [];

  // Breach by phase data
  const breachPhaseData = breaches
    ? [
        { phase: "Phase 1", count: breaches.by_phase.phase_1_in_progress },
        { phase: "Phase 2", count: breaches.by_phase.phase_2_in_progress },
        { phase: "Live", count: breaches.by_phase.live_in_progress },
      ]
    : [];

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Trader Journey Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track trader progression from purchase to payout</p>
        </div>
      </div>

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
                placeholder="Program name"
                value={filters.program}
                onChange={(e) => handleFilterChange("program", e.target.value)}
              />
            </div>

            <div>
              <Label>Country</Label>
              <Input
                placeholder="Country code"
                value={filters.country}
                onChange={(e) => handleFilterChange("country", e.target.value)}
              />
            </div>

            <div>
              <Label>Account Size</Label>
              <Input
                placeholder="Account size"
                value={filters.account_size}
                onChange={(e) => handleFilterChange("account_size", e.target.value)}
              />
            </div>

            <div>
              <Label>Quick Date</Label>
              <Select value={filters.quick_date} onValueChange={(value) => handleFilterChange("quick_date", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange("from_date", e.target.value)}
              />
            </div>

            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange("to_date", e.target.value)}
              />
            </div>

            <div>
              <Label>Trade From</Label>
              <Input
                type="date"
                value={filters.trade_from}
                onChange={(e) => handleFilterChange("trade_from", e.target.value)}
              />
            </div>

            <div>
              <Label>Trade To</Label>
              <Input
                type="date"
                value={filters.trade_to}
                onChange={(e) => handleFilterChange("trade_to", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{overview?.orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Started Trading</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{overview?.starts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {conversions?.buy_to_start_pct || 0}% conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reached Live</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{overview?.live || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Got Payout</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{overview?.payout_accounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {conversions?.live_to_payout_pct || 0}% of live accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Trader Funnel</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={400}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Count">
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={400}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rate" name="Conversion %" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Breach Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Breaches by Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <BarChart data={breachRuleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rule" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Breach Count" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Breaches by Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <BarChart data={breachPhaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phase" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Breach Count" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breach Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Breach Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Breached Accounts</p>
              <p className="text-xl sm:text-2xl font-bold">{breaches?.total || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Breach Rate</p>
              <p className="text-xl sm:text-2xl font-bold">{conversions?.start_to_breach_pct || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TraderJourney;
