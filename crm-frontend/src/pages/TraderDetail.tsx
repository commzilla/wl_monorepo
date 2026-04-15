
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { TraderService } from '@/lib/models/trader';
import { useLanguage } from '@/hooks/useLanguage';
import PageHeader from '@/components/layout/PageHeader';

const TraderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const trader = id ? TraderService.getTraderById(id) : undefined;

  if (!trader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">{t('traders.notFound')}</h1>
          <Button onClick={() => navigate('/traders')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('traders.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getChallengeStatusBadge = (status: string) => {
    const statusMap = {
      'phase-1-in-progress': { label: 'Phase 1 In Progress', variant: 'secondary' as const },
      'phase-2-in-progress': { label: 'Phase 2 In Progress', variant: 'secondary' as const },
      'passed-phase-1': { label: 'Passed Phase 1', variant: 'default' as const },
      'passed-phase-2': { label: 'Passed Phase 2', variant: 'default' as const },
      'failed': { label: 'Failed', variant: 'destructive' as const },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAccountStatusBadge = (status: string) => {
    const statusMap = {
      'active': { label: 'Active', variant: 'default' as const },
      'breached': { label: 'Breached', variant: 'destructive' as const },
      'closed': { label: 'Closed', variant: 'secondary' as const },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div>
      <PageHeader 
        title={`${trader.firstName} ${trader.lastName}`}
        subtitle={trader.email}
        actions={
          <Button variant="outline" onClick={() => navigate('/traders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('traders.backToList')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Trader Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('traders.traderInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('traders.kycStatus')}</span>
              <div className="flex items-center">
                {getKycStatusIcon(trader.kycStatus)}
                <span className="ml-2 text-sm">{trader.kycStatus}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('traders.country')}</span>
              <span className="text-sm">{trader.country}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('traders.registeredAt')}</span>
              <span className="text-sm">{trader.registeredAt.toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('traders.challenges')} ({trader.challenges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {trader.challenges.length === 0 ? (
              <p className="text-muted-foreground">{t('traders.noChallenges')}</p>
            ) : (
              <div className="space-y-4">
                {trader.challenges.map((challenge) => (
                  <div key={challenge.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{challenge.step} Challenge</h4>
                      {getChallengeStatusBadge(challenge.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('traders.initialBalance')}</span>
                        <p className="font-medium">${challenge.initialBalance.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('traders.currentBalance')}</span>
                        <p className="font-medium">${challenge.currentBalance?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('traders.targetProfit')}</span>
                        <p className="font-medium">${challenge.targetProfit.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('traders.daysRemaining')}</span>
                        <p className="font-medium">{challenge.daysRemaining}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Accounts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('traders.tradingAccounts')} ({trader.accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {trader.accounts.length === 0 ? (
              <p className="text-muted-foreground">{t('traders.noAccounts')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {trader.accounts.map((account) => (
                  <div key={account.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{account.accountId}</h4>
                      {getAccountStatusBadge(account.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('traders.balance')}</span>
                        <span className="font-medium">${account.balance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('traders.equity')}</span>
                        <span className="font-medium">${account.equity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('traders.platform')}</span>
                        <span>{account.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('traders.challengeStep')}</span>
                        <span>{account.step}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KYC Verifications */}
        {trader.kycVerifications && trader.kycVerifications.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>{t('traders.kycVerifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trader.kycVerifications.map((kyc) => (
                  <div key={kyc.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Session ID: {kyc.sessionId}</span>
                      <Badge variant={kyc.status === 'approved' ? 'default' : kyc.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {kyc.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('traders.requestedAt')}</span>
                        <p>{kyc.requestedAt.toLocaleDateString()}</p>
                      </div>
                      {kyc.completedAt && (
                        <div>
                          <span className="text-muted-foreground">{t('traders.completedAt')}</span>
                          <p>{kyc.completedAt.toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {kyc.notes && (
                      <div className="mt-2">
                        <span className="text-sm text-muted-foreground">{t('traders.notes')}</span>
                        <p className="text-sm">{kyc.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TraderDetail;
