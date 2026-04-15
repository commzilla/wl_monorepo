
import React from 'react';
import { format } from 'date-fns';
import { Calendar, Tag, Percent, Users, Image as ImageIcon, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Offer } from '@/lib/types/offer';

interface OfferDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer;
}

export const OfferDetailsDialog: React.FC<OfferDetailsDialogProps> = ({
  open,
  onOpenChange,
  offer,
}) => {
  const isOfferCurrent = () => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    return offer.is_active && startDate <= now && endDate >= now;
  };

  const getImageUrl = (image: string | File | undefined): string | undefined => {
    if (!image) return undefined;
    if (typeof image === 'string') return image;
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }
    return undefined;
  };

  const imageUrl = getImageUrl(offer.feature_image);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{offer.title}</DialogTitle>
          <DialogDescription>
            Detailed information about this promotional offer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Status</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={isOfferCurrent() ? "default" : "secondary"}>
                    {isOfferCurrent() ? "Active" : "Inactive"}
                  </Badge>
                  {!offer.is_active && (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Duration</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(offer.start_date), 'PPP')} - {format(new Date(offer.end_date), 'PPP')}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Created</h3>
                <p className="text-sm text-muted-foreground">
                  {offer.created_at ? format(new Date(offer.created_at), 'PPP p') : 'N/A'}
                </p>
              </div>

              {offer.updated_at && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Last Updated</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(offer.updated_at), 'PPP p')}
                  </p>
                </div>
              )}
            </div>

            {imageUrl && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Feature Image
                </h3>
                <div className="relative group">
                  <div className="relative overflow-hidden rounded-lg border shadow-lg bg-muted">
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="object-contain w-full group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.closest('.relative.group') as HTMLElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="aspect-video flex items-center justify-center bg-muted rounded-lg border">
                              <div class="text-center text-muted-foreground">
                                <svg class="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <p class="text-sm">Image unavailable</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {offer.description}
            </p>
          </div>

          {/* Coupons */}
          {offer.coupons && offer.coupons.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Coupons ({offer.coupons.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {offer.coupons.map((coupon, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <CardTitle className="text-base">{coupon.code}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {coupon.is_bogo ? (
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          {coupon.discount_percent > 0 && coupon.discount_percent < 100 && (
                            <>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                              <span>{coupon.discount_percent}% off +</span>
                            </>
                          )}
                          <Gift className="h-4 w-4 text-green-500" />
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                            Buy One Get One Free
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          <span>{coupon.discount_percent}% discount</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{coupon.usage_limit_per_user} use{coupon.usage_limit_per_user !== 1 ? 's' : ''} per user</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!offer.coupons || offer.coupons.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle>No Coupons</CardTitle>
                <CardDescription>
                  This offer doesn't have any associated coupons.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
