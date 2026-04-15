
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ExternalLink, Eye } from 'lucide-react';
import { Affiliate } from '@/types/affiliate';

interface AffiliateApplicationsProps {
  affiliates: Affiliate[] | undefined;
  isLoading: boolean;
  onReviewAffiliate: (affiliate: Affiliate) => void;
}

const AffiliateApplications: React.FC<AffiliateApplicationsProps> = ({
  affiliates,
  isLoading,
  onReviewAffiliate,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Applications</CardTitle>
        <CardDescription>Review and manage affiliate partnership requests</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {!affiliates || affiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliate applications found. Mock data will be available once added to the database.
              </div>
            ) : (
              affiliates.map((affiliate) => (
                <div key={affiliate.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{affiliate.business_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Expected Volume: ${affiliate.expected_monthly_volume?.toLocaleString() || 0}/month
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(affiliate.application_status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReviewAffiliate(affiliate)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Website:</span>
                      {affiliate.website_url ? (
                        <a 
                          href={affiliate.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline inline-flex items-center"
                        >
                          Visit <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <span className="ml-2 text-muted-foreground">Not provided</span>
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Marketing Channels:</span>
                      <span className="ml-2">{affiliate.marketing_channels?.join(', ') || 'None specified'}</span>
                    </div>
                  </div>

                  {affiliate.admin_notes && (
                    <div className="bg-muted p-3 rounded">
                      <span className="font-medium text-sm">Admin Notes:</span>
                      <p className="text-sm mt-1">{affiliate.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AffiliateApplications;
