import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ShoppingBag, Coins, Package, AlertCircle, Infinity } from 'lucide-react';
import { fetchRedeemItems, redeemItem } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RedeemItemsModalProps {
  onClose: () => void;
  availableCoins: string;
}

export const RedeemItemsModal: React.FC<RedeemItemsModalProps> = ({ onClose, availableCoins }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleDescription = (itemId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['redeemItems'],
    queryFn: fetchRedeemItems,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemItem,
    onSuccess: () => {
      toast.success('Item redeemed successfully!', {
        description: 'Your redemption is pending admin approval.',
      });
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['redeemItems'] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Redemption failed', {
        description: error.message,
      });
    },
  });

  const handleRedeem = (itemId: string) => {
    setSelectedItem(itemId);
  };

  const confirmRedeem = () => {
    if (selectedItem) {
      redeemMutation.mutate(selectedItem);
    }
  };

  const selectedItemData = items?.find(item => item.id === selectedItem);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-[#0A1114] rounded-2xl border border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(58,179,255,0.3)] animate-scale-in">
          {/* Decorative gradient background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#3AB3FF]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          {/* Header */}
          <header className="relative flex items-center justify-between p-6 border-b border-[rgba(40,191,255,0.1)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)]">
                <ShoppingBag className="w-5 h-5 text-[#28BFFF]" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#E4EEF5]">Redeem WeCoins</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="w-4 h-4 text-[#28BFFF]" />
                  <span className="text-sm text-[#85A8C3]">Available:</span>
                  <span className="text-sm font-semibold text-[#28BFFF]">
                    {parseFloat(availableCoins).toFixed(0)} WeCoins
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-[#85A8C3]" />
            </button>
          </header>

          {/* Content */}
          <div className="modal-scroll-content relative p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-[#85A8C3]">Loading items...</div>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center py-12 text-red-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Failed to load items. Please try again later.</p>
              </div>
            ) : items && items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`bg-[#0B1215] border border-[rgba(40,191,255,0.1)] rounded-xl overflow-hidden hover:border-[rgba(40,191,255,0.2)] transition-all ${item.is_expired ? 'opacity-60' : ''}`}
                  >
                    {/* Item Image */}
                    {item.image_url && (
                      <div className="relative w-full bg-[rgba(40,191,255,0.05)] flex items-center justify-center">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-auto"
                        />
                        {item.is_expired && (
                          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-[rgba(8,8,8,0.8)] backdrop-blur-sm border border-red-500/30">
                            <span className="text-xs font-semibold text-red-400">Expired</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4">
                      {/* Category Badge */}
                      <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-[rgba(40,191,255,0.1)] text-[#28BFFF] mb-2">
                        {item.category}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-[#E4EEF5] mb-2">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <div className="mb-4">
                        <p className="text-sm text-[#85A8C3]">
                          {expandedDescriptions.has(item.id) || item.description.length <= 80
                            ? item.description
                            : `${item.description.substring(0, 80)}...`}
                        </p>
                        {item.description.length > 80 && (
                          <button
                            onClick={() => toggleDescription(item.id)}
                            className="text-xs text-[#28BFFF] hover:text-[#4EC1FF] mt-1 transition-colors"
                          >
                            {expandedDescriptions.has(item.id) ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>

                      {/* Price and Stock */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-[#28BFFF]" />
                          <span className="text-lg font-semibold text-[#E4EEF5]">
                            {parseFloat(item.required_wecoins).toFixed(0)}
                          </span>
                        </div>
                        {item.stock_quantity === 0 ? (
                          <div className="flex items-center gap-1 text-xs text-[#28BFFF]">
                            <Infinity className="w-4 h-4" />
                            <span>Unlimited</span>
                          </div>
                        ) : item.stock_quantity !== null && (
                          <div className="flex items-center gap-1 text-xs text-[#85A8C3]">
                            <Package className="w-3 h-3" />
                            <span>{item.stock_quantity} left</span>
                          </div>
                        )}
                      </div>

                      {/* Redeem Button */}
                      <Button
                        onClick={() => handleRedeem(item.id)}
                        disabled={item.is_expired || item.can_redeem === false || (item.stock_quantity !== null && item.stock_quantity < 0)}
                        className={`w-full border ${
                          item.is_expired
                            ? 'bg-gray-500/10 text-gray-500 border-gray-600 cursor-not-allowed'
                            : 'bg-[rgba(40,191,255,0.1)] hover:bg-[rgba(40,191,255,0.2)] text-[#28BFFF] border-[rgba(40,191,255,0.3)]'
                        }`}
                      >
                        {item.is_expired ? 'Expired' : (item.stock_quantity !== null && item.stock_quantity < 0) ? 'Out of Stock' : 'Redeem'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-12">
                <ShoppingBag className="w-16 h-16 text-[#28BFFF] opacity-30 mb-4" />
                <p className="text-lg text-[#85A8C3]">No items available for redemption.</p>
                <p className="text-sm text-[#85A8C3] mt-2 opacity-70">Check back later!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <AlertDialogContent className="bg-[#0A0A0A] border-[rgba(40,191,255,0.2)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E4EEF5]">Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription className="text-[#85A8C3]">
              Are you sure you want to redeem <span className="font-semibold text-[#28BFFF]">{selectedItemData?.title}</span> for{' '}
              <span className="font-semibold text-[#28BFFF]">
                {selectedItemData ? parseFloat(selectedItemData.required_wecoins).toFixed(0) : 0} WeCoins
              </span>?
              <br />
              <br />
              This action will deduct the coins from your wallet and create a pending redemption request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[rgba(40,191,255,0.05)] text-[#85A8C3] border-[rgba(40,191,255,0.2)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRedeem}
              disabled={redeemMutation.isPending}
              className="bg-[rgba(40,191,255,0.1)] hover:bg-[rgba(40,191,255,0.2)] text-[#28BFFF] border border-[rgba(40,191,255,0.3)]"
            >
              {redeemMutation.isPending ? 'Redeeming...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
