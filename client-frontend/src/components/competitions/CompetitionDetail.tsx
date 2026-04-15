import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Calendar, Trophy, Clock, Award, Copy, Check, Sparkles, ArrowLeft, Scroll, Gift, User, Building, Loader2, Key, Eye, EyeOff, X, Download } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { toast } from 'sonner';
import { CompetitionDetail as CompetitionDetailType } from '@/utils/api';
import CompetitionLeaderboard from './CompetitionLeaderboard';

interface CompetitionDetailProps {
  competition: CompetitionDetailType;
  onBack: () => void;
  onJoin: () => void;
  isJoining: boolean;
}

const CompetitionDetail: React.FC<CompetitionDetailProps> = ({ 
  competition, 
  onBack, 
  onJoin,
  isJoining 
}) => {
  const [showRules, setShowRules] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(competition.end_at);
      
      if (now >= target) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      
      return {
        days: differenceInDays(target, now),
        hours: differenceInHours(target, now) % 24,
        minutes: differenceInMinutes(target, now) % 60,
        seconds: differenceInSeconds(target, now) % 60,
      };
    };

    setCountdown(calculateTimeLeft());
    const timer = setInterval(() => setCountdown(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [competition.end_at]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success(`${fieldName} copied to clipboard`);
        return;
      }

      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        toast.success(`${fieldName} copied to clipboard`);
      } else {
        throw new Error("Fallback copy failed");
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      alert(`Copy this ${fieldName}: ${text}`);
    }
  };

  const handleDownloadMT5 = (platform: "Windows" | "Mac") => {
    const downloadUrls = {
      Windows: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe",
      Mac: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.dmg"
    };
    
    const url = downloadUrls[platform];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const CountdownBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-[#0B1622] border border-[#1E3A5F]/50 rounded-lg px-3 py-2 min-w-[50px]">
        <span className="text-xl md:text-2xl font-bold text-[#E4EEF5]">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] text-[#85A8C3] mt-1 uppercase">{label}</span>
    </div>
  );

  const PodiumCard = ({ rank, name, growth }: { rank: number; name: string; growth: number }) => {
    const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
    const colors = {
      1: 'from-[#FFD700]/30 via-[#FFD700]/20 to-[#FFD700]/5',
      2: 'from-[#C0C0C0]/30 via-[#C0C0C0]/20 to-[#C0C0C0]/5',
      3: 'from-[#CD7F32]/30 via-[#CD7F32]/20 to-[#CD7F32]/5',
    };
    const borderColors = {
      1: 'border-[#FFD700]/50 ring-[#FFD700]/20',
      2: 'border-[#C0C0C0]/50 ring-[#C0C0C0]/20',
      3: 'border-[#CD7F32]/50 ring-[#CD7F32]/20',
    };
    const badgeColors = {
      1: 'bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0B1622]',
      2: 'bg-gradient-to-br from-[#C0C0C0] to-[#808080] text-[#0B1622]',
      3: 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white',
    };
    const order = { 1: 'order-2', 2: 'order-1', 3: 'order-3' };
    const scale = { 1: 'scale-105', 2: 'scale-100', 3: 'scale-100' };
    
    const displayName = name.includes('@') ? name.split('@')[0] : name;
    const growthValue = Number(growth) || 0;
    
    return (
      <div className={`flex flex-col items-center ${order[rank as keyof typeof order]} ${scale[rank as keyof typeof scale]} transition-transform duration-300`}>
        {/* Crown for 1st place */}
        {rank === 1 && (
          <div className="mb-1 animate-pulse">
            <svg className="w-8 h-8 text-[#FFD700] drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1l3.22 6.636 7.28.96-5.28 5.084 1.28 7.32L12 17.27 5.5 21l1.28-7.32L1.5 8.596l7.28-.96L12 1z"/>
            </svg>
          </div>
        )}
        
        {/* Avatar Circle */}
        <div className={`relative mb-3 ${rank === 1 ? 'w-16 h-16' : 'w-12 h-12'}`}>
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${colors[rank as keyof typeof colors]} border-2 ${borderColors[rank as keyof typeof borderColors]} ring-2 flex items-center justify-center shadow-lg`}>
            <User className={`${rank === 1 ? 'w-7 h-7' : 'w-5 h-5'} text-[#E4EEF5]`} />
          </div>
          {/* Rank Badge */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${badgeColors[rank as keyof typeof badgeColors]} flex items-center justify-center text-xs font-bold shadow-md border border-[#0B1622]`}>
            {rank}
          </div>
        </div>
        
        {/* Name & Growth */}
        <div className="mb-2 text-center">
          <p className={`${rank === 1 ? 'text-sm' : 'text-xs'} font-semibold text-[#E4EEF5] truncate max-w-[90px]`} title={name}>
            {displayName}
          </p>
          <p className={`text-xs font-bold ${growthValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {growthValue >= 0 ? '+' : ''}{growthValue.toFixed(2)}%
          </p>
        </div>
        
        {/* Podium Stand */}
        <div className={`w-20 md:w-24 ${heights[rank as keyof typeof heights]} bg-gradient-to-t ${colors[rank as keyof typeof colors]} rounded-t-xl border-t-2 border-x-2 ${borderColors[rank as keyof typeof borderColors]} flex flex-col items-center justify-start pt-3`}>
          <Trophy className={`${rank === 1 ? 'w-6 h-6' : 'w-5 h-5'} ${rank === 1 ? 'text-[#FFD700]' : rank === 2 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="text-[#85A8C3] hover:text-[#E4EEF5] hover:bg-[#1E3A5F]/30 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Competitions
      </Button>

      {/* Banner with Organizer Logo - Full Width at Top */}
      <Card className="overflow-hidden bg-[#0B1622]/80 border-[#1E3A5F]/50 relative">
        {competition.banner && (
          <img 
            src={competition.banner} 
            alt={competition.title}
            className="w-full h-auto max-h-80 md:max-h-96 object-contain bg-[#0B1622]"
          />
        )}
        
        {/* Organizer Logo - Positioned at bottom-left of banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0B1622] via-[#0B1622]/80 to-transparent pt-16 pb-4 px-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-[#0B1622] bg-[#1E3A5F]/80 overflow-hidden shadow-xl ring-2 ring-[#3AB3FF]/30 flex-shrink-0">
              {competition.organizer_logo ? (
                <img 
                  src={competition.organizer_logo} 
                  alt={competition.organizer_name || 'Organizer'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#0B1622]">
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 text-[#3AB3FF]" />
                </div>
              )}
            </div>
            {competition.organizer_name && (
              <div className="mb-1">
                <p className="text-[#E4EEF5] font-semibold text-lg md:text-xl">{competition.organizer_name}</p>
                <span className="text-xs text-[#85A8C3] uppercase tracking-wider">Competition Organizer</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Countdown */}
          <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#E4EEF5] mb-4">{competition.title}</h1>
            
            {/* Countdown Timer */}
            <div className="mb-4">
              <p className="text-sm text-[#85A8C3] mb-2">Time Remaining</p>
              <div className="flex items-center gap-2">
                <CountdownBox value={countdown.days} label="Days" />
                <span className="text-[#3AB3FF] text-xl font-bold">:</span>
                <CountdownBox value={countdown.hours} label="Hours" />
                <span className="text-[#3AB3FF] text-xl font-bold">:</span>
                <CountdownBox value={countdown.minutes} label="Mins" />
                <span className="text-[#3AB3FF] text-xl font-bold">:</span>
                <CountdownBox value={countdown.seconds} label="Secs" />
              </div>
            </div>
          </Card>

          {/* Prize Pool Display */}
          <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
                <Trophy className="w-6 h-6 text-[#3AB3FF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#E4EEF5]">Prize Pool</h3>
            </div>
            
            {/* Top Prizes Cards */}
            {competition.top_prizes && competition.top_prizes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {competition.top_prizes.slice(0, 4).map((prize, index) => {
                  const rankColors = [
                    { bg: 'from-[#FFD700]/20 to-[#FFD700]/5', border: 'border-[#FFD700]/40', icon: 'text-[#FFD700]', badge: 'bg-[#FFD700] text-[#0B1622]' },
                    { bg: 'from-[#C0C0C0]/20 to-[#C0C0C0]/5', border: 'border-[#C0C0C0]/40', icon: 'text-[#C0C0C0]', badge: 'bg-[#C0C0C0] text-[#0B1622]' },
                    { bg: 'from-[#CD7F32]/20 to-[#CD7F32]/5', border: 'border-[#CD7F32]/40', icon: 'text-[#CD7F32]', badge: 'bg-[#CD7F32] text-white' },
                    { bg: 'from-[#3AB3FF]/20 to-[#3AB3FF]/5', border: 'border-[#3AB3FF]/40', icon: 'text-[#3AB3FF]', badge: 'bg-[#3AB3FF] text-[#0B1622]' },
                  ];
                  const colorSet = rankColors[index] || rankColors[3];
                  const rankLabel = prize.rank_from === prize.rank_to 
                    ? `#${prize.rank_from}` 
                    : `#${prize.rank_from}-${prize.rank_to}`;
                  
                  return (
                    <div 
                      key={index}
                      className={`relative bg-gradient-to-br ${colorSet.bg} rounded-xl border ${colorSet.border} p-3 text-center overflow-hidden hover:scale-[1.02] transition-transform duration-200`}
                    >
                      {/* Rank Badge */}
                      <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full ${colorSet.badge} text-[10px] font-bold mb-2`}>
                        {rankLabel}
                      </div>
                      
                      {/* Trophy/Gift Icon */}
                      <div className="flex justify-center mb-1.5">
                        {index < 3 ? (
                          <Trophy className={`w-6 h-6 ${colorSet.icon}`} />
                        ) : (
                          <Gift className={`w-6 h-6 ${colorSet.icon}`} />
                        )}
                      </div>
                      
                      {/* Prize Description */}
                      <p className="text-[#E4EEF5] font-semibold text-xs leading-tight">
                        {prize.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xl md:text-2xl font-bold text-[#E4EEF5] whitespace-pre-wrap leading-relaxed">{competition.prize_pool_text}</p>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              className="flex-1 border-[#1E3A5F] text-[#E4EEF5] bg-[#0B1622]/80 hover:bg-[#3AB3FF]/10 hover:border-[#3AB3FF] hover:text-[#3AB3FF] transition-all duration-300"
              onClick={() => setShowPrizes(true)}
            >
              <Gift className="w-4 h-4 mr-2 text-[#3AB3FF]" />
              View Prizes
            </Button>
            <Button 
              variant="outline"
              className="flex-1 border-[#1E3A5F] text-[#E4EEF5] bg-[#0B1622]/80 hover:bg-[#3AB3FF]/10 hover:border-[#3AB3FF] hover:text-[#3AB3FF] transition-all duration-300"
              onClick={() => setShowRules(true)}
            >
              <Scroll className="w-4 h-4 mr-2 text-[#3AB3FF]" />
              View Rules
            </Button>
          </div>

          {/* Join Button or MT5 Credentials */}
          {competition.is_joined ? (
            <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 w-fit">
                    <Check className="w-3 h-3 mr-1" />
                    Registered
                  </Badge>
                  <span className="text-[#85A8C3] text-sm">You have joined this competition</span>
                </div>
                
                {competition.mt5_login && (
                  <Button 
                    className="bg-[#3AB3FF] text-white font-medium hover:bg-[#2A9FE8] hover:shadow-lg hover:shadow-[#3AB3FF]/30 transition-all duration-300 w-full sm:w-auto"
                    onClick={() => setShowCredentials(true)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Credentials
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Button 
              className="w-full h-14 bg-[#3AB3FF] hover:bg-[#3AB3FF]/90 text-white shadow-lg shadow-[#3AB3FF]/20 text-lg font-semibold"
              onClick={onJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Join Competition
                </>
              )}
            </Button>
          )}

          {/* Description */}
          {competition.full_description && (
            <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-6">
              <h3 className="text-lg font-semibold text-[#E4EEF5] mb-3">About</h3>
              <p className="text-[#85A8C3] whitespace-pre-wrap">{competition.full_description}</p>
            </Card>
          )}

          {/* Leaderboard Section */}
          <CompetitionLeaderboard 
            competitionId={competition.id} 
            competitionStatus={competition.status}
            startAt={competition.start_at}
            endAt={competition.end_at}
          />
        </div>

        {/* Right Column - Podium & Info */}
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {competition.top_three && competition.top_three.length > 0 && (
            <Card className="bg-gradient-to-br from-[#0B1622]/90 to-[#0B1622]/70 border-[#1E3A5F]/50 p-6 overflow-hidden relative">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-transparent to-[#3AB3FF]/5 pointer-events-none" />
              
              <h3 className="text-lg font-semibold text-[#E4EEF5] mb-6 flex items-center gap-2 relative z-10">
                <div className="p-2 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20">
                  <Award className="w-5 h-5 text-[#FFD700]" />
                </div>
                Top Performers
              </h3>
              <div className="flex items-end justify-center gap-3 pt-6 pb-2 relative z-10">
                {competition.top_three.map((trader) => (
                  <PodiumCard 
                    key={trader.rank}
                    rank={trader.rank}
                    name={trader.name}
                    growth={trader.growth_percent}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Tournament Info */}
          <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-6">
            <h3 className="text-lg font-semibold text-[#E4EEF5] mb-4">Tournament Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#85A8C3]">
                  <Users className="w-4 h-4" />
                  <span>Participants</span>
                </div>
                <span className="text-[#E4EEF5] font-semibold">{competition.participants}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#85A8C3]">
                  <Gift className="w-4 h-4" />
                  <span>Entry Type</span>
                </div>
                <Badge className="bg-[#1E3A5F]/50 text-[#E4EEF5] border-[#1E3A5F] uppercase font-medium">
                  {competition.entry_type}
                </Badge>
              </div>
              
              {competition.organizer_name && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#85A8C3]">
                    <Building className="w-4 h-4" />
                    <span>Organizer</span>
                  </div>
                  <span className="text-[#E4EEF5] font-semibold">{competition.organizer_name}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-[#1E3A5F]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#85A8C3]">
                    <Calendar className="w-4 h-4" />
                    <span>Start Date</span>
                  </div>
                  <span className="text-[#E4EEF5]">{format(new Date(competition.start_at), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#85A8C3]">
                    <Clock className="w-4 h-4" />
                    <span>End Date</span>
                  </div>
                  <span className="text-[#E4EEF5]">{format(new Date(competition.end_at), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Rules Modal */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-[#0B1622] border-[#1E3A5F] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-[#1E3A5F]/50 flex-shrink-0">
            <DialogTitle className="text-xl text-[#E4EEF5] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
                <Scroll className="w-5 h-5 text-[#3AB3FF]" />
              </div>
              Competition Rules
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 overflow-y-auto flex-1">
            <div className="text-[#85A8C3] whitespace-pre-wrap leading-relaxed">
              {competition.rules_markdown || 'No rules specified for this competition.'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prizes Modal */}
      <Dialog open={showPrizes} onOpenChange={setShowPrizes}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-[#0B1622] border-[#1E3A5F] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-[#1E3A5F]/50 flex-shrink-0">
            <DialogTitle className="text-xl text-[#E4EEF5] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
                <Gift className="w-5 h-5 text-[#3AB3FF]" />
              </div>
              Prize Pool
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 overflow-y-auto flex-1">
            {competition.top_prizes && competition.top_prizes.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {competition.top_prizes.map((prize, index) => {
                  const rankStyles = [
                    { bg: 'from-[#FFD700]/20 via-[#FFD700]/10 to-transparent', border: 'border-[#FFD700]/40', icon: 'text-[#FFD700]', badge: 'bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0B1622]', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.15)]' },
                    { bg: 'from-[#C0C0C0]/20 via-[#C0C0C0]/10 to-transparent', border: 'border-[#C0C0C0]/40', icon: 'text-[#C0C0C0]', badge: 'bg-gradient-to-br from-[#C0C0C0] to-[#808080] text-[#0B1622]', glow: 'shadow-[0_0_20px_rgba(192,192,192,0.15)]' },
                    { bg: 'from-[#CD7F32]/20 via-[#CD7F32]/10 to-transparent', border: 'border-[#CD7F32]/40', icon: 'text-[#CD7F32]', badge: 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-white', glow: 'shadow-[0_0_20px_rgba(205,127,50,0.15)]' },
                    { bg: 'from-[#3AB3FF]/20 via-[#3AB3FF]/10 to-transparent', border: 'border-[#3AB3FF]/40', icon: 'text-[#3AB3FF]', badge: 'bg-gradient-to-br from-[#3AB3FF] to-[#1E90FF] text-[#0B1622]', glow: 'shadow-[0_0_20px_rgba(58,179,255,0.15)]' },
                  ];
                  const style = rankStyles[index] || rankStyles[3];
                  const rankLabel = prize.rank_from === prize.rank_to 
                    ? `Rank #${prize.rank_from}` 
                    : `Rank #${prize.rank_from} - #${prize.rank_to}`;
                  
                  return (
                    <div 
                      key={index}
                      className={`relative bg-gradient-to-br ${style.bg} rounded-xl border ${style.border} p-4 overflow-hidden ${style.glow} hover:scale-[1.02] transition-transform duration-200`}
                    >
                      {/* Decorative corner accent */}
                      <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl ${style.bg} opacity-50 rounded-bl-full`} />
                      
                      {/* Rank Badge */}
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${style.badge} text-[10px] font-bold mb-3`}>
                        <Award className="w-3 h-3" />
                        {rankLabel}
                      </div>
                      
                      {/* Trophy/Gift Icon */}
                      <div className="flex justify-center mb-2">
                        <div className={`p-2.5 rounded-full bg-[#0B1622]/50 border ${style.border}`}>
                          {index < 3 ? (
                            <Trophy className={`w-6 h-6 ${style.icon}`} />
                          ) : (
                            <Gift className={`w-6 h-6 ${style.icon}`} />
                          )}
                        </div>
                      </div>
                      
                      {/* Prize Description */}
                      <p className="text-[#E4EEF5] font-bold text-center text-sm leading-tight">
                        {prize.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            
            {competition.short_description && (
              <p className="text-[#85A8C3] leading-relaxed mt-6 pt-4 border-t border-[#1E3A5F]/30">{competition.short_description}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      {showCredentials && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-12 md:pt-16 lg:pt-20 p-3 md:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCredentials(false)}
        >
          <div className="flex flex-col items-end gap-5 w-full max-w-[360px] p-4 md:p-5 pb-6 md:pb-7 rounded-2xl border border-[#1B3342] bg-[#0E1E23] shadow-[0_0_30px_rgba(0,0,0,0.35)] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col items-start gap-3 w-full">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base md:text-lg font-medium text-[#E4EEF5] tracking-tight">
                  Trading Credentials
                </h2>
                <button
                  onClick={() => setShowCredentials(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>

              {/* Competition Info */}
              <div className="flex items-center gap-2 w-full">
                <div className="w-3.5 h-3.5 rounded-full bg-[#1BBF99]" />
                <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight truncate">
                  {competition.title}
                </span>
              </div>
            </div>

            {/* Credential Fields */}
            <div className="flex flex-col items-start gap-2 w-full">
              {/* Server */}
              {competition.mt5_server && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="text-xs font-medium text-[#85A8C3] tracking-tight leading-6">Server</span>
                  </div>
                  <div className="flex items-center gap-2 h-11 px-3 md:px-4 pr-2 md:pr-3 rounded-[9px] border border-[#354B5F] bg-transparent">
                    <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight min-w-0 truncate">{competition.mt5_server}</span>
                    <button
                      onClick={() => copyToClipboard(competition.mt5_server!, "Server")}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Login */}
              {competition.mt5_login && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="text-xs font-medium text-[#85A8C3] tracking-tight leading-6">Login</span>
                  </div>
                  <div className="flex items-center gap-2 h-11 px-3 md:px-4 pr-2 md:pr-3 rounded-[9px] border border-[#354B5F] bg-transparent">
                    <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight min-w-0 truncate">{competition.mt5_login}</span>
                    <button
                      onClick={() => copyToClipboard(competition.mt5_login!, "Login")}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Password */}
              {competition.mt5_password && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="text-xs font-medium text-[#85A8C3] tracking-tight leading-6">Password</span>
                  </div>
                  <div className="flex items-center gap-2 h-11 px-3 md:px-4 pr-2 md:pr-3 rounded-[9px] border border-[#354B5F] bg-transparent">
                    <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight min-w-0 truncate">
                      {showPassword ? competition.mt5_password : "••••••••••••••"}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-white" strokeWidth={1.5} />
                        ) : (
                          <Eye className="w-5 h-5 text-white" strokeWidth={1.5} />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(competition.mt5_password!, "Password")}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                      >
                        <Copy className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Investor Password */}
              {competition.mt5_investor_password && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="text-xs font-medium text-[#85A8C3] tracking-tight leading-6">Investor Password</span>
                  </div>
                  <div className="flex items-center gap-2 h-11 px-3 md:px-4 pr-2 md:pr-3 rounded-[9px] border border-[#354B5F] bg-transparent">
                    <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight min-w-0 truncate">{competition.mt5_investor_password}</span>
                    <button
                      onClick={() => copyToClipboard(competition.mt5_investor_password!, "Investor Password")}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
                    >
                      <Copy className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Download MT5 Section */}
            <div className="flex flex-col items-start gap-3 w-full pt-2 border-t border-[#354B5F]/30">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-white" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#85A8C3] tracking-tight">
                  Download Platform 5
                </span>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => handleDownloadMT5("Windows")}
                  className="flex items-center justify-center gap-2 w-full h-11 px-4 rounded-[9px] border border-[#354B5F] bg-transparent hover:bg-[#28BFFF]/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.545L9.818 2.182v9.818H0V3.545zM10.909 2.182L24 0v9.818H10.909V2.182zM0 12.182h9.818V22L0 20.636V12.182zM10.909 12.182H24V24l-13.091-1.818V12.182z"/>
                  </svg>
                  <span className="text-sm font-normal text-[#E4EEF5] tracking-tight">
                    Download Platform 5 for Windows
                  </span>
                </button>
                <button
                  onClick={() => handleDownloadMT5("Mac")}
                  className="flex items-center justify-center gap-2 w-full h-11 px-4 rounded-[9px] border border-[#354B5F] bg-transparent hover:bg-[#28BFFF]/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-sm font-normal text-[#E4EEF5] tracking-tight">
                    Download Platform 5 for Mac
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionDetail;
