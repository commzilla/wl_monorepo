
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Image, FileText, Calendar, User, Tag } from 'lucide-react';

interface Certificate {
  id: string;
  user: string;
  user_username: string;
  certificate_type: 'phase_pass' | 'payout';
  title: string;
  enrollment_id?: string;
  payout_id?: string;
  image_url?: string;
  pdf_url?: string;
  issued_date: string;
  expiry_date?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CertificateDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: Certificate | null;
}

const CertificateDetailsDialog: React.FC<CertificateDetailsDialogProps> = ({
  open,
  onOpenChange,
  certificate,
}) => {
  if (!certificate) return null;

  const getTypeBadge = (type: string) => {
    const variants = {
      'phase_pass': 'default',
      'payout': 'secondary',
    } as const;
    
    const labels = {
      'phase_pass': 'Challenge Phase Pass',
      'payout': 'Payout Certificate',
    };
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    const isExpired = certificate.expiry_date && new Date(certificate.expiry_date) < new Date();
    return (
      <Badge variant={isExpired ? "destructive" : "default"}>
        {isExpired ? "Expired" : "Active"}
      </Badge>
    );
  };

  const handleDownload = (url: string, type: 'image' | 'pdf') => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificate Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{certificate.title}</span>
                <div className="flex gap-2">
                  {getTypeBadge(certificate.certificate_type)}
                  {getStatusBadge()}
                </div>
              </CardTitle>
              <CardDescription>
                Certificate ID: {certificate.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Trader:</strong> {certificate.user_username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>User ID:</strong> {certificate.user}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Issued:</strong> {new Date(certificate.issued_date).toLocaleDateString()}
                  </span>
                </div>
                {certificate.expiry_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Expires:</strong> {new Date(certificate.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {(certificate.enrollment_id || certificate.payout_id) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Linked Records</h4>
                    {certificate.enrollment_id && (
                      <div className="text-sm">
                        <strong>Enrollment ID:</strong> {certificate.enrollment_id}
                      </div>
                    )}
                    {certificate.payout_id && (
                      <div className="text-sm">
                        <strong>Payout ID:</strong> {certificate.payout_id}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* File Downloads */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate Files</CardTitle>
              <CardDescription>
                Available certificate files for download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {certificate.image_url && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(certificate.image_url!, 'image')}
                    className="flex items-center gap-2"
                  >
                    <Image className="h-4 w-4" />
                    Download Image
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {certificate.pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(certificate.pdf_url!, 'pdf')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Download PDF
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {!certificate.image_url && !certificate.pdf_url && (
                  <div className="text-sm text-muted-foreground">
                    No files available for download
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {certificate.metadata && Object.keys(certificate.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(certificate.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Created:</strong> {new Date(certificate.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Updated:</strong> {new Date(certificate.updated_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateDetailsDialog;
