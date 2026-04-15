import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  Rocket,
  Loader2,
  Download,
  Play,
  Settings2,
  Calendar,
  BarChart3,
  Timer,
  Banknote,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { tradingReportService } from "@/services/tradingReportService";
import type {
  TradingReport,
  TradingReportListItem,
  TradingReportMetric,
  TradingReportConfig,
} from "@/lib/types/tradingReports";

const METRIC_ICON_MAP: Record<string, React.ElementType> = {
  highest_payout: DollarSign,
  best_trade: TrendingUp,
  best_roi: Target,
  most_profitable_trader: Trophy,
  most_active_trader: Zap,
  fastest_phase_completion: Rocket,
  most_traded_pairs: BarChart3,
  quickest_2step: Timer,
  fastest_to_payout: Banknote,
};

const METRIC_COLOR_MAP: Record<string, string> = {
  highest_payout: "text-green-500",
  best_trade: "text-blue-500",
  best_roi: "text-purple-500",
  most_profitable_trader: "text-yellow-500",
  most_active_trader: "text-orange-500",
  fastest_phase_completion: "text-cyan-500",
  most_traded_pairs: "text-indigo-500",
  quickest_2step: "text-rose-500",
  fastest_to_payout: "text-emerald-500",
};

function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  if (total < 1440) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatMetricValue(metricName: string, value: number): string {
  switch (metricName) {
    case "highest_payout":
    case "best_trade":
    case "most_profitable_trader":
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "best_roi":
      return `${value.toFixed(2)}%`;
    case "most_active_trader":
    case "most_traded_pairs":
      return `${value.toLocaleString()} trades`;
    case "fastest_phase_completion":
    case "quickest_2step":
    case "fastest_to_payout":
      return formatDuration(value);
    default:
      return String(value);
  }
}

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(periodType: string): { start: string; end: string } {
  const today = new Date();
  if (periodType === "weekly") {
    const end = new Date(today);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
  }
  // monthly
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(firstOfMonth);
  end.setDate(end.getDate() - 1);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
}

const TradingReports: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("reports");
  const [periodType, setPeriodType] = useState<"weekly" | "monthly" | "custom">("weekly");
  const [dateRange, setDateRange] = useState(getDefaultDateRange("weekly"));
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // Fetch report list
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["trading-reports", periodType],
    queryFn: () => tradingReportService.getReports({ period_type: periodType !== "custom" ? periodType : undefined }),
  });

  // Fetch selected report detail
  const { data: selectedReport, isLoading: reportLoading } = useQuery({
    queryKey: ["trading-report", selectedReportId],
    queryFn: () => tradingReportService.getReport(selectedReportId!),
    enabled: !!selectedReportId,
  });

  // Fetch config
  const { data: config } = useQuery({
    queryKey: ["trading-report-config"],
    queryFn: () => tradingReportService.getConfig(),
    enabled: activeTab === "settings",
  });

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      tradingReportService.generateReport({
        period_start: dateRange.start,
        period_end: dateRange.end,
        period_type: periodType,
      }),
    onSuccess: (report) => {
      toast({ title: "Report generated", description: `Report #${report.id} created successfully.` });
      queryClient.invalidateQueries({ queryKey: ["trading-reports", periodType] });
      setSelectedReportId(report.id);
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  // Update config mutation
  const configMutation = useMutation({
    mutationFn: (data: Partial<TradingReportConfig>) => tradingReportService.updateConfig(data),
    onSuccess: () => {
      toast({ title: "Config updated" });
      queryClient.invalidateQueries({ queryKey: ["trading-report-config"] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export anonymized CSV
  const handleExport = async () => {
    if (!selectedReportId) return;
    try {
      const anon = await tradingReportService.getAnonymized(selectedReportId);
      const lines = ["Metric,Rank,Trader,Value"];
      for (const metric of anon.data.metrics) {
        for (const entry of metric.entries) {
          lines.push(`"${metric.metric_label}",${entry.rank},"${entry.trader_username}","${formatMetricValue(metric.metric_name, entry.value)}"`);
        }
      }
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trading-report-${selectedReportId}-anonymized.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handlePeriodChange = (value: "weekly" | "monthly" | "custom") => {
    setPeriodType(value);
    if (value !== "custom") {
      setDateRange(getDefaultDateRange(value));
    }
    setSelectedReportId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Trading Reports"
        subtitle="Top 5 leaderboards across key trading metrics"
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedReportId && (
              <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          {/* Controls */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Period</Label>
                  <Select value={periodType} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
                    className="w-full sm:w-[160px]"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
                    className="w-full sm:w-[160px]"
                  />
                </div>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !dateRange.start || !dateRange.end}
                  className="w-full sm:w-auto"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report selector */}
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generated Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(reports as TradingReportListItem[]).map((r) => (
                    <Button
                      key={r.id}
                      variant={selectedReportId === r.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedReportId(r.id)}
                      className="text-xs"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {r.period_start} — {r.period_end}
                      {r.is_auto_generated && (
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1">auto</Badge>
                      )}
                      {r.slack_sent && (
                        <Badge variant="outline" className="ml-1 text-[10px] px-1">slack</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No reports found. Generate one using the controls above.
              </CardContent>
            </Card>
          )}

          {/* Metric cards */}
          {reportLoading && selectedReportId ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedReport ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {selectedReport.data.metrics.map((metric: TradingReportMetric) => {
                const Icon = METRIC_ICON_MAP[metric.metric_name] || Trophy;
                const colorClass = METRIC_COLOR_MAP[metric.metric_name] || "text-foreground";

                return (
                  <Card key={metric.metric_name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                        {metric.metric_label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metric.entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No data for this period.</p>
                      ) : (
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Trader</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {metric.entries.map((entry) => (
                              <TableRow
                                key={entry.rank}
                                className={entry.rank === 1 ? "bg-yellow-500/5" : ""}
                              >
                                <TableCell className="font-medium">
                                  {entry.rank === 1 ? (
                                    <span className="text-yellow-500 font-bold">#1</span>
                                  ) : (
                                    `#${entry.rank}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm">{entry.trader_username}</div>
                                    <div className="text-xs text-muted-foreground">{entry.trader_email}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatMetricValue(metric.metric_name, entry.value)}
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
              })}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 sm:space-y-6">
          <SettingsPanel config={config} onSave={(data) => configMutation.mutate(data)} saving={configMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface SettingsPanelProps {
  config?: TradingReportConfig;
  onSave: (data: Partial<TradingReportConfig>) => void;
  saving: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onSave, saving }) => {
  const [form, setForm] = React.useState<Partial<TradingReportConfig>>({});

  React.useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  if (!config) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (key: keyof TradingReportConfig, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Report Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="font-medium">Enable Auto-Generation</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">Master switch for automated report generation</p>
          </div>
          <Switch checked={form.is_enabled ?? false} onCheckedChange={(v) => update("is_enabled", v)} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="font-medium">Weekly Reports</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">Auto-generate weekly Top 5 reports</p>
          </div>
          <Switch checked={form.auto_weekly ?? false} onCheckedChange={(v) => update("auto_weekly", v)} />
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">Weekly Report Day</Label>
          <Select value={String(form.weekly_day ?? 1)} onValueChange={(v) => update("weekly_day", parseInt(v))}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
              <SelectItem value="7">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="font-medium">Monthly Reports</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">Auto-generate monthly Top 5 reports</p>
          </div>
          <Switch checked={form.auto_monthly ?? false} onCheckedChange={(v) => update("auto_monthly", v)} />
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">Monthly Report Day</Label>
          <Input
            type="number"
            min={1}
            max={28}
            value={form.monthly_day ?? 1}
            onChange={(e) => update("monthly_day", parseInt(e.target.value) || 1)}
            className="w-[100px]"
          />
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="font-medium">Slack Notifications</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">Send report summaries to Slack</p>
            </div>
            <Switch checked={form.slack_enabled ?? false} onCheckedChange={(v) => update("slack_enabled", v)} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Slack Webhook URL</Label>
            <Input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={form.slack_webhook_url ?? ""}
              onChange={(e) => update("slack_webhook_url", e.target.value)}
              className="max-w-lg"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingReports;
