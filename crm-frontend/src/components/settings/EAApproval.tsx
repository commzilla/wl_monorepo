
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EAApproval = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Expert Advisor Approval
          </CardTitle>
          <CardDescription>
            Control which trading bots traders are allowed to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">EA Approval System</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Review and approve Expert Advisor submissions to ensure trading bot compliance and security.
            </p>
            <Button onClick={() => navigate('/admin/expert-advisors')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to EA Approval Panel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Badge variant="default" className="mb-2">Pending Review</Badge>
              <p className="text-sm text-muted-foreground">
                EAs waiting for admin approval
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Badge variant="default" className="mb-2">Approved</Badge>
              <p className="text-sm text-muted-foreground">
                EAs approved for trading
              </p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Badge variant="destructive" className="mb-2">Rejected</Badge>
              <p className="text-sm text-muted-foreground">
                EAs rejected with reasons
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EAApproval;
