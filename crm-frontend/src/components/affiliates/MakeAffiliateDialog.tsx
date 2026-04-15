import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { challengeService } from "@/services/challengeService";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MakeAffiliateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    user_id: string;
    approve_now: boolean;
    custom_commission?: {
      is_active: boolean;
      commission_rate?: string;
      fixed_amount_per_referral?: string;
      notes?: string;
    };
  }) => void;
  isLoading: boolean;
}

export function MakeAffiliateDialog({
  open: dialogOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: MakeAffiliateDialogProps) {
  const [userId, setUserId] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [approveNow, setApproveNow] = useState(true);
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients-dropdown"],
    queryFn: () => challengeService.getClients(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the selected client to get the email
    const selectedClient = clients.find((c: any) => c.id === userId);
    
    const data: any = {
      email: selectedClient?.email,
      approve_now: approveNow,
    };

    if (useCustomCommission) {
      data.custom_commission = {
        is_active: true,
        commission_rate: commissionRate || undefined,
        fixed_amount_per_referral: fixedAmount || undefined,
        notes: notes || "Set via CRM",
      };
    }

    onSubmit(data);
  };

  const handleClose = () => {
    setUserId("");
    setPopoverOpen(false);
    setApproveNow(true);
    setUseCustomCommission(false);
    setCommissionRate("");
    setFixedAmount("");
    setNotes("");
    onOpenChange(false);
  };

  const selectedClient = clients.find((client: any) => client.id === userId);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make User an Affiliate</DialogTitle>
          <DialogDescription>
            Convert an existing user into an affiliate without changing their main role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Client *</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                >
                  {selectedClient ? (
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{selectedClient.full_name}</span>
                      <span className="text-xs text-muted-foreground">{selectedClient.email}</span>
                    </div>
                  ) : (
                    "Select a client to convert to affiliate"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 bg-background z-50">
                <Command>
                  <CommandInput placeholder="Search by name, email, or ID..." />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingClients ? "Loading clients..." : "No clients found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {clients.map((client: any) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.full_name} ${client.email} ${client.id}`}
                          onSelect={() => {
                            setUserId(client.id);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              userId === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{client.full_name}</span>
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="approveNow"
              checked={approveNow}
              onCheckedChange={setApproveNow}
            />
            <Label htmlFor="approveNow">Approve immediately</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="useCustomCommission"
              checked={useCustomCommission}
              onCheckedChange={setUseCustomCommission}
            />
            <Label htmlFor="useCustomCommission">Set custom commission</Label>
          </div>

          {useCustomCommission && (
            <div className="space-y-4 pl-4 border-l-2 border-border">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="e.g., 10.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixedAmount">Fixed Amount per Referral</Label>
                <Input
                  id="fixedAmount"
                  type="number"
                  step="0.01"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="e.g., 50.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this commission setup"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !userId}>
              {isLoading ? "Processing..." : "Make Affiliate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
