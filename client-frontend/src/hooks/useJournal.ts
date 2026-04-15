import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchJournalDashboard, fetchJournalTrades, fetchJournalEntry, saveJournalEntry,
  createJournalEntry, bulkUpdateEntries, uploadScreenshot,
  fetchTagCategories, fetchTags, createTag, deleteTag,
  fetchSessions, fetchSession, saveSession,
  fetchCalendar, fetchSymbolPerformance, fetchTimePerformance, fetchTagPerformance,
  fetchEquityCurve, fetchCompliance, fetchDistribution, fetchHoldingTime,
  fetchMonteCarlo, fetchStreaks, fetchMFEMAE,
  fetchAIDailySummary, sendAIChat, fetchAIReport, fetchAIPatterns, sendAIWhatIf,
  fetchMentorAccess, grantMentorAccess, revokeMentorAccess, fetchReplayTrades,
  createShareLink, fetchShareLinks, deactivateShareLink, fetchPublicJournal,
} from '@/utils/journalApi';

const STALE = 30000;
const GC = 300000;

// Dashboard
export const useJournalDashboard = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalDashboard', enrollmentId],
    queryFn: () => fetchJournalDashboard(enrollmentId),
    staleTime: STALE,
    gcTime: GC,
    refetchOnWindowFocus: false,
  });

// Trades
export const useJournalTrades = (
  enrollmentId?: string,
  filters?: Record<string, string>,
  page = 1,
  pageSize = 50
) =>
  useQuery({
    queryKey: ['journalTrades', enrollmentId, filters, page, pageSize],
    queryFn: () => fetchJournalTrades(enrollmentId, filters, page, pageSize),
    staleTime: STALE,
    gcTime: GC,
    refetchOnWindowFocus: false,
  });

export const useJournalEntry = (order: number | null, enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalEntry', order, enrollmentId],
    queryFn: () => fetchJournalEntry(order!, enrollmentId),
    enabled: !!order,
    staleTime: STALE,
  });

export const useSaveJournalEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ order, data, enrollmentId }: { order: number; data: any; enrollmentId?: string }) =>
      saveJournalEntry(order, data, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalTrades'] });
      qc.invalidateQueries({ queryKey: ['journalEntry'] });
      qc.invalidateQueries({ queryKey: ['journalDashboard'] });
    },
  });
};

export const useCreateJournalEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, enrollmentId }: { data: any; enrollmentId?: string }) =>
      createJournalEntry(data, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalTrades'] });
      qc.invalidateQueries({ queryKey: ['journalDashboard'] });
    },
  });
};

export const useBulkUpdate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, enrollmentId }: { data: any; enrollmentId?: string }) =>
      bulkUpdateEntries(data, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalTrades'] });
    },
  });
};

export const useUploadScreenshot = () =>
  useMutation({ mutationFn: uploadScreenshot });

// Tags
export const useTagCategories = () =>
  useQuery({
    queryKey: ['journalTagCategories'],
    queryFn: fetchTagCategories,
    staleTime: 300000,
  });

export const useTags = () =>
  useQuery({
    queryKey: ['journalTags'],
    queryFn: fetchTags,
    staleTime: STALE,
  });

export const useCreateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalTags'] }),
  });
};

export const useDeleteTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalTags'] }),
  });
};

// Sessions
export const useJournalSessions = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalSessions', enrollmentId],
    queryFn: () => fetchSessions(enrollmentId),
    staleTime: STALE,
  });

export const useJournalSession = (date: string | null, enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalSession', date, enrollmentId],
    queryFn: () => fetchSession(date!, enrollmentId),
    enabled: !!date,
    staleTime: STALE,
  });

export const useSaveSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, data, enrollmentId }: { date: string; data: any; enrollmentId?: string }) =>
      saveSession(date, data, enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalSessions'] });
      qc.invalidateQueries({ queryKey: ['journalSession'] });
      qc.invalidateQueries({ queryKey: ['journalCalendar'] });
    },
  });
};

// Analytics
export const useJournalCalendar = (month: string, enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalCalendar', month, enrollmentId],
    queryFn: () => fetchCalendar(month, enrollmentId),
    staleTime: STALE,
    gcTime: GC,
    refetchOnWindowFocus: false,
  });

