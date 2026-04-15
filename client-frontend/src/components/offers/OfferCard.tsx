
import React, { useState } from 'react';
import { Coupon } from '@/utils/api';

interface OfferCardProps {
  title: string;
  imageUrl?: string;
  description: string;
  coupons?: Coupon[];
  startDate?: string;
  endDate?: string;
  onShare: () => void;
  onViewOffer: () => void;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  title,
  imageUrl,
  description,
  coupons = [],
  startDate,
  endDate,
  onShare,
  onViewOffer
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Encode the image URL to handle special characters
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

  const isExpired = endDate && new Date(endDate) < new Date();
  const shouldShowExpandButton = description.length > 150;
  const encodedImageUrl = getEncodedImageUrl(imageUrl);

  return (
    <article className="flex flex-col h-full bg-[#0A1114] rounded-xl px-5 py-6 hover:bg-[#0B1215] transition-colors">
      {encodedImageUrl && (
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-lg mb-4 bg-[#0D1418] flex items-center justify-center">
          <img
            src={encodedImageUrl}
            className="w-full h-full object-contain rounded-lg hover:scale-105 transition-transform duration-300"
            alt={`${title} offer`}
          />
        </div>
      )}
      
      <h3 className="text-[#E4EEF5] text-xl font-semibold tracking-[-0.6px] mb-3 max-md:max-w-full line-clamp-2">
        {title}
      </h3>
      
      {(startDate || endDate) && (
        <div className="text-[#85A8C3] text-xs mb-3 flex items-center gap-2">
          {startDate && endDate && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isExpired 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}>
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          )}
          {isExpired && (
            <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-full text-xs font-medium border border-red-500/20">
              Expired
            </span>
          )}
        </div>
      )}
      
      <div className="flex-grow mb-4 overflow-hidden">
        <p className={`text-[#85A8C3] text-sm leading-relaxed tracking-[-0.42px] break-words ${
          !isExpanded && shouldShowExpandButton ? 'line-clamp-3' : ''
        }`}>
          {description}
        </p>
        
        {shouldShowExpandButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#4EC1FF] text-sm font-medium mt-2 hover:text-[#28BFFF] transition-colors"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {coupons.length > 0 && (
        <div className="mb-4">
          <p className="text-[#E4EEF5] text-sm font-semibold mb-3">Available Coupons:</p>
          <div className="space-y-2">
            {coupons.slice(0, isExpanded ? coupons.length : 2).map((coupon) => (
              <div key={coupon.id} className="flex items-center justify-between bg-[rgba(40,191,255,0.08)] px-3 py-2 rounded-lg border border-[rgba(40,191,255,0.1)] hover:bg-[rgba(40,191,255,0.12)] transition-colors">
                <span className="text-[#4EC1FF] font-mono text-sm font-medium">{coupon.code}</span>
                <span className="text-[#85A8C3] text-sm font-medium">{coupon.is_bogo ? (coupon.discount_percent > 0 && coupon.discount_percent < 100 ? `${coupon.discount_percent}% off + Buy 1 Get 1 Free` : 'Buy 1 Get 1 Free') : `${coupon.discount_percent}% off`}</span>
              </div>
            ))}
            {!isExpanded && coupons.length > 2 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-[#4EC1FF] text-sm font-medium hover:text-[#28BFFF] transition-colors"
              >
                +{coupons.length - 2} more coupons
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm font-semibold whitespace-nowrap mt-auto">
        <button
          onClick={onShare}
          disabled={isExpired}
          className={`justify-center items-center border shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-11 gap-2 overflow-hidden px-4 py-3 rounded-lg border-solid transition-colors flex-1 ${
            isExpired 
              ? 'border-gray-600 text-gray-500 cursor-not-allowed opacity-50 bg-[rgba(40,191,255,0.02)]' 
              : 'border-[#28BFFF] text-[#85A8C3] bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)]'
          }`}
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/b46d9173e50b3c93543e02ab2f987ad0c7d7c050?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 shrink-0"
            alt="Share icon"
          />
          <span className={isExpired ? 'text-gray-500' : 'text-[#85A8C3]'}>Share</span>
        </button>
        
        <button
          onClick={onViewOffer}
          disabled={isExpired}
          className={`items-center border shadow-[0px_0px_40px_0px_rgba(79,214,255,0.40)_inset] bg-[rgba(8,8,8,0.01)] flex min-h-11 gap-2 overflow-hidden px-4 py-3 rounded-lg border-solid transition-colors flex-1 ${
            isExpired 
              ? 'border-gray-600 text-gray-500 cursor-not-allowed opacity-50' 
              : 'border-[#126BA7] text-[#E4EEF5] hover:bg-[rgba(18,107,167,0.1)]'
          }`}
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/b46d9173e50b3c93543e02ab2f987ad0c7d7c050?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 shrink-0"
            alt="View Offer icon"
          />
          <span className={isExpired ? 'text-gray-500' : 'text-[#E4EEF5]'}>
            {isExpired ? 'Expired' : 'View Offer'}
          </span>
        </button>
      </div>
    </article>
  );
};
