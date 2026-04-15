import { useQuery } from '@tanstack/react-query';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { SoftBreachTable, HardBreachTable } from '@/components/risk/RealBreachTable';
import { SoftBreach, HardBreach } from '@/lib/types/djangoRisk';

interface BreachHistoryTabProps {
  enrollmentId: string;
}

interface BreachHistoryResponse {
  enrollment_id: string;
  challenge_name: string;
  client_name: string;
  hard_breaches: HardBreach[];
  soft_breaches: SoftBreach[];
}

const BreachHistoryTab = ({ enrollmentId }: BreachHistoryTabProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['breach-history', enrollmentId],
    queryFn: () => enrollmentReviewService.getBreachHistory(enrollmentId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load breach history. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const breachData: BreachHistoryResponse = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Breach History Overview</CardTitle>
          <CardDescription>
            All breach records for {breachData?.client_name} - {breachData?.challenge_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Hard Breaches</p>
              <p className="text-2xl font-bold">{breachData?.hard_breaches?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Soft Breaches</p>
              <p className="text-2xl font-bold">{breachData?.soft_breaches?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hard Breaches</CardTitle>
          <CardDescription>
            Critical rule violations that resulted in account breaches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HardBreachTable breaches={breachData?.hard_breaches || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Soft Breaches</CardTitle>
          <CardDescription>
            Warning-level violations detected during trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SoftBreachTable breaches={breachData?.soft_breaches || []} />
        </CardContent>
      </Card>
    </div>
  );
};

export default BreachHistoryTab;
