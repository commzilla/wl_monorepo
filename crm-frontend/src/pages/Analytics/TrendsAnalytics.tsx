import { useQuery } from "@tanstack/react-query";
import { trendsAnalyticsService } from "@/services/trendsAnalyticsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const TrendsAnalytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trendsAnalytics'],
    queryFn: trendsAnalyticsService.getTrendsAnalytics,
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-3 sm:p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading trends analytics: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatChartData = (data: any[]) => {
    return data.map(item => ({
      ...item,
      revenue: parseFloat(item.revenue),
      payouts: parseFloat(item.payouts),
      profit: parseFloat(item.profit),
    }));
  };

  const dailyData = formatChartData(data?.daily || []);
  const weeklyData = formatChartData(data?.weekly || []);
  const monthlyData = formatChartData(data?.monthly || []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-4 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'Challenges Sold' 
                  ? entry.value 
                  : formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Trends Analytics</h1>
      </div>

      <Tabs defaultValue="daily" className="space-y-3 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-[360px]">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">Daily (30 Days)</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly (12 Weeks)</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly (12 Months)</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daily" className="space-y-3 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Revenue, Payouts & Profit - Daily</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={400} minWidth={500}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="payouts" stroke="hsl(var(--chart-2))" name="Payouts" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Challenges Sold - Daily</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={500}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="challenges_sold" fill="hsl(var(--chart-4))" name="Challenges Sold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-3 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Revenue, Payouts & Profit - Weekly</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={400} minWidth={500}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="payouts" stroke="hsl(var(--chart-2))" name="Payouts" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Challenges Sold - Weekly</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={500}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="challenges_sold" fill="hsl(var(--chart-4))" name="Challenges Sold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-3 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Revenue, Payouts & Profit - Monthly</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={400} minWidth={500}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="payouts" stroke="hsl(var(--chart-2))" name="Payouts" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Challenges Sold - Monthly</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={500}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="challenges_sold" fill="hsl(var(--chart-4))" name="Challenges Sold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrendsAnalytics;
