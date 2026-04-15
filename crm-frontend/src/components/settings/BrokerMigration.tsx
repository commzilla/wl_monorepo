import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AlertCircle, CheckCircle, History, FileDown } from 'lucide-react';
import { apiService } from '@/services/apiService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';

interface BrokerMigrationResult {
  message: string;
  results: Array<{
    old_mt5_id: string;
    new_mt5_id: string;
    email?: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

interface MT5MigrationLog {
  id: number;
  old_mt5_id: string;
  new_mt5_id: string;
  generate_password: boolean;
  status: 'pending' | 'success' | 'failed';
  client_email?: string;
  main_password?: string;
  investor_password?: string;
  remarks?: string;
  error_message?: string;
  processed_at: string;
}

interface MT5MigrationLogsResponse {
  count: number;
  page: number;
  page_size: number;
  results: MT5MigrationLog[];
}

const BrokerMigration = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BrokerMigrationResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: logsData, refetch: refetchLogs } = useQuery<MT5MigrationLogsResponse>({
    queryKey: ['mt5-migration-logs', logsPage, statusFilter],
    queryFn: async () => {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await apiService.get<MT5MigrationLogsResponse>(
        `/admin/migration/mt5-broker/logs/?page=${logsPage}&page_size=25${statusParam}`
      );
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
    enabled: showLogs,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive"
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiService.uploadFile<BrokerMigrationResult>(
        '/admin/migration/mt5-broker/',
        formData
      );
      
      if (response.error) {
        toast({
          title: "Upload failed",
          description: response.error,
          variant: "destructive"
        });
      } else if (response.data) {
        setResult(response.data);
        const successCount = response.data.results.filter(r => r.status === 'success').length;
        const failedCount = response.data.results.filter(r => r.status === 'failed').length;
        
        toast({
          title: "Migration completed",
          description: `Success: ${successCount}, Failed: ${failedCount}`,
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Failed to connect to the server.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['old_mt5_id', 'new_mt5_id', 'generate_password'];
    const example = ['369372111', '369372222', 'Y'];
    const csvContent = headers.join(',') + '\n' + example.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'broker_migration_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportLogs = () => {
    if (!logsData?.results.length) return;

    const headers = ['Old MT5 ID', 'New MT5 ID', 'Client Email', 'Status', 'Password Generated', 'Processed At', 'Remarks'];
    const rows = logsData.results.map(log => [
      log.old_mt5_id,
      log.new_mt5_id,
      log.client_email || '-',
      log.status,
      log.generate_password ? 'Yes' : 'No',
      new Date(log.processed_at).toLocaleString(),
      log.error_message || log.remarks || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const statusSuffix = statusFilter !== 'all' ? `_${statusFilter}` : '';
    a.download = `mt5_migration_logs${statusSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const successCount = result?.results.filter(r => r.status === 'success').length || 0;
  const failedCount = result?.results.filter(r => r.status === 'failed').length || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="broker-csv-file">CSV File</Label>
          <Input
            id="broker-csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-2"
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>

          <Dialog open={showLogs} onOpenChange={setShowLogs}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                View Migration Logs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[95vw] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Broker Migration Logs</DialogTitle>
                <DialogDescription>
                  View all MT5 account migration history
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportLogs}
                  disabled={!logsData?.results.length}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              
              {logsData && (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Old MT5 ID</TableHead>
                          <TableHead>New MT5 ID</TableHead>
                          <TableHead>Client Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Password Generated</TableHead>
                          <TableHead>Processed At</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logsData.results.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono">{log.old_mt5_id}</TableCell>
                            <TableCell className="font-mono">{log.new_mt5_id}</TableCell>
                            <TableCell>{log.client_email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                log.status === 'success' ? 'default' : 
                                log.status === 'failed' ? 'destructive' : 
                                'secondary'
                              }>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.generate_password ? 'Yes' : 'No'}</TableCell>
                            <TableCell className="text-sm">
                              {new Date(log.processed_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.error_message || log.remarks || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {logsData.results.length} of {logsData.count} results
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage === 1}
                        onClick={() => setLogsPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage * logsData.page_size >= logsData.count}
                        onClick={() => setLogsPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">CSV Format Requirements</h3>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">old_mt5_id</Badge>
            <Badge variant="outline">new_mt5_id</Badge>
            <Badge variant="outline">generate_password</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>generate_password:</strong> Use "Y" to generate new passwords, "N" to keep existing ones
          </p>
        </div>
      </div>

      {result && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Migration Results</h3>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium">{result.message}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {successCount > 0 && (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        ✓ {successCount} Success
                      </Badge>
                    )}
                    {failedCount > 0 && (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                        ✗ {failedCount} Failed
                      </Badge>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {failedCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium">Migration errors:</p>
                    <div className="max-h-60 overflow-y-auto space-y-2 bg-red-50 p-3 rounded border">
                      {result.results
                        .filter(r => r.status === 'failed')
                        .map((r, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex gap-2">
                              <span className="font-semibold text-red-800">
                                {r.old_mt5_id} → {r.new_mt5_id}:
                              </span>
                              <span className="text-red-700">{r.error}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BrokerMigration;
