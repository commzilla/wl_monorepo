import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Coupon } from '@/utils/api';
import { Calendar, Tag, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ViewOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  imageUrl?: string;
  description: string;
  coupons?: Coupon[];
  startDate?: string;
  endDate?: string;
}

export const ViewOfferModal: React.FC<ViewOfferModalProps> = ({
  isOpen,
  onClose,
  title,
  imageUrl,
  description,
  coupons = [],
  startDate,
  endDate,
}) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getEncodedImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    try {
      const lastSlashIndex = url.lastIndexOf('/');
      const baseUrl = url.substring(0, lastSlashIndex + 1);
      const filename = url.substring(lastSlashIndex + 1);
      return baseUrl + encodeURIComponent(filename);
    } catch (error) {
      console.error('Error encoding image URL:', error);
      return url;
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Coupon code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = endDate && new Date(endDate) < new Date();
  const encodedImageUrl = getEncodedImageUrl(imageUrl);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#0A1114] via-[#0D1418] to-[#0A1114] border-2 border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(40,191,255,0.15)] p-0">
        <div className="space-y-0">
          {encodedImageUrl && (
            <div className="relative w-full bg-[#0D1418] overflow-hidden rounded-t-xl flex items-center justify-center py-8">
              <img
                src={encodedImageUrl}
                className="w-full h-auto object-contain max-h-[600px]"
                alt={`${title} offer`}
              />
            </div>
          )}

          <div className="p-8 space-y-6">
            <div>
              <DialogTitle className="text-4xl font-bold text-[#4EC1FF] mb-4">
                {title}
              </DialogTitle>
              
              {(startDate || endDate) && (
                <div className="flex items-center gap-3 flex-wrap">
                  {startDate && endDate && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
                      isExpired 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                    }`}>
                      <Calendar size={16} />
                      <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
                    </div>
                  )}
                  {isExpired && (
                    <span className="px-4 py-2 rounded-full text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-sm">
                      EXPIRED
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4EC1FF] to-transparent rounded-full"></div>
              <div className="pl-6">
                <p className="text-[#85A8C3] text-base leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            </div>

            {coupons.length > 0 && (
              <div className="relative">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#4EC1FF] to-transparent rounded-full"></div>
                <div className="pl-6">
                  <h3 className="text-xl font-bold text-[#E4EEF5] mb-4 flex items-center gap-2">
                    <Tag size={20} className="text-[#4EC1FF]" />
                    Available Coupons
                  </h3>
                  <div className="grid gap-4">
                    {coupons.map((coupon) => (
                      <div 
                        key={coupon.id} 
                        className="group relative overflow-hidden bg-gradient-to-r from-[rgba(40,191,255,0.12)] to-[rgba(40,191,255,0.06)] px-5 py-4 rounded-xl border border-[rgba(40,191,255,0.2)] hover:border-[rgba(40,191,255,0.4)] hover:shadow-[0_0_30px_rgba(40,191,255,0.2)] transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(40,191,255,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-[#4EC1FF] font-mono text-lg font-bold tracking-wider mb-1">{coupon.code}</div>
                            <div className="text-[#85A8C3] text-sm">Click to copy code</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {coupon.is_bogo ? (
                                <>
                                  {coupon.discount_percent > 0 && coupon.discount_percent < 100 && (
                                    <div className="text-[#4EC1FF] text-lg font-bold">{coupon.discount_percent}% OFF +</div>
                                  )}
                                  <div className="text-green-400 text-lg font-bold">BOGO</div>
                                  <div className="text-green-400/70 text-xs">BUY 1 GET 1</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-[#4EC1FF] text-2xl font-bold">{coupon.discount_percent}%</div>
                                  <div className="text-[#85A8C3] text-xs">OFF</div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => handleCopyCoupon(coupon.code)}
                              className="p-3 rounded-lg bg-[rgba(40,191,255,0.15)] hover:bg-[rgba(40,191,255,0.25)] border border-[rgba(40,191,255,0.3)] transition-all duration-300 hover:scale-110"
                            >
                              {copiedCode === coupon.code ? (
                                <Check size={20} className="text-green-400" />
                              ) : (
                                <Copy size={20} className="text-[#4EC1FF]" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
