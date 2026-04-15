import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { redemptionService } from "@/services/redemptionService";
import { CATEGORY_LABELS } from "@/lib/types/redeemItem";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Check, X, Package, RotateCcw, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import type { RedeemItemSummary, RedemptionListItem, RedemptionAction } from "@/lib/types/redemption";

const RedemptionStatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    approved: "default",
    fulfilled: "outline",
    declined: "destructive",
  };

  return <Badge variant={variants[status] || "default"}>{status}</Badge>;
};

export default function Redemption() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    redemption: RedemptionListItem | null;
    action: RedemptionAction | null;
  }>({
    open: false,
    redemption: null,
    action: null,
  });
  const [comment, setComment] = useState("");

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ["redemption-dashboard"],
    queryFn: redemptionService.getDashboard,
  });

  const { data: redemptionsResponse, isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ["item-redemptions", expandedItem, statusFilter],
    queryFn: () => redemptionService.getItemRedemptions(expandedItem!, statusFilter),
    enabled: !!expandedItem,
  });

  const items = itemsResponse?.data;
  const redemptions = redemptionsResponse?.data;

  const actionMutation = useMutation({
    mutationFn: ({ redemptionId, action, comment }: { redemptionId: string; action: RedemptionAction; comment?: string }) =>
      redemptionService.performAction(redemptionId, { action, comment }),
    onSuccess: (response) => {
      toast({ title: "Success", description: response.data?.message || "Action completed" });
      queryClient.invalidateQueries({ queryKey: ["redemption-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["item-redemptions"] });
      setActionDialog({ open: false, redemption: null, action: null });
      setComment("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to perform action", variant: "destructive" });
    },
  });

  const handleAction = (redemption: RedemptionListItem, action: RedemptionAction) => {
    setActionDialog({ open: true, redemption, action });
  };

  const confirmAction = () => {
    if (!actionDialog.redemption || !actionDialog.action) return;
    actionMutation.mutate({
      redemptionId: actionDialog.redemption.id,
      action: actionDialog.action,
      comment,
    });
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
    setStatusFilter("");
  };

  const handleExport = (item: RedeemItemSummary) => {
    if (!redemptions || redemptions.length === 0) {
      toast({ 
        title: "No Data", 
        description: "No redemptions to export", 
        variant: "destructive" 
      });
      return;
    }

    // Format data for Excel
    const exportData = redemptions.map((redemption: RedemptionListItem, index: number) => ({
      '#': index + 1,
      'User Name': redemption.user_name,
      'Email': redemption.user_email,
      'Item': redemption.item_title,
      'Status': redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1),
      'Created Date': new Date(redemption.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'Admin Comment': redemption.admin_comment || 'N/A',
      'Reviewed At': redemption.reviewed_at 
        ? new Date(redemption.reviewed_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Not Reviewed',
      'Delivery Data': redemption.delivery_data 
        ? JSON.stringify(redemption.delivery_data) 
        : 'N/A'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 25 },  // User Name
      { wch: 30 },  // Email
      { wch: 35 },  // Item
      { wch: 12 },  // Status
      { wch: 25 },  // Created Date
      { wch: 30 },  // Admin Comment
      { wch: 25 },  // Reviewed At
      { wch: 30 },  // Delivery Data
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Redemptions');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${item.title.replace(/[^a-z0-9]/gi, '_')}_Redemptions_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

    toast({ 
      title: "Export Successful", 
      description: `Exported ${exportData.length} redemptions` 
    });
  };

  return (
    <div className="container mx-auto py-3 sm:py-6 space-y-3 sm:space-y-6">
      <PageHeader title="Redemption Dashboard" />

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
        ) : (
          items?.map((item: RedeemItemSummary) => (
            <Card key={item.id}>
              <CardHeader className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {expandedItem === item.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <div>
                      <CardTitle className="text-base sm:text-lg">{item.title}</CardTitle>
                      <CardDescription>
                        {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS]} • {item.required_wecoins} WeCoins
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-base sm:text-lg">{item.total_redemptions}</div>
                      <div className="text-muted-foreground text-xs sm:text-sm">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base sm:text-lg text-yellow-600">{item.pending_count}</div>
                      <div className="text-muted-foreground text-xs sm:text-sm">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base sm:text-lg text-blue-600">{item.approved_count}</div>
                      <div className="text-muted-foreground text-xs sm:text-sm">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base sm:text-lg text-green-600">{item.fulfilled_count}</div>
                      <div className="text-muted-foreground text-xs sm:text-sm">Fulfilled</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base sm:text-lg text-red-600">{item.declined_count}</div>
                      <div className="text-muted-foreground text-xs sm:text-sm">Declined</div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {expandedItem === item.id && (
                <CardContent className="p-3 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={statusFilter === "" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("")}
                      >
                        All
                      </Button>
                      <Button
                        variant={statusFilter === "pending" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("pending")}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={statusFilter === "approved" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("approved")}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={statusFilter === "fulfilled" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("fulfilled")}
                      >
                        Fulfilled
                      </Button>
                      <Button
                        variant={statusFilter === "declined" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("declined")}
                      >
                        Declined
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(item)}
                      disabled={!redemptions || redemptions.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </div>

                  {isLoadingRedemptions ? (
                    <div className="text-center py-4">Loading redemptions...</div>
                  ) : redemptions && redemptions.length > 0 ? (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {redemptions.map((redemption: RedemptionListItem) => (
                          <TableRow key={redemption.id}>
                            <TableCell>{redemption.user_name}</TableCell>
                            <TableCell>{redemption.user_email}</TableCell>
                            <TableCell>
                              <RedemptionStatusBadge status={redemption.status} />
                            </TableCell>
                            <TableCell>{new Date(redemption.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {redemption.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAction(redemption, "approve")}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAction(redemption, "decline")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {redemption.status === "approved" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction(redemption, "fulfill")}
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                )}
                                {(redemption.status === "fulfilled" || redemption.status === "declined") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction(redemption, "reset")}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">No redemptions found</div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, redemption: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve" && "Approve this redemption request?"}
              {actionDialog.action === "decline" && "Decline this redemption request?"}
              {actionDialog.action === "fulfill" && "Mark this redemption as fulfilled?"}
              {actionDialog.action === "reset" && "Reset this redemption to pending status?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note about this action..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, redemption: null, action: null })}>
              Cancel
            </Button>
            <Button onClick={confirmAction} disabled={actionMutation.isPending}>
              {actionMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
