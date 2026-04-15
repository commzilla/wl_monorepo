import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Minus, ArrowUpDown } from 'lucide-react';
import { weCoinWalletService } from '@/services/weCoinWalletService';
import type { WeCoinWallet } from '@/lib/types/weCoinWallet';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const LedgerBook = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ordering, setOrdering] = useState('-balance');
  const [selectedWallet, setSelectedWallet] = useState<WeCoinWallet | null>(null);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    amount: '',
    description: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wecoins-wallets', searchTerm, ordering],
    queryFn: () => weCoinWalletService.getAll({ search: searchTerm, ordering }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, amount, description }: { id: number; amount: number; description: string }) =>
      weCoinWalletService.adjustBalance(id, { amount, description }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Wallet balance adjusted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['wecoins-wallets'] });
      setIsAdjustDialogOpen(false);
      setAdjustFormData({ amount: '', description: '' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to adjust wallet balance',
        variant: 'destructive',
      });
    },
  });

  const openAdjustDialog = (wallet: WeCoinWallet) => {
    setSelectedWallet(wallet);
    setIsAdjustDialogOpen(true);
  };

  const confirmAdjust = () => {
    if (!selectedWallet || !adjustFormData.amount || !adjustFormData.description) return;

    adjustMutation.mutate({
      id: selectedWallet.id,
      amount: parseFloat(adjustFormData.amount),
      description: adjustFormData.description,
    });
  };

  const toggleOrdering = () => {
    setOrdering((prev) => (prev === '-balance' ? 'balance' : '-balance'));
  };

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'earn':
        return 'default';
      case 'spend':
        return 'destructive';
      case 'adjustment':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRedemptionBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'fulfilled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-3 sm:py-6 space-y-3 sm:space-y-6">
      <PageHeader
        title="Ledger Book"
        subtitle="Manage user WeCoin wallets, view transactions, and adjust balances"
      />

      {/* Filters */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={toggleOrdering}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Balance {ordering === '-balance' ? '↓' : '↑'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Wallets ({wallets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading wallets...</div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No wallets found</div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {wallets.map((wallet) => (
                <AccordionItem key={wallet.id} value={`wallet-${wallet.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <div className="font-semibold">{wallet.user_username}</div>
                        <div className="text-sm text-muted-foreground">{wallet.user_email}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{wallet.balance} WeCoins</div>
                          <div className="text-xs text-muted-foreground">
                            {wallet.transactions.length} transactions
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdjustDialog(wallet);
                          }}
                        >
                          Adjust
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      {/* Transactions */}
                      <div>
                        <h4 className="font-semibold mb-3">Transaction History</h4>
                        {wallet.transactions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No transactions yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {wallet.transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="text-sm">
                                    {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getTransactionBadgeVariant(tx.type)}>
                                      {tx.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                                  </TableCell>
                                  <TableCell className="text-sm">{tx.description}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          </div>
                        )}
                      </div>

                      {/* Redemptions */}
                      <div>
                        <h4 className="font-semibold mb-3">Redemption History</h4>
                        {wallet.redemptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No redemptions yet</p>
                        ) : (
                          <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Comment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {wallet.redemptions.map((redemption) => (
                                <TableRow key={redemption.id}>
                                  <TableCell className="text-sm">
                                    {format(new Date(redemption.created_at), 'MMM dd, yyyy HH:mm')}
                                  </TableCell>
                                  <TableCell>{redemption.item_title}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{redemption.item_category}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getRedemptionBadgeVariant(redemption.status)}>
                                      {redemption.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {redemption.admin_comment || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Adjust Balance Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Manually adjust the balance for {selectedWallet?.user_username}'s wallet.
              Use positive values to add coins, negative to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={adjustFormData.amount}
                onChange={(e) => setAdjustFormData({ ...adjustFormData, amount: e.target.value })}
                placeholder="e.g., 100 or -50"
              />
              <p className="text-xs text-muted-foreground">
                Current balance: {selectedWallet?.balance} WeCoins
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={adjustFormData.description}
                onChange={(e) => setAdjustFormData({ ...adjustFormData, description: e.target.value })}
                placeholder="Reason for adjustment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustDialogOpen(false);
                setAdjustFormData({ amount: '', description: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAdjust}
              disabled={!adjustFormData.amount || !adjustFormData.description || adjustMutation.isPending}
            >
              {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LedgerBook;
