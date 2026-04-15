import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation } from '@tanstack/react-query';
import { payoutConfigImportService } from '@/services/payoutConfigImportService';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { PayoutConfigImportResponse } from '@/lib/types/payoutConfigImport';

const PayoutConfigImport = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<PayoutConfigImportResponse | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => payoutConfigImportService.importPayoutConfigs(file),
    onSuccess: (data) => {
      setImportResult(data);
      toast.success(`Import completed: ${data.detail}`);
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    importMutation.mutate(selectedFile);
  };

  const downloadTemplate = () => {
    const headers = ['MT5 ID', 'DATE', 'SHARE'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payout_config_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadSample = () => {
    const headers = ['MT5 ID', 'DATE', 'SHARE'];
    const sampleData = [
      headers.join(','),
      '12345678,2024-01-15,75',
      '87654321,2024-02-01,80',
      '11223344,2024-01-20,70'
    ];
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payout_config_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (processed: number, total: number, errors: any[]) => {
    if (errors.length === 0) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    } else if (processed > 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Payout Configuration Import
          </CardTitle>
          <CardDescription>
            Bulk import payout configurations from CSV file. Required columns: MT5 ID, DATE, SHARE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importMutation.isPending}
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format:</strong> The file must contain columns: "MT5 ID", "DATE" (YYYY-MM-DD), "SHARE" (percentage)
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="flex-1"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Payout Configurations
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            
            <Button variant="outline" onClick={downloadSample}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Import Results
              {getStatusBadge(
                parseInt(importResult.detail.split('/')[0].split(' ')[1]),
                parseInt(importResult.detail.split('/')[1].split(' ')[0]),
                importResult.errors
              )}
            </CardTitle>
            <CardDescription>
              Import ID: {importResult.log_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {importResult.detail}
              </AlertDescription>
            </Alert>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Errors ({importResult.errors.length})</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-destructive">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutConfigImport;