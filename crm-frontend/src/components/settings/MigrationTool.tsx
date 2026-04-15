import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, AlertCircle, CheckCircle, Download, History, Mail, ExternalLink, Users, FileSpreadsheet, Server } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import PayoutConfigImport from './PayoutConfigImport';
import BrokerMigration from './BrokerMigration';

interface MigrationResult {
  batch_id: string;
  created: number;
  skipped: number;
  errors: Array<{
    row: number;
    errors: Array<Record<string, string[]> | string>;
  }>;
}

const MigrationTool = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  // Helper function to format error messages
  const formatErrorMessage = (errors: Array<Record<string, string[]> | string>): string => {
    return errors.map(error => {
      if (typeof error === 'string') {
        return error;
      } else if (typeof error === 'object') {
        return Object.entries(error).map(([field, messages]) => 
          `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
        ).join('; ');
      }
      return JSON.stringify(error);
    }).join(' | ');
  };
  const sendEmailsMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await apiService.post('/admin/migration/send-emails/', { batch_id: batchId });
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to send emails');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Emails Sent Successfully",
        description: `Sent to ${data.sent?.length || 0} users. Failed: ${data.failed?.length || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Emails",
        description: error.message,
        variant: "destructive",
      });
    }
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
      const response = await apiService.uploadFile<MigrationResult>('/admin/migration/upload-csv/', formData);
      
      if (response.error) {
        toast({
          title: "Upload failed",
          description: response.error,
          variant: "destructive"
        });
      } else if (response.data) {
        setResult(response.data);
        toast({
          title: "Upload completed",
          description: `Successfully created ${response.data.created} records.`,
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
    const headers = [
      'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'date_of_birth', 'profile_picture',
      'kyc_status', 'referred_by_email', 'challenge_name', 'phase_status', 'account_size', 'currency',
      'broker_type', 'mt5_account_id', 'mt5_password', 'mt5_investor_password', 'next_withdrawal_date'
    ];
    
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migration_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Migration Tool
          </CardTitle>
          <CardDescription>
            Bulk migration tools for users, enrollments, and payout configurations. Only available to administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Migration
              </TabsTrigger>
              <TabsTrigger value="payout-configs" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Payout Config Import
              </TabsTrigger>
              <TabsTrigger value="broker-migration" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Broker Migration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
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

                  <Button variant="outline" onClick={() => navigate('/migration-logs')}>
                    <History className="mr-2 h-4 w-4" />
                    View Migration Logs
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">CSV Format Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">User Fields</h4>
                    <div className="space-y-1 text-sm">
                      <Badge variant="outline">username</Badge>
                      <Badge variant="outline">email</Badge>
                      <Badge variant="secondary">first_name</Badge>
                      <Badge variant="secondary">last_name</Badge>
                      <Badge variant="outline">role</Badge>
                      <Badge variant="secondary">phone</Badge>
                      <Badge variant="secondary">date_of_birth</Badge>
                      <Badge variant="secondary">profile_picture</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Profile Fields</h4>
                    <div className="space-y-1 text-sm">
                      <Badge variant="secondary">kyc_status</Badge>
                      <Badge variant="secondary">referred_by_email</Badge>
                      <Badge variant="secondary">next_withdrawal_date</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Challenge Fields</h4>
                    <div className="space-y-1 text-sm">
                      <Badge variant="outline">challenge_name</Badge>
                      <Badge variant="secondary">phase_status</Badge>
                      <Badge variant="secondary">account_size</Badge>
                      <Badge variant="secondary">currency</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">MT5 Fields</h4>
                    <div className="space-y-1 text-sm">
                      <Badge variant="secondary">broker_type</Badge>
                      <Badge variant="secondary">mt5_account_id</Badge>
                      <Badge variant="secondary">mt5_password</Badge>
                      <Badge variant="secondary">mt5_investor_password</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <strong>Legend:</strong> <Badge variant="outline" className="mx-1">Required</Badge> 
                  <Badge variant="secondary" className="mx-1">Optional</Badge>
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
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                ✓ {result.created} Created
                              </Badge>
                            </div>
                            {result.skipped > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                  ↻ {result.skipped} Skipped
                                </Badge>
                              </div>
                            )}
                            {result.errors.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                  ✗ {result.errors.length} Errors
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Batch ID:</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {result.batch_id}
                            </Badge>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>

                    {result.created > 0 && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/migration-logs?batch_id=${result.batch_id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Batch Logs
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => sendEmailsMutation.mutate(result.batch_id)}
                          disabled={sendEmailsMutation.isPending}
                        >
                          {sendEmailsMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          Send Migration Emails ({result.created})
                        </Button>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-3">
                            <p className="font-medium">Migration errors occurred:</p>
                            <div className="max-h-60 overflow-y-auto space-y-2 bg-red-50 p-3 rounded border">
                              {result.errors.map((error, index) => (
                                <div key={index} className="text-sm">
                                  <div className="flex gap-2">
                                    <span className="font-semibold text-red-800 min-w-[60px]">
                                      Row {error.row}:
                                    </span>
                                    <span className="text-red-700 break-words">
                                      {formatErrorMessage(error.errors)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Fix the errors in your CSV file and re-upload the failed rows.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="payout-configs" className="space-y-6">
              <PayoutConfigImport />
            </TabsContent>

            <TabsContent value="broker-migration" className="space-y-6">
              <BrokerMigration />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationTool;