import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnrollmentData, ClientProfile, CurrentPhase, Phase } from '@/lib/types/enrollmentReview';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';
import { Calendar, DollarSign, TrendingUp, Clock, User, Mail, MapPin, Shield, IdCard, Phone, Building2, Globe, Target, CheckCircle, AlertCircle, Clock as ClockIcon } from 'lucide-react';
import InternalNotesSection from './InternalNotesSection';

interface OverviewTabProps {
  enrollment: EnrollmentData;
  clientProfile: ClientProfile;
  currentPhase?: CurrentPhase;
  phases?: Phase[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ enrollment, clientProfile, currentPhase, phases = [] }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live_in_progress': return 'bg-success';
      case 'phase_1_in_progress':
      case 'phase_2_in_progress': return 'bg-warning';
      case 'completed': return 'bg-primary';
      case 'failed': return 'bg-destructive';
      case 'payout_limit_reached': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'rejected': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatKycStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatPhaseType = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1': return 'Phase 1';
      case 'phase-2': return 'Phase 2';
      case 'live-trader': return 'Live Trader';
      default: return phaseType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getPhaseIcon = (phaseType: string, isCurrent: boolean) => {
    if (isCurrent) {
      return <ClockIcon className="h-5 w-5 text-warning" />;
    }
    
    switch (phaseType) {
      case 'phase-1':
      case 'phase-2':
        return <Target className="h-5 w-5 text-primary" />;
      case 'live-trader':
        return <CheckCircle className="h-5 w-5 text-success" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPhaseStatusColor = (isCurrent: boolean, phaseType: string) => {
    if (isCurrent) return 'border-warning bg-warning/10';
    if (phaseType === 'live-trader') return 'border-success bg-success/10';
    return 'border-primary bg-primary/10';
  };

  return (
    <div className="space-y-6">
      {/* Challenge Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenge Details</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{enrollment.challenge_name}</p>
                <p className="text-sm text-muted-foreground">{enrollment.step_type}</p>
              </div>
              <Badge className={getStatusColor(enrollment.status)}>
                {formatStatus(enrollment.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Size</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                ${enrollment.account_size?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">{enrollment.currency}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                ${currentPhase?.current_balance?.toLocaleString() ?? 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">{enrollment.currency}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {enrollment.completed_date 
                  ? Math.ceil((new Date(enrollment.completed_date).getTime() - new Date(enrollment.start_date).getTime()) / (1000 * 60 * 60 * 24))
                  : Math.ceil((new Date().getTime() - new Date(enrollment.start_date).getTime()) / (1000 * 60 * 60 * 24))
                }
              </p>
              <p className="text-sm text-muted-foreground">Days {enrollment.completed_date ? 'completed' : 'in progress'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-secondary"></div>
            
            <div className="space-y-8">
              <div className="relative flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-background"></div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Challenge Started</p>
                  <p className="text-lg font-bold">{new Date(enrollment.start_date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Enrollment began</p>
                </div>
              </div>
              
              {enrollment.completed_date && (
                <div className="relative flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent border-4 border-background shadow-lg flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-background"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Challenge Completed</p>
                    <p className="text-lg font-bold">{new Date(enrollment.completed_date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Evaluation phase finished</p>
                  </div>
                </div>
              )}
              
              {enrollment.live_start_date && (
                <div className="relative flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-success border-4 border-background shadow-lg flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-background"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Live Trading Started</p>
                    <p className="text-lg font-bold">{new Date(enrollment.live_start_date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Live funded account active</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Profile Section - Moved to bottom */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Client Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="text-xl font-bold text-foreground">{clientProfile.full_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg text-foreground">{clientProfile.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <IdCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Client ID</p>
                    <p className="text-lg font-mono text-foreground">{clientProfile.id}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-lg text-foreground">{clientProfile.user_id}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground mb-2">KYC Status</p>
                <Badge className={`${getKycStatusColor(clientProfile.kyc_status)} text-lg px-4 py-2`}>
                  {formatKycStatus(clientProfile.kyc_status)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Know Your Customer verification
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          {clientProfile.address_info && (
            <div className="mt-8 pt-8 border-t border-border/60">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Address Information</h3>
                  <p className="text-sm text-muted-foreground">Billing and contact details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-primary">Personal Details</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                      <IdCard className="h-4 w-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium text-foreground">
                          {clientProfile.address_info.first_name} {clientProfile.address_info.last_name}
                        </p>
                      </div>
                    </div>
                    
                    {clientProfile.address_info.company && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="font-medium text-foreground">{clientProfile.address_info.company}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-primary">Contact Details</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">Email Address</p>
                        <p className="font-medium text-sm break-all text-foreground">{clientProfile.address_info.email}</p>
                      </div>
                    </div>
                    
                    {clientProfile.address_info.phone && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone Number</p>
                          <p className="font-medium text-foreground">{clientProfile.address_info.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-primary">Address Details</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">Street Address</p>
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-foreground">{clientProfile.address_info.address_line_1}</p>
                          {clientProfile.address_info.address_line_2 && (
                            <p className="font-medium text-sm text-foreground">{clientProfile.address_info.address_line_2}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <Globe className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <div className="space-y-1">
                          <p className="font-medium text-sm text-foreground">
                            {clientProfile.address_info.city}
                            {clientProfile.address_info.state && `, ${clientProfile.address_info.state}`}
                            {clientProfile.address_info.postcode && ` ${clientProfile.address_info.postcode}`}
                          </p>
                          <p className="font-bold text-primary">{getCountryNameSafe(clientProfile.address_info.country)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes Section */}
      <InternalNotesSection traderId={clientProfile.user_id} />

    </div>
  );
};

export default OverviewTab;