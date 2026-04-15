import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Trophy, Clock, Eye, ChevronRight, Flame, Sparkles } from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { Competition } from '@/utils/api';

interface CompetitionCardProps {
  competition: Competition;
  onSelect: (id: string) => void;
}

const CompetitionCard: React.FC<CompetitionCardProps> = ({ competition, onSelect }) => {
  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Ending soon';
  };

  const getCtaButton = () => {
    if (competition.cta === 'ENDED') {
      return (
        <Button 
          variant="outline" 
          disabled 
          className="w-full opacity-50 border-[#1E3A5F]/50 text-[#85A8C3]"
        >
          Ended
        </Button>
      );
    }
    if (competition.cta === 'VIEW') {
      return (
        <Button 
          className="w-full bg-[#3AB3FF] text-white font-medium hover:bg-[#2A9FE8] hover:shadow-lg hover:shadow-[#3AB3FF]/30 transition-all duration-300"
          onClick={() => onSelect(competition.id)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Tournament
        </Button>
      );
    }
    return (
      <Button 
        className="w-full bg-[#3AB3FF] text-white font-medium hover:bg-[#2A9FE8] hover:shadow-lg hover:shadow-[#3AB3FF]/30 transition-all duration-300"
        onClick={() => onSelect(competition.id)}
      >
        <Eye className="w-4 h-4 mr-2" />
        View Competition
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    );
  };

  return (
    <Card className="group relative overflow-hidden bg-[#0B1622]/80 border-[#1E3A5F]/50 hover:border-[#3AB3FF]/40 transition-all duration-500 hover:shadow-xl hover:shadow-[#3AB3FF]/5">
      {/* Banner */}
      {/* Banner Section */}
      <div className="relative">
        {competition.banner ? (
          <div className="relative h-36 overflow-hidden">
            <img 
              src={competition.banner} 
              alt={competition.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1622] via-[#0B1622]/40 to-transparent" />
            
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
              <Badge className={`
                px-2 py-0.5 text-xs font-medium border
                ${competition.status === 'ongoing' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                  : competition.status === 'upcoming'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-[#1E3A5F]/50 text-[#85A8C3] border-[#1E3A5F]/50'}
              `}>
                {competition.status === 'ongoing' && <Flame className="w-3 h-3 mr-1" />}
                {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
              </Badge>
            </div>

            {/* Time remaining badge for ongoing */}
            {competition.status === 'ongoing' && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-[#0B1622]/80 text-[#E4EEF5] border-[#1E3A5F]/50 px-2 py-0.5 text-xs">
                  <Clock className="w-3 h-3 mr-1 text-[#3AB3FF]" />
                  {getTimeRemaining(competition.end_at)}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="relative h-36 bg-gradient-to-br from-[#1E3A5F]/30 via-[#0B1622] to-[#1E3A5F]/20 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-[#3AB3FF]/20" />
          </div>
        )}

        {/* Organizer Logo - Positioned at bottom left, overlapping banner */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-xl border-2 border-[#0B1622] bg-[#1E3A5F]/80 overflow-hidden shadow-lg">
            {competition.organizer_logo ? (
              <img 
                src={competition.organizer_logo} 
                alt={competition.organizer_name || 'Organizer'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#0B1622]">
                <Trophy className="w-8 h-8 text-[#3AB3FF]/60" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pt-10 space-y-3">
        {/* Title */}
        <h3 className="text-base font-bold text-[#E4EEF5] line-clamp-1 group-hover:text-[#3AB3FF] transition-colors duration-300">
          {competition.title}
        </h3>
        
        {/* Prize Pool - Single line with truncation */}
        <div className="flex items-center gap-2 bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 rounded-lg px-3 py-2">
          <Trophy className="w-4 h-4 text-[#3AB3FF] flex-shrink-0" />
          <span className="text-sm font-bold text-[#3AB3FF] truncate">{competition.prize_pool_text}</span>
        </div>

        {/* Short Description */}
        <p className="text-[#85A8C3] text-xs line-clamp-2">
          {competition.short_description}
        </p>
        
        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs text-[#85A8C3] pt-2 border-t border-[#1E3A5F]/50">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{competition.participants} Joined</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-[#1E3A5F]/50 rounded text-[#E4EEF5] text-xs font-medium uppercase">
              {competition.entry_type}
            </span>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-xs text-[#85A8C3]">
          <Calendar className="w-3 h-3 text-[#3AB3FF]/60" />
          <span>{format(new Date(competition.start_at), 'MMM dd')} - {format(new Date(competition.end_at), 'MMM dd, yyyy')}</span>
        </div>

        {/* CTA Button */}
        <div className="pt-1">
          {getCtaButton()}
        </div>
      </div>
    </Card>
  );
};

export default CompetitionCard;
