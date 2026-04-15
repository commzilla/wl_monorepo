import React from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Eye, Calendar, Tag, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Offer } from '@/lib/types/offer';

interface OfferCardProps {
  offer: Offer;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  viewMode: 'grid' | 'list';
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onView,
  onEdit,
  onDelete,
  isDeleting,
  viewMode
}) => {
  const isOfferCurrent = () => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    return offer.is_active && startDate <= now && endDate >= now;
  };

  const getOfferStatus = () => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    
    if (!offer.is_active) return 'disabled';
    if (endDate < now) return 'expired';
    if (startDate > now) return 'upcoming';
    return 'active';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { variant: 'default' as const, label: 'Active', icon: TrendingUp };
      case 'upcoming':
        return { variant: 'secondary' as const, label: 'Upcoming', icon: Clock };
      case 'expired':
        return { variant: 'destructive' as const, label: 'Expired', icon: Calendar };
      case 'disabled':
        return { variant: 'outline' as const, label: 'Disabled', icon: Clock };
      default:
        return { variant: 'secondary' as const, label: 'Unknown', icon: Clock };
    }
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
  const status = getOfferStatus();
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-all duration-200 hover:scale-[1.01] bg-gradient-to-r from-background to-background/80">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {imageUrl && (
              <div className="rounded-lg overflow-hidden flex-shrink-0 bg-muted border shadow-sm">
                <img
                  src={imageUrl}
                  alt={offer.title}
                  className="w-full object-contain hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate">{offer.title}</h3>
                    <Badge variant={statusConfig.variant} className="gap-1 flex-shrink-0">
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {offer.description}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(offer.start_date), 'MMM dd')} - {format(new Date(offer.end_date), 'MMM dd, yyyy')}
                    </div>
                    {offer.coupons && offer.coupons.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {offer.coupons.length} coupon{offer.coupons.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={onView}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-background to-background/80 border-muted-foreground/10 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {offer.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusConfig.variant} className="gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
              {offer.coupons && offer.coupons.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="w-3 h-3" />
                  {offer.coupons.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {imageUrl && (
          <div className="relative overflow-hidden rounded-lg bg-muted mt-3 border shadow-sm">
            <img
              src={imageUrl}
              alt={offer.title}
              className="object-contain w-full group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                console.error('Failed to load image:', imageUrl);
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {offer.description}
        </p>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(offer.start_date), 'MMM dd')} - {format(new Date(offer.end_date), 'MMM dd, yyyy')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 group-hover:border-primary/40"
          >
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="group-hover:border-primary/40"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="group-hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};