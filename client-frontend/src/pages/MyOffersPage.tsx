
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { OfferCard } from '@/components/offers/OfferCard';
import { ViewOfferModal } from '@/components/offers/ViewOfferModal';
import { ShareModal } from '@/components/offers/ShareModal';
import { fetchActiveOffers, Offer, OffersResponse } from '@/utils/api';

export const MyOffersPage: React.FC = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: offersData, isLoading, error } = useQuery<OffersResponse>({
    queryKey: ['active-offers'],
    queryFn: fetchActiveOffers,
  });

  // Extract offers from the response
  const activeOffers = offersData?.active_offers || [];
  const expiredOffers = offersData?.past_offers || [];
  const allOffers = [...activeOffers, ...expiredOffers];

  const handleShare = (offerId: number) => {
    const offer = allOffers.find(o => o.id === offerId);
    if (offer) {
      setSelectedOffer(offer);
      setShareModalOpen(true);
    }
  };

  const handleViewOffer = (offerId: number) => {
    const offer = allOffers.find(o => o.id === offerId);
    if (offer) {
      setSelectedOffer(offer);
      setViewModalOpen(true);
    }
  };

  const handleFilterToggle = () => {
    setFilterOpen(!filterOpen);
  };

  const displayedOffers = filterOpen ? expiredOffers : activeOffers;

  if (error) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-8 rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:px-5">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-[#E4EEF5] text-lg mb-4">Failed to load offers</p>
              <p className="text-[#85A8C3] text-sm">Please try again later</p>
            </div>
          </div>
        </main>
    );
  }

  return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-8 rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:px-5">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/39447170caa84a098b75da66c8d1a48c/c79a720e14c133b72befe055f6d9503667c5bd20?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-12 shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch min-h-12 shrink-0 my-auto"
              alt="My Offers icon"
            />
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              My Offers
            </h1>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4EC1FF] mx-auto mb-4"></div>
              <p className="text-[#85A8C3]">Loading offers...</p>
            </div>
          </div>
        ) : displayedOffers.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-[#E4EEF5] text-lg mb-4">
                {filterOpen ? "No past offers available" : "No active offers available"}
              </p>
              <p className="text-[#85A8C3] text-sm">
                {filterOpen ? "No expired offers found" : "Check back later for new offers"}
              </p>
            </div>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 max-md:max-w-full max-md:mt-10">
            {displayedOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                title={offer.title}
                imageUrl={offer.feature_image}
                description={offer.description}
                coupons={offer.coupons}
                startDate={offer.start_date}
                endDate={offer.end_date}
                onShare={() => handleShare(offer.id)}
                onViewOffer={() => handleViewOffer(offer.id)}
              />
            ))}
          </section>
        )}

        <div className="flex justify-center mt-12">
          <button
            onClick={handleFilterToggle}
            className="items-center shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-12 gap-3 text-sm font-normal tracking-[-0.42px] bg-[rgba(40,191,255,0.05)] px-4 py-3.5 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-all duration-300 group"
          >
            <Clock className="w-4 h-4 text-[#4EC1FF] transition-transform group-hover:scale-110" />
            <span className="text-[#85A8C3] my-auto">
              {filterOpen ? "Show Active Offers" : "Show Past Offers"}
            </span>
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4EC1FF] to-[#28BFFF] rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity animate-pulse"></div>
              <span className="relative flex items-center justify-center min-w-[24px] h-6 px-2 bg-gradient-to-br from-[#4EC1FF] to-[#28BFFF] text-white text-xs font-semibold rounded-full shadow-lg">
                {filterOpen ? activeOffers.length : expiredOffers.length}
              </span>
            </div>
            <img
              src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/bbab564e26a02ba0df23bef2f57cbfe226dae916?placeholderIfAbsent=true"
              className={`aspect-[1] object-contain w-5 shrink-0 my-auto transition-transform duration-300 ${filterOpen ? 'rotate-180' : ''}`}
              alt="Dropdown arrow"
            />
          </button>
        </div>

        {selectedOffer && (
          <>
            <ViewOfferModal
              isOpen={viewModalOpen}
              onClose={() => setViewModalOpen(false)}
              title={selectedOffer.title}
              imageUrl={selectedOffer.feature_image}
              description={selectedOffer.description}
              coupons={selectedOffer.coupons}
              startDate={selectedOffer.start_date}
              endDate={selectedOffer.end_date}
            />
            <ShareModal
              isOpen={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              title={selectedOffer.title}
              offerId={selectedOffer.id}
            />
          </>
        )}
      </main>
  );
};
