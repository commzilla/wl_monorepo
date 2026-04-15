import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, Search, AlertCircle, CheckCircle2, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { certificateService } from '@/services/certificateService';
import { riskScanService } from '@/services/riskScanService';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import RiskReportViewer from '@/components/risk/RiskReportViewer';

interface ClientDropdownItem {
  id: string;
  full_name: string;
  email: string;
}

interface PayoutItem {
  payout_id: string;
  payout_value: number;
  payout_date: string;
  payout_status: string;
}

const RiskScan = () => {
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');
  const [payoutComboboxOpen, setPayoutComboboxOpen] = useState(false);
  const [payoutSearchValue, setPayoutSearchValue] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPayoutId, setSelectedPayoutId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const { toast } = useToast();

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await apiService.get<ClientDropdownItem[]>('/admin/clients-dropdown/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
  });

  const clientsList = Array.isArray(clients) ? clients : [];

  const filteredClients = clientsList.filter(
    (client) =>
      client &&
      client.full_name &&
      client.email &&
      (client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearchValue.toLowerCase()))
  );

  // Fetch payouts for selected client
  const {
    data: payoutsData,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ['client-payouts-riskscan', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;

      const selectedClient = clientsList.find((client) => client.id.toString() === selectedClientId);
      if (!selectedClient) return null;

      const response = await certificateService.lookupPayouts(selectedClient.email);
      return response;
    },
    enabled: false, // Manual trigger only
  });

  const payoutsList = payoutsData?.payouts || [];

  const filteredPayouts = payoutsList.filter(
    (payout) =>
      payout &&
      (payout.payout_id.toLowerCase().includes(payoutSearchValue.toLowerCase()) ||
        payout.payout_value.toString().includes(payoutSearchValue))
  );

  const selectedClient = clientsList.find((client) => client && client.id && client.id.toString() === selectedClientId);
  const selectedPayout = payoutsList.find((payout) => payout && payout.payout_id === selectedPayoutId);

  // Risk scan mutation
  const scanMutation = useMutation({
    mutationFn: async (params: { payoutId: string; startDate?: string; endDate?: string }) => {
      return await riskScanService.runRiskScan({
        payoutId: params.payoutId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    },
    onSuccess: (data) => {
      setScanResult(data);
      setScanError(null);
      toast({
        title: 'Success',
        description: 'Risk scan completed successfully',
      });
    },
    onError: (error: any) => {
      setScanError(error.message || 'Failed to run risk scan');
      setScanResult(null);
    },
  });

  const handleClientComboboxOpenChange = (open: boolean) => {
    setClientComboboxOpen(open);
    if (!open) {
      setClientSearchValue('');
    }
  };

  const handlePayoutComboboxOpenChange = (open: boolean) => {
    setPayoutComboboxOpen(open);
    if (!open) {
      setPayoutSearchValue('');
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedPayoutId('');
    setScanResult(null);
    setClientComboboxOpen(false);
  };

  const handleLookupPayouts = () => {
    if (!selectedClientId) {
      toast({
        title: 'Error',
        description: 'Please select a client first',
        variant: 'destructive',
      });
      return;
    }
    refetchPayouts();
  };

  const handleRunScan = () => {
    if (!selectedPayoutId) {
      toast({
        title: 'Error',
        description: 'Please select a payout',
        variant: 'destructive',
      });
      return;
    }

    scanMutation.mutate({
      payoutId: selectedPayoutId,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleReset = () => {
    setSelectedClientId('');
    setSelectedPayoutId('');
    setStartDate(undefined);
    setEndDate(undefined);
    setScanResult(null);
    setScanError(null);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Risk Scan"
        subtitle="Run Risk Engine v2 analysis on payout requests"
      />

      <div className="space-y-4 sm:space-y-6">
        {/* Selection Card */}
        <Card className="max-w-3xl animate-fade-in border-2">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Select Payout</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Choose a client and payout to run the risk analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Select Client *</Label>
              <Popover open={clientComboboxOpen} onOpenChange={handleClientComboboxOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedClient ? (
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{selectedClient.full_name}</span>
                        <span className="text-muted-foreground">({selectedClient.email})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select client...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0" align="start">
                  <div className="p-2">
                    <Input
                      placeholder="Search clients..."
                      value={clientSearchValue}
                      onChange={(e) => setClientSearchValue(e.target.value)}
                      className="mb-2"
                    />
                    <div className="max-h-60 overflow-y-auto">
                      {clientsLoading ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">Loading...</div>
                      ) : filteredClients.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">No clients found</div>
                      ) : (
                        filteredClients.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => handleClientChange(client.id.toString())}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent',
                              selectedClientId === client.id.toString() && 'bg-accent'
                            )}
                          >
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selectedClientId === client.id.toString() ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{client.full_name}</div>
                              <div className="text-sm text-muted-foreground">{client.email}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Lookup Payouts Button */}
            <Button
              onClick={handleLookupPayouts}
              disabled={!selectedClientId || payoutsLoading}
              variant="secondary"
              className="w-full"
            >
              {payoutsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up payouts...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Lookup Payouts
                </>
              )}
            </Button>

            {/* Payout Selection */}
            {payoutsData && (
              <div className="space-y-2">
                <Label>Select Payout *</Label>
                <Popover open={payoutComboboxOpen} onOpenChange={handlePayoutComboboxOpenChange}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={payoutComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedPayout ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">${selectedPayout.payout_value.toFixed(2)}</span>
                          <span className="text-muted-foreground">
                            ({new Date(selectedPayout.payout_date).toLocaleDateString()})
                          </span>
                          <Badge variant="secondary">{selectedPayout.payout_status}</Badge>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select payout...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0" align="start">
                    <div className="p-2">
                      <Input
                        placeholder="Search payouts..."
                        value={payoutSearchValue}
                        onChange={(e) => setPayoutSearchValue(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-60 overflow-y-auto">
                        {filteredPayouts.length === 0 ? (
                          <div className="p-2 text-center text-sm text-muted-foreground">No payouts found</div>
                        ) : (
                          filteredPayouts.map((payout) => (
                            <div
                              key={payout.payout_id}
                              onClick={() => {
                                setSelectedPayoutId(payout.payout_id);
                                setPayoutComboboxOpen(false);
                                setScanResult(null);
                              }}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent',
                                selectedPayoutId === payout.payout_id && 'bg-accent'
                              )}
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4',
                                  selectedPayoutId === payout.payout_id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">${payout.payout_value.toFixed(2)}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {payout.payout_status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(payout.payout_date).toLocaleDateString()} • ID: {payout.payout_id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Date Filters */}
            {payoutsData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Start Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Select start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Select end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleRunScan} disabled={!selectedPayoutId || scanMutation.isPending} className="flex-1">
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Scan...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Risk Scan
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {scanError && (
          <Alert variant="destructive" className="max-w-3xl animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Risk Scan Failed</AlertTitle>
            <AlertDescription className="mt-2 whitespace-pre-wrap font-mono text-sm">
              {scanError}
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {scanResult && scanResult.report && (
          <RiskReportViewer report={scanResult.report} />
        )}
      </div>
    </div>
  );
};

export default RiskScan;
