import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftRight, Users, Target } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { hedgingService } from '@/services/hedgingService';
import { HedgingForm } from '@/components/hedging/HedgingForm';
import { HedgingResults } from '@/components/hedging/HedgingResults';
import { HedgingFindSimilarForm } from '@/components/hedging/HedgingFindSimilarForm';
import { HedgingFindSimilarResults } from '@/components/hedging/HedgingFindSimilarResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HedgingDetectResponse, HedgingFindSimilarResponse } from '@/lib/types/hedging';

// Helper to get default date range (last 24 hours)
const getDefaultDateRange = () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { from: yesterday, to: now };
};

const detectFormSchema = z.object({
  account_ids: z.string().min(1, 'At least 1 account ID is required'),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  window_seconds: z.number().min(1).max(60).default(5),
  min_pairs: z.number().min(1).max(100000).default(1),
  include_trades: z.boolean().default(true),
  max_pairs_per_account: z.number().min(1).max(200).default(50),
});

const findSimilarFormSchema = z.object({
  seed_account_id: z.string().min(1, 'Seed account ID is required'),
  date_from: z.date().optional(),
  date_to: z.date().optional(),
  window_seconds: z.number().min(1).max(60).default(5),
  min_matches: z.number().min(1).max(100000).default(2),
  max_results: z.number().min(1).max(200).default(20),
  include_evidence: z.boolean().default(true),
  max_evidence_per_account: z.number().min(1).max(100).default(20),
});

type DetectFormValues = z.infer<typeof detectFormSchema>;
type FindSimilarFormValues = z.infer<typeof findSimilarFormSchema>;

export default function Hedging() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'detect';

  const [isDetectLoading, setIsDetectLoading] = useState(false);
  const [detectResults, setDetectResults] = useState<HedgingDetectResponse | null>(null);

  const [isFindSimilarLoading, setIsFindSimilarLoading] = useState(false);
  const [findSimilarResults, setFindSimilarResults] = useState<HedgingFindSimilarResponse | null>(null);

  const defaultDates = getDefaultDateRange();

  const detectForm = useForm<DetectFormValues>({
    resolver: zodResolver(detectFormSchema),
    defaultValues: {
      account_ids: '',
      date_from: defaultDates.from,
      date_to: defaultDates.to,
      window_seconds: 5,
      min_pairs: 1,
      include_trades: true,
      max_pairs_per_account: 50,
    },
  });

  const findSimilarForm = useForm<FindSimilarFormValues>({
    resolver: zodResolver(findSimilarFormSchema),
    defaultValues: {
      seed_account_id: '',
      date_from: defaultDates.from,
      date_to: defaultDates.to,
      window_seconds: 5,
      min_matches: 2,
      max_results: 20,
      include_evidence: true,
      max_evidence_per_account: 20,
    },
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const onDetectSubmit = async (values: DetectFormValues) => {
    const accountIds = values.account_ids
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => id && /^\d+$/.test(id));

    if (accountIds.length === 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide at least 1 valid account ID (numeric only).',
        variant: 'destructive',
      });
      return;
    }

    if (accountIds.length > 500) {
      toast({
        title: 'Too Many Accounts',
        description: 'Maximum 500 account IDs allowed.',
        variant: 'destructive',
      });
      return;
    }

    setIsDetectLoading(true);
    try {
      const response = await hedgingService.detectHedging({
        account_ids: accountIds,
        date_from: values.date_from?.toISOString(),
        date_to: values.date_to?.toISOString(),
        window_seconds: values.window_seconds,
        min_pairs: values.min_pairs,
        include_trades: values.include_trades,
        max_pairs_per_account: values.max_pairs_per_account,
      });

      setDetectResults(response);

      const highCount = response.results.filter(r => r.severity === 'HIGH').length;
      const description = highCount > 0
        ? `Found hedging in ${response.accounts_flagged} account(s), ${highCount} high severity`
        : `Found hedging in ${response.accounts_flagged} account(s).`;

      toast({
        title: 'Analysis Complete',
        description,
        variant: highCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Detection Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDetectLoading(false);
    }
  };

  const onFindSimilarSubmit = async (values: FindSimilarFormValues) => {
    const seedId = values.seed_account_id.trim();
    if (!/^\d+$/.test(seedId)) {
      toast({
        title: 'Invalid Input',
        description: 'Seed account ID must be numeric.',
        variant: 'destructive',
      });
      return;
    }

    setIsFindSimilarLoading(true);
    try {
      const response = await hedgingService.findSimilarHedging({
        seed_account_id: seedId,
        date_from: values.date_from?.toISOString(),
        date_to: values.date_to?.toISOString(),
        window_seconds: values.window_seconds,
        min_matches: values.min_matches,
        max_results: values.max_results,
        include_evidence: values.include_evidence,
        max_evidence_per_account: values.max_evidence_per_account,
      });

      setFindSimilarResults(response);

      const highCount = response.similar_accounts.filter(a => a.severity === 'HIGH').length;
      const description = highCount > 0
        ? `Found ${response.similar_accounts_found} similar account(s), ${highCount} high severity`
        : `Found ${response.similar_accounts_found} similar account(s).`;

      toast({
        title: 'Analysis Complete',
        description: response.message || description,
        variant: highCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsFindSimilarLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-3 rounded-xl bg-primary/10 hidden sm:flex items-center justify-center">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Hedging Detection</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Detect hedging patterns (opposite-side trades on same symbol) within accounts to identify potential risk
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <TabsTrigger
              value="detect"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Bulk Detection</span>
            </TabsTrigger>
            <TabsTrigger
              value="find-similar"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-2"
            >
              <Target className="h-4 w-4" />
              <span>Find Similar</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="detect" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <HedgingForm form={detectForm} onSubmit={onDetectSubmit} isLoading={isDetectLoading} />
          {detectResults && <HedgingResults results={detectResults} />}
        </TabsContent>

        <TabsContent value="find-similar" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <HedgingFindSimilarForm form={findSimilarForm} onSubmit={onFindSimilarSubmit} isLoading={isFindSimilarLoading} />
          {findSimilarResults && <HedgingFindSimilarResults results={findSimilarResults} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
