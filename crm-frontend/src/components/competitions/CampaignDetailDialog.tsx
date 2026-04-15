import React from 'react';
import { format } from 'date-fns';
import { Trophy, Calendar, Users, DollarSign, Settings, FileText, Shield, Award } from 'lucide-react';
import { Competition, RULE_TYPE_LABELS, VALUE_TYPE_LABELS } from '@/services/competitionService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  competition: Competition | null;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'upcoming':
      return 'outline';
    case 'ongoing':
      return 'default';
    case 'ended':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const CampaignDetailDialog: React.FC<CampaignDetailDialogProps> = ({ isOpen, onClose, competition }) => {
  if (!competition) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{competition.title}</DialogTitle>
            <Badge variant={getStatusBadgeVariant(competition.status)} className="capitalize">
              {competition.status}
            </Badge>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Banner */}
            {competition.banner && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={competition.banner} 
                  alt={competition.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Organizer</p>
                    <p className="font-medium">{competition.organizer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prize Pool</p>
                    <p className="font-medium whitespace-pre-wrap">{competition.prize_pool_text}</p>
                  </div>
                </div>
                {competition.challenge_detail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Associated Challenge</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {competition.challenge_detail.name} 
                        <span className="text-muted-foreground ml-1">({competition.challenge_detail.step_type})</span>
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Short Description</p>
                  <p>{competition.short_description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Description</p>
                  <p className="whitespace-pre-wrap">{competition.full_description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{format(new Date(competition.start_at), 'PPP p')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">{format(new Date(competition.end_at), 'PPP p')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Trading Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Initial Balance</p>
                    <p className="font-medium">${parseFloat(competition.initial_balance).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Leverage</p>
                    <p className="font-medium">{competition.leverage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MT5 Group</p>
                    <p className="font-medium">{competition.mt5_group}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Allowed Symbols</p>
                    <p className="font-medium">
                      {competition.allowed_symbols?.join(', ') || 'All Symbols'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Min Trades to Qualify</p>
                    <p className="font-medium">{competition.min_trades_to_qualify || 'No minimum'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entry Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Entry Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Entry Type</p>
                    <Badge variant="outline" className="capitalize mt-1">
                      {competition.entry_type}
                    </Badge>
                  </div>
                  {competition.entry_fee && (
                    <div>
                      <p className="text-sm text-muted-foreground">Entry Fee</p>
                      <p className="font-medium">${parseFloat(competition.entry_fee).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Max Participants</p>
                    <p className="font-medium">{competition.max_participants || 'Unlimited'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prizes */}
            {competition.prizes && competition.prizes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4" />
                    Prize Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {competition.prizes.map((prize, index) => (
                      <div key={prize.id || index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="font-medium">
                          {prize.rank_from === prize.rank_to 
                            ? `Rank #${prize.rank_from}` 
                            : `Rank #${prize.rank_from} - #${prize.rank_to}`}
                        </span>
                        <span>{prize.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" />
                  System Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Auto-create MT5</span>
                    <Badge variant={competition.auto_create_mt5 ? 'default' : 'secondary'}>
                      {competition.auto_create_mt5 ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Single Entry Only</span>
                    <Badge variant={competition.enforce_single_entry ? 'default' : 'secondary'}>
                      {competition.enforce_single_entry ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Use Global Rules</span>
                    <Badge variant={competition.use_global_rules ? 'default' : 'secondary'}>
                      {competition.use_global_rules ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Allow Test Users</span>
                    <Badge variant={competition.allow_test_users ? 'default' : 'secondary'}>
                      {competition.allow_test_users ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manual Rules - Only show when not using global rules */}
            {!competition.use_global_rules && competition.manual_rules && competition.manual_rules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Manual Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {competition.manual_rules.map((rule, index) => (
                      <div key={rule.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{RULE_TYPE_LABELS[rule.rule_type]}</span>
                            {!rule.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {rule.value}
                            {rule.value_type === 'percent' && '%'}
                          </span>
                          <p className="text-xs text-muted-foreground">{VALUE_TYPE_LABELS[rule.value_type]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                    {competition.rules_markdown}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <div className="text-sm text-muted-foreground text-center">
              Created: {format(new Date(competition.created_at), 'PPP p')}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetailDialog;
