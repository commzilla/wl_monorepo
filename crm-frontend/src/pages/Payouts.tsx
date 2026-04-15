
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trader, TraderService } from '@/lib/models/trader';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";

// Define payment status types
type PaymentStatus = 'pending' | 'approved' | 'rejected';

// Extend trader with payment status
interface TraderWithStatus extends Trader {
  paymentStatus: PaymentStatus;
}

const Payouts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTraders, setFilteredTraders] = useState<TraderWithStatus[]>([]);

  // Get eligible traders (those who have passed challenges)
  const eligibleTraders = React.useMemo(() => {
    const traders = TraderService.getTraders();
    return traders.filter(trader => 
      trader.challenges.some(challenge => 
        // Check for passed-phase-2 status or other funded account statuses
        challenge.status === 'passed-phase-2' || challenge.status === 'passed-phase-1'
      )
    ).map(trader => ({ 
      ...trader, 
      paymentStatus: 'pending' as PaymentStatus 
    }));
  }, []);

  // Initial data load
  React.useEffect(() => {
    setFilteredTraders(eligibleTraders);
  }, [eligibleTraders]);

  // Handle search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTraders(eligibleTraders);
      return;
    }
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = eligibleTraders.filter(trader => 
      trader.firstName.toLowerCase().includes(lowerCaseQuery) ||
      trader.lastName.toLowerCase().includes(lowerCaseQuery) ||
      trader.email.toLowerCase().includes(lowerCaseQuery)
    );
    
    setFilteredTraders(filtered);
  }, [searchQuery, eligibleTraders]);

  // Helper function to get the passed challenge of a trader
  const getPassedChallenge = (trader: Trader) => {
    return trader.challenges.find(challenge => 
      challenge.status === 'passed-phase-2' || challenge.status === 'passed-phase-1'
    );
  };

  // Calculate net profit based on trader's trading activity (using same logic as TradingActivity page)
  const calculateNetProfit = (traderId: string): number => {
    const today = new Date('2025-05-21');

    if (traderId === '1') {
      // Conservative trader data
      return 270;
    } else if (traderId === '2') {
      // Aggressive trader data
      return 3845;
    } else {
      // Balanced trader data
      return 182.5;
    }
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Navigate to review trading activity
  const handleReviewTrading = (traderId: string, challengeId: string) => {
    navigate(`/trading-activity/${traderId}/${challengeId}`);
  };

  // Helper to get style for status badge
  const getStatusVariant = (status: PaymentStatus): "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'warning';
    }
  };

  // Helper to get display text for status
  const getStatusText = (status: PaymentStatus): string => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Pending review';
    }
  };

  return (
    <div>
      <PageHeader 
        title="Payouts" 
        subtitle="Manage trader payouts and review trading activities"
      />
      
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg font-semibold">Filter Traders</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trader name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
              }}
              className="w-full sm:w-auto"
            >
              <Filter className="mr-2" size={16} />
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg font-semibold">
              Eligible Traders for Payout ({filteredTraders.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trader</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Challenge Type</TableHead>
                <TableHead>Account Size</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTraders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No eligible traders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTraders.map((trader) => {
                  const passedChallenge = getPassedChallenge(trader);
                  if (!passedChallenge) return null;
                  
                  const netProfit = calculateNetProfit(trader.id);
                  
                  return (
                    <TableRow key={trader.id}>
                      <TableCell className="font-medium">
                        {trader.firstName} {trader.lastName}
                      </TableCell>
                      <TableCell>{trader.email}</TableCell>
                      <TableCell>{passedChallenge.step}</TableCell>
                      <TableCell>{formatCurrency(passedChallenge.initialBalance)}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(netProfit)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(trader.paymentStatus)}>
                          {getStatusText(trader.paymentStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => handleReviewTrading(trader.id, passedChallenge.id)}
                          className="gap-2"
                        >
                          <FileText size={16} />
                          Review Trading Activity
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payouts;
