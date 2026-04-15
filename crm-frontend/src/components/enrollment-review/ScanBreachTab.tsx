import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, Clock, Play, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ScanResult {
  rule: string;
  status: 'breached' | 'passed' | 'skipped';
  reason?: string;
  stats?: Record<string, any>;
}

interface ScanBreachTabProps {
  enrollmentId: string;
}

const ScanBreachTab: React.FC<ScanBreachTabProps> = ({ enrollmentId }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedRules = ['Max Daily Loss', 'Max Total Loss', 'Inactivity'];

  const startScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setCurrentCheck(null);
    setResults([]);
    setProgress(0);
    setIsDone(false);
    setError(null);

    try {
      // Get auth token using the same key as apiService.ts
      const token = localStorage.getItem('access');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Starting breach scan for enrollment:', enrollmentId);

      // Simulate progressive checking for better UX
      setCurrentCheck('Initializing scan...');
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await fetch(
        `https://api.we-fund.com/admin/enrollments/manual-breach-scan/${enrollmentId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh the page and try again.');
        }
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Keep default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Received scan results:', data);

      if (data.error) {
        setError(data.error);
        setIsScanning(false);
        toast.error(`Scan failed: ${data.error}`);
        return;
      }

      // Process results with simulated progressive updates for better UX
      const rules = data.rules || [];
      let progressStep = 0;
      const stepSize = 100 / Math.max(rules.length, 1);

      for (const rule of rules) {
        setCurrentCheck(`Processing ${rule.rule}...`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing time

        setResults(prev => [...prev, {
          rule: rule.rule,
          status: rule.status,
          reason: rule.reason,
          stats: rule.stats
        }]);

        progressStep += stepSize;
        setProgress(progressStep);
      }

      // Complete the scan
      setIsDone(true);
      setIsScanning(false);
      setCurrentCheck(null);
      setProgress(100);
      toast.success('Breach scan completed');

    } catch (err) {
      console.error('Fetch error:', err);
      
      // More specific error handling
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - please check your connection or try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(`Connection error: ${errorMessage}`);
      setIsScanning(false);
      setCurrentCheck(null);
      toast.error(`Connection error: ${errorMessage}`);
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    setCurrentCheck(null);
    toast.info('Scan stopped');
  };

  // No cleanup needed for regular fetch requests

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'breached':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'skipped':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'breached':
        return <Badge variant="destructive">Breached</Badge>;
      case 'passed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Passed</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Skipped</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Breach Scan
            </CardTitle>
            <div className="flex items-center gap-2">
              {!isScanning ? (
                <Button onClick={startScan} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Start Scan
                </Button>
              ) : (
                <Button variant="outline" onClick={stopScan} className="flex items-center gap-2">
                  <StopCircle className="h-4 w-4" />
                  Stop Scan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {isScanning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Scan Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {currentCheck && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Checking: {currentCheck}
                </div>
              )}
            </div>
          )}

          {isDone && results.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              No scan results available
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <CardTitle className="text-lg">{result.rule}</CardTitle>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
                    <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-line">
                      {result.reason}
                    </div>
                  </div>
                )}
                
                {result.stats && Object.keys(result.stats).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Statistics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(result.stats).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize text-muted-foreground">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="font-medium">
                            {typeof value === 'number' && key.includes('balance') || key.includes('equity') || key.includes('threshold') 
                              ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanBreachTab;