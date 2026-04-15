import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, FileSpreadsheet, Loader2, Download, Users, Receipt, CreditCard } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  loading: boolean;
  onClick: () => void;
}

const ExportCard: React.FC<ExportCardProps> = ({ title, description, icon: Icon, loading, onClick }) => (
  <Card className="hover:border-primary/40 transition-colors">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={onClick} disabled={loading} className="w-full" variant="outline">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export XLSX
          </>
        )}
      </Button>
    </CardContent>
  </Card>
);

const ZohoExports: React.FC = () => {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [startInvoiceNumber, setStartInvoiceNumber] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    orders: false,
    customers: false,
    invoices: false,
    payments: false,
  });

  const handleExport = async (type: "orders" | "customers" | "invoices" | "payments") => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "Date range required",
        description: "Please select both From and To dates",
        variant: "destructive",
      });
      return;
    }

    setLoadingStates((prev) => ({ ...prev, [type]: true }));

    try {
      const params = new URLSearchParams();
      params.append("date_from", format(dateFrom, "yyyy-MM-dd"));
      params.append("date_to", format(dateTo, "yyyy-MM-dd"));
      if (startInvoiceNumber) {
        params.append("start_invoice_number", startInvoiceNumber);
      }

      const url = `${API_BASE}/admin/zoho-export/${type}/?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `export_${type}_${format(dateFrom, "yyyy-MM-dd")}_to_${format(dateTo, "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export complete",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} export downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounting Exports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Export order data as XLSX for accounting software import</p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Settings</CardTitle>
          <CardDescription>Select date range and optional starting invoice number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Starting Invoice Number */}
            <div className="space-y-2">
              <Label>Starting Invoice Number</Label>
              <Input
                type="number"
                placeholder="Auto-detect if empty"
                value={startInvoiceNumber}
                onChange={(e) => setStartInvoiceNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ExportCard
          title="Orders"
          description="Raw order data dump for finance records"
          icon={FileSpreadsheet}
          loading={loadingStates.orders}
          onClick={() => handleExport("orders")}
        />
        <ExportCard
          title="Customers"
          description="Deduplicated customer list for import"
          icon={Users}
          loading={loadingStates.customers}
          onClick={() => handleExport("customers")}
        />
        <ExportCard
          title="Invoices"
          description="One row per order with computed fields"
          icon={Receipt}
          loading={loadingStates.invoices}
          onClick={() => handleExport("invoices")}
        />
        <ExportCard
          title="Payments"
          description="Payment transactions with PSP fee breakdown"
          icon={CreditCard}
          loading={loadingStates.payments}
          onClick={() => handleExport("payments")}
        />
      </div>
    </div>
  );
};

export default ZohoExports;
