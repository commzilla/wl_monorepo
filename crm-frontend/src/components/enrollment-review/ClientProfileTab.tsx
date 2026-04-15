import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientProfile } from '@/lib/types/enrollmentReview';
import { User, Mail, MapPin, Shield, IdCard, Phone, Building, Home } from 'lucide-react';
import { getCountryName } from '@/lib/utils/countryUtils';
import InternalNotesSection from '@/components/common/InternalNotesSection';

interface ClientProfileTabProps {
  clientProfile: ClientProfile;
}

const ClientProfileTab: React.FC<ClientProfileTabProps> = ({ clientProfile }) => {
  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'rejected': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const formatKycStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg font-semibold">{clientProfile.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg">{clientProfile.email}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Client ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <IdCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-mono">{clientProfile.id}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg">{clientProfile.user_id}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className={getKycStatusColor(clientProfile.kyc_status)}>
              {formatKycStatus(clientProfile.kyc_status)}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Know Your Customer verification status
            </p>
          </div>
        </CardContent>
      </Card>

      {clientProfile.address_info && (
        <div className="space-y-6">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-lg">{clientProfile.address_info.first_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-lg">{clientProfile.address_info.last_name}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {clientProfile.address_info.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg">{clientProfile.address_info.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {clientProfile.address_info.company && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Company</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg">{clientProfile.address_info.company}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg">{clientProfile.address_info.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Address Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address Line 1</label>
                    <p className="text-lg">{clientProfile.address_info.address_line_1}</p>
                  </div>
                  
                  {clientProfile.address_info.address_line_2 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address Line 2</label>
                      <p className="text-lg">{clientProfile.address_info.address_line_2}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">City</label>
                    <p className="text-lg">{clientProfile.address_info.city}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {clientProfile.address_info.state && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">State</label>
                      <p className="text-lg">{clientProfile.address_info.state}</p>
                    </div>
                  )}
                  
                  {clientProfile.address_info.postcode && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Postcode</label>
                      <p className="text-lg">{clientProfile.address_info.postcode}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                    <p className="text-lg">{getCountryName(clientProfile.address_info.country)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Internal Notes Section */}
      <InternalNotesSection
        traderId={clientProfile.user_id}
        title="Client Profile Notes"
      />
    </div>
  );
};

export default ClientProfileTab;