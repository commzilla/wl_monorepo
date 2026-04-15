import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Cog, Users, Database, DollarSign, TrendingUp, Sparkles, Brain, Newspaper } from 'lucide-react';
import ChallengeConfigurations from '@/pages/ChallengeConfigurations';
import PayoutConfiguration from '@/pages/PayoutConfiguration';
import AffiliateTierConfiguration from '@/components/affiliates/AffiliateTierConfiguration';
import CgmConfiguration from '@/components/configuration/CgmConfiguration';
import { PayoutPoliciesTab } from '@/components/configuration/PayoutPoliciesTab';
import { PayoutSplitTiersTab } from '@/components/configuration/PayoutSplitTiersTab';
import { BetaFeaturesTab } from '@/components/configuration/BetaFeaturesTab';
import { AIRiskRulesTab } from '@/components/configuration/AIRiskRulesTab';
import { EconomicCalendarTab } from '@/components/configuration/EconomicCalendarTab';
const Configuration = () => {
  const { isAdmin, isSupport, isRisk, rolesLoading, hasPermission } = useAuth();

  // Show loading while roles are being determined
  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect users without config permission to dashboard
  if (!hasPermission('config.view')) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Configuration</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage challenge, payout, and affiliate configurations</p>
        </div>
      </div>

      <Tabs defaultValue={hasPermission('config.edit') ? "challenges" : "payouts"} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto min-w-max bg-muted p-1 rounded-md">
            {hasPermission('config.edit') && (
              <TabsTrigger value="challenges" className="flex items-center gap-2 shrink-0">
                <Cog className="h-4 w-4" />
                Challenge Configuration
              </TabsTrigger>
            )}
            <TabsTrigger value="payouts" className="flex items-center gap-2 shrink-0">
              <Settings className="h-4 w-4" />
              Payout Configuration
            </TabsTrigger>
          {hasPermission('config.edit') && (
            <>
              <TabsTrigger value="payout-policies" className="flex items-center gap-2 shrink-0">
                <DollarSign className="h-4 w-4" />
                Payout Policies
              </TabsTrigger>
              <TabsTrigger value="split-tiers" className="flex items-center gap-2 shrink-0">
                <TrendingUp className="h-4 w-4" />
                Split Tiers
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="flex items-center gap-2 shrink-0">
                <Users className="h-4 w-4" />
                Affiliate Tier Configuration
              </TabsTrigger>
              <TabsTrigger value="cgm" className="flex items-center gap-2 shrink-0">
                <Database className="h-4 w-4" />
                CGM Configuration
              </TabsTrigger>
              <TabsTrigger value="beta-features" className="flex items-center gap-2 shrink-0">
                <Sparkles className="h-4 w-4" />
                Beta Features
              </TabsTrigger>
              <TabsTrigger value="ai-risk-rules" className="flex items-center gap-2 shrink-0">
                <Brain className="h-4 w-4" />
                AI Risk Rules
              </TabsTrigger>
              <TabsTrigger value="economic-calendar" className="flex items-center gap-2 shrink-0">
                <Newspaper className="h-4 w-4" />
                Economic Calendar
              </TabsTrigger>
            </>
          )}
          </TabsList>
        </div>

        {hasPermission('config.edit') && (
          <TabsContent value="challenges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Challenge Configuration</CardTitle>
                <CardDescription>
                  Configure challenge settings, phases, and parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChallengeConfigurations />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="payouts" className="space-y-6">
          <PayoutConfiguration />
        </TabsContent>

        {hasPermission('config.edit') && (
          <>
            <TabsContent value="payout-policies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payout Policies</CardTitle>
                  <CardDescription>
                    Configure payout rules and settings for each challenge
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayoutPoliciesTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="split-tiers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payout Split Tiers</CardTitle>
                  <CardDescription>
                    Configure tiered profit sharing based on payout number
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayoutSplitTiersTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="affiliates" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Affiliate Tier Configuration</CardTitle>
                  <CardDescription>
                    Configure affiliate commission tiers based on referral volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AffiliateTierConfiguration />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cgm" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Challenge Phase Group Mapping Configuration</CardTitle>
                  <CardDescription>
                    Configure MT5 group mappings for challenge phases
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CgmConfiguration />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="beta-features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Beta Features</CardTitle>
                  <CardDescription>
                    Manage beta features and their availability in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BetaFeaturesTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-risk-rules" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Risk Rules</CardTitle>
                  <CardDescription>
                    Configure risk detection rules that are injected into AI analysis prompts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AIRiskRulesTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="economic-calendar" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Economic Calendar</CardTitle>
                  <CardDescription>
                    Manage high-impact economic news events for trading restrictions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EconomicCalendarTab />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Configuration;