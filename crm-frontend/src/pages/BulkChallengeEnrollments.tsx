import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileText, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface BulkImportResult {
  row: number;
  email?: string;
  status: 'success' | 'failed';
  error?: string;
}

interface BulkImportResponse {
  total: number;
  success: number;
  failed: number;
  results: BulkImportResult[];
}

const BulkChallengeEnrollments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<BulkImportResponse | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiService.uploadFile<BulkImportResponse>(
        '/admin/challenges/bulk-import/',
        formData,
        'POST'
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: 'Upload Complete',
        description: `${data.success} enrollments created successfully, ${data.failed} failed.`,
        variant: data.failed === 0 ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please upload a CSV file.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setResults(null);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Challenge Name,Account Size,Full Name,Email Address
Two-Step 50K,50000,John Doe,john@example.com
One-Step 20K,20000,Alice Smith,alice@example.com`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_enrollment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Create Bulk Challenge Enrollments"
        subtitle="Upload a CSV file to create multiple challenge enrollments at once"
      />

      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate('/challenges')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Challenges
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Download the template below and fill it with your enrollment data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>CSV Format:</strong> The file must contain the following columns:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Challenge Name</li>
                  <li>Account Size</li>
                  <li>Full Name</li>
                  <li>Email Address</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full sm:w-auto"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload and Create Enrollments
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
              <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                <Badge variant="outline">Total: {results.total}</Badge>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Success: {results.success}
                </Badge>
                {results.failed > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed: {results.failed}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.row}</TableCell>
                        <TableCell>{result.email || '-'}</TableCell>
                        <TableCell>
                          {result.status === 'success' ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.error && (
                            <span className="text-sm text-destructive">
                              {result.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default BulkChallengeEnrollments;
