import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface TradeRatingStarsProps {
  rating: number | null;
  onChange: (rating: number) => void;
}

const TradeRatingStars: React.FC<TradeRatingStarsProps> = ({ rating, onChange }) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const displayRating = hoveredStar ?? rating ?? 0;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Trade rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === rating}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28BFFF]/40"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                isFilled
                  ? 'fill-[#F5A623] text-[#F5A623]'
                  : 'fill-transparent text-[#85A8C3]/40'
              }`}
            />
          </button>
        );
      })}
      {rating !== null && (
        <span className="ml-1.5 text-xs text-[#85A8C3]">{rating}/5</span>
      )}
    </div>
  );
};

export default TradeRatingStars;