export const useSymbolPerformance = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalSymbols', enrollmentId],
    queryFn: () => fetchSymbolPerformance(enrollmentId),
    staleTime: STALE,
  });

export const useTimePerformance = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalTime', enrollmentId],
    queryFn: () => fetchTimePerformance(enrollmentId),
    staleTime: STALE,
  });

export const useTagPerformance = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalTagPerf', enrollmentId],
    queryFn: () => fetchTagPerformance(enrollmentId),
    staleTime: STALE,
  });

export const useEquityCurve = (enrollmentId?: string, period = '30d') =>
  useQuery({
    queryKey: ['journalEquity', enrollmentId, period],
    queryFn: () => fetchEquityCurve(enrollmentId, period),
    staleTime: STALE,
    gcTime: GC,
    refetchOnWindowFocus: false,
  });

export const useCompliance = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalCompliance', enrollmentId],
    queryFn: () => fetchCompliance(enrollmentId),
    staleTime: STALE,
  });

export const useDistribution = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalDistribution', enrollmentId],
    queryFn: () => fetchDistribution(enrollmentId),
    staleTime: STALE,
  });

export const useHoldingTime = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalHolding', enrollmentId],
    queryFn: () => fetchHoldingTime(enrollmentId),
    staleTime: STALE,
  });

export const useMonteCarlo = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalMonteCarlo', enrollmentId],
    queryFn: () => fetchMonteCarlo(enrollmentId),
    staleTime: 60000,
  });

export const useStreaks = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalStreaks', enrollmentId],
    queryFn: () => fetchStreaks(enrollmentId),
    staleTime: STALE,
  });

export const useMFEMAE = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalMFEMAE', enrollmentId],
    queryFn: () => fetchMFEMAE(enrollmentId),
    staleTime: STALE,
  });

// AI
export const useAIDailySummary = (enrollmentId?: string, date?: string) =>
  useQuery({
    queryKey: ['journalAISummary', enrollmentId, date],
    queryFn: () => fetchAIDailySummary(enrollmentId, date),
    staleTime: 300000,
    enabled: !!enrollmentId,
  });

export const useAIChat = () =>
  useMutation({
    mutationFn: ({ question, enrollmentId }: { question: string; enrollmentId?: string }) =>
      sendAIChat(question, enrollmentId),
  });

export const useAIReport = (period: 'weekly' | 'monthly', enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalAIReport', period, enrollmentId],
    queryFn: () => fetchAIReport(period, enrollmentId),
    staleTime: 300000,
    enabled: !!enrollmentId,
  });

export const useAIPatterns = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalAIPatterns', enrollmentId],
    queryFn: () => fetchAIPatterns(enrollmentId),
    staleTime: 300000,
    enabled: !!enrollmentId,
  });

export const useAIWhatIf = () =>
  useMutation({
    mutationFn: ({ question, enrollmentId }: { question: string; enrollmentId?: string }) =>
      sendAIWhatIf(question, enrollmentId),
  });

// Mentor Access
export const useMentorAccess = (enrollmentId?: string) =>
  useQuery({
    queryKey: ['journalMentorAccess', enrollmentId],
    queryFn: () => fetchMentorAccess(enrollmentId),
    staleTime: STALE,
    enabled: !!enrollmentId,
  });

export const useGrantMentorAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: grantMentorAccess,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalMentorAccess'] }),
  });
};

export const useRevokeMentorAccess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeMentorAccess,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalMentorAccess'] }),
  });
};

// Share Links
export const useCreateShareLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => createShareLink(enrollmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalShareLinks'] }),
  });
};

export const useShareLinks = () =>
  useQuery({
    queryKey: ['journalShareLinks'],
    queryFn: fetchShareLinks,
    staleTime: STALE,
  });

export const useDeactivateShareLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deactivateShareLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalShareLinks'] }),
  });
};

export const usePublicJournal = (token: string) =>
  useQuery({
    queryKey: ['publicJournal', token],
    queryFn: () => fetchPublicJournal(token),
    staleTime: 60000,
    enabled: !!token,
  });

// Trade Replay
export const useReplayTrades = (enrollmentId?: string, date?: string) =>
  useQuery({
    queryKey: ['journalReplay', enrollmentId, date],
    queryFn: () => fetchReplayTrades(enrollmentId, date),
    staleTime: STALE,
    enabled: !!enrollmentId,
  });
