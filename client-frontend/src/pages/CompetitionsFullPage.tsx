import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchCompetitions, fetchCompetitionDetail, joinCompetition } from '@/utils/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, Timer, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CompetitionCard from '@/components/competitions/CompetitionCard';
import CompetitionDetail from '@/components/competitions/CompetitionDetail';

const CompetitionsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

  const { data: competitions, isLoading } = useQuery({
    queryKey: ['competitions', activeTab],
    queryFn: () => fetchCompetitions(activeTab),
  });

  const { data: competitionDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['competition-detail', selectedCompetitionId],
    queryFn: () => fetchCompetitionDetail(selectedCompetitionId!),
    enabled: !!selectedCompetitionId,
  });

  const joinMutation = useMutation({
    mutationFn: joinCompetition,
    onSuccess: () => {
      toast.success('Successfully joined the competition!');
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['competition-detail', selectedCompetitionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to join competition');
    },
  });

  const tabs = [
    { id: 'ongoing', label: 'Ongoing', icon: Flame },
    { id: 'upcoming', label: 'Upcoming', icon: Timer },
    { id: 'my', label: 'My Competitions', icon: Star },
    { id: 'ended', label: 'Ended', icon: Trophy },
  ];

  const CompetitionCardSkeleton = () => (
    <Card className="overflow-hidden bg-[#0B1622]/80 border-[#1E3A5F]/50">
      <Skeleton className="h-36 w-full rounded-none bg-[#1E3A5F]/30" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-[#1E3A5F]/30" />
        <Skeleton className="h-10 w-full bg-[#1E3A5F]/30" />
        <Skeleton className="h-4 w-full bg-[#1E3A5F]/30" />
        <Skeleton className="h-4 w-2/3 bg-[#1E3A5F]/30" />
        <Skeleton className="h-10 w-full bg-[#1E3A5F]/30" />
      </div>
    </Card>
  );

  // Show detail view if a competition is selected
  if (selectedCompetitionId) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-[100px] rounded-[16px_0px_0px_0px] border-t border-solid border-l">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-[#3AB3FF]" />
            </div>
          ) : competitionDetail ? (
            <CompetitionDetail 
              competition={competitionDetail}
              onBack={() => setSelectedCompetitionId(null)}
              onJoin={() => joinMutation.mutate(competitionDetail.id)}
              isJoining={joinMutation.isPending}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-[#85A8C3]">Competition not found</p>
              <Button 
                variant="outline"
                onClick={() => setSelectedCompetitionId(null)}
                className="mt-4 border-[#3AB3FF]/50 text-[#3AB3FF]"
              >
                Back to Competitions
              </Button>
            </div>
          )}
        </main>
    );
  }

  return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-[100px] rounded-[16px_0px_0px_0px] border-t border-solid border-l">
        {/* Header */}
        <header className="flex w-full items-center justify-between flex-wrap mb-6 md:mb-8">
          <div className="flex items-center gap-3 text-2xl md:text-[32px] text-[#E4EEF5] font-medium tracking-[-0.96px]">
            <div className="p-2 rounded-xl bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset]">
              <Trophy className="w-6 h-6 md:w-8 md:h-8 text-[#3AB3FF]" />
            </div>
            <div>
              <h1 className="text-[#E4EEF5]">Competitions</h1>
              <p className="text-sm text-[#85A8C3] font-normal tracking-normal">Compete with traders worldwide</p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-[#0B1622]/80 border border-[#1E3A5F]/50 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300
                  ${isActive 
                    ? 'bg-[#3AB3FF] text-white shadow-lg shadow-[#3AB3FF]/20' 
                    : 'text-[#85A8C3] hover:text-[#E4EEF5] hover:bg-[#1E3A5F]/30'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Competition Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <CompetitionCardSkeleton key={i} />
            ))}
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {competitions.map((competition) => (
              <CompetitionCard 
                key={competition.id} 
                competition={competition}
                onSelect={setSelectedCompetitionId}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-12 md:p-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 w-fit mx-auto">
                <Trophy className="w-12 h-12 text-[#3AB3FF]/50" />
              </div>
              <h3 className="text-xl font-semibold text-[#E4EEF5]">
                No competitions found
              </h3>
              <p className="text-[#85A8C3]">
                {activeTab === 'my' 
                  ? "You haven't joined any competitions yet. Browse ongoing competitions to get started!"
                  : `No ${activeTab} competitions at the moment. Check back soon!`}
              </p>
              {activeTab === 'my' && (
                <Button 
                  onClick={() => setActiveTab('ongoing')}
                  className="mt-4 bg-[#3AB3FF] hover:bg-[#3AB3FF]/90 text-white"
                >
                  Browse Competitions
                </Button>
              )}
            </div>
          </Card>
        )}
      </main>
  );
};

export default CompetitionsPage;
