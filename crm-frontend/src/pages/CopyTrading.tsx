import { useState, useEffect } from 'react';
 import { useForm } from 'react-hook-form';
 import { zodResolver } from '@hookform/resolvers/zod';
 import { z } from 'zod';
import { Users, Target } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
 import { toast } from '@/hooks/use-toast';
 import { copyTradingService } from '@/services/copyTradingService';
 import { CopyTradingForm } from '@/components/copy-trading/CopyTradingForm';
 import { CopyTradingResults } from '@/components/copy-trading/CopyTradingResults';
import { FindSimilarForm } from '@/components/copy-trading/FindSimilarForm';
import { FindSimilarResults } from '@/components/copy-trading/FindSimilarResults';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CopyTradingDetectResponse, FindSimilarResponse } from '@/lib/types/copyTrading';
 
const detectFormSchema = z.object({
   account_ids: z.string().min(1, 'At least 2 account IDs are required'),
   date_from: z.string().optional(),
   date_to: z.string().optional(),
   window_seconds: z.number().min(1).max(60).default(5),
   min_accounts: z.number().min(2).max(20).default(2),
   volume_tolerance_ratio: z.number().min(0).max(5).optional(),
   include_trades: z.boolean().default(true),
   max_trades_per_cluster: z.number().min(1).max(200).default(50),
 });
 
const findSimilarFormSchema = z.object({
  seed_account_id: z.string().min(1, 'Seed account ID is required'),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  window_seconds: z.number().min(1).max(60).default(5),
  min_matches: z.number().min(1).max(100000).default(3),
  max_results: z.number().min(1).max(200).default(20),
  include_trades: z.boolean().default(false),
});

type DetectFormValues = z.infer<typeof detectFormSchema>;
type FindSimilarFormValues = z.infer<typeof findSimilarFormSchema>;
 
 export default function CopyTrading() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'detect';
 
  const [isDetectLoading, setIsDetectLoading] = useState(false);
  const [detectResults, setDetectResults] = useState<CopyTradingDetectResponse | null>(null);

  const [isFindSimilarLoading, setIsFindSimilarLoading] = useState(false);
  const [findSimilarResults, setFindSimilarResults] = useState<FindSimilarResponse | null>(null);

  const detectForm = useForm<DetectFormValues>({
    resolver: zodResolver(detectFormSchema),
     defaultValues: {
       account_ids: '',
       window_seconds: 5,
       min_accounts: 2,
       include_trades: true,
       max_trades_per_cluster: 50,
     },
   });
 
  const findSimilarForm = useForm<FindSimilarFormValues>({
    resolver: zodResolver(findSimilarFormSchema),
    defaultValues: {
      seed_account_id: '',
      window_seconds: 5,
      min_matches: 3,
      max_results: 20,
      include_trades: true,
    },
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const onDetectSubmit = async (values: DetectFormValues) => {
     // Parse account IDs from textarea
     const accountIds = values.account_ids
       .split(/[\n,\s]+/)
       .map(id => id.trim())
       .filter(id => id && /^\d+$/.test(id));
 
     if (accountIds.length < 2) {
       toast({
         title: 'Invalid Input',
         description: 'Please provide at least 2 valid account IDs (numeric only).',
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
       const response = await copyTradingService.detectCopyTrading({
         account_ids: accountIds,
         date_from: values.date_from || undefined,
         date_to: values.date_to || undefined,
         window_seconds: values.window_seconds,
         min_accounts: values.min_accounts,
         volume_tolerance_ratio: values.volume_tolerance_ratio,
         include_trades: values.include_trades,
         max_trades_per_cluster: values.max_trades_per_cluster,
       });
 
      setDetectResults(response);
 
       const highCount = response.clusters.filter(c => c.severity === 'HIGH').length;
       const description = highCount > 0
         ? `Found ${response.clusters_found} cluster(s), ${highCount} high severity`
         : `Found ${response.clusters_found} copy trading cluster(s).`;
 
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
      const response = await copyTradingService.findSimilarAccounts({
        seed_account_id: seedId,
        date_from: values.date_from || undefined,
        date_to: values.date_to || undefined,
        window_seconds: values.window_seconds,
        min_matches: values.min_matches,
        max_results: values.max_results,
        include_trades: values.include_trades,
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
         <div className="p-3 rounded-xl bg-primary/10 hidden sm:block">
           <Users className="h-6 w-6 text-primary" />
         </div>
         <div>
           <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Copy Trading Detection</h1>
           <p className="text-sm sm:text-base text-muted-foreground mt-1">
             Detect potential copy trading patterns across multiple accounts
           </p>
         </div>
       </div>
 
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="detect" className="gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden xs:inline">Cluster</span> Detection
            </TabsTrigger>
            <TabsTrigger value="find-similar" className="gap-2 text-xs sm:text-sm">
              <Target className="h-4 w-4" />
              Find Similar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="detect" className="space-y-4 sm:space-y-6">
          <CopyTradingForm form={detectForm} onSubmit={onDetectSubmit} isLoading={isDetectLoading} />
          {detectResults && <CopyTradingResults results={detectResults} />}
        </TabsContent>

        <TabsContent value="find-similar" className="space-y-4 sm:space-y-6">
          <FindSimilarForm form={findSimilarForm} onSubmit={onFindSimilarSubmit} isLoading={isFindSimilarLoading} />
          {findSimilarResults && <FindSimilarResults results={findSimilarResults} />}
        </TabsContent>
      </Tabs>
     </div>
   );
 }