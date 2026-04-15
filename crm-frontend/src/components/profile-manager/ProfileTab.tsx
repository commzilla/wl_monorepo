import { Badge } from '@/components/ui/badge';
import InternalNotesSection from '@/components/common/InternalNotesSection';

interface ProfileTabProps {
  userInfo: any;
  clientProfile: any;
  traderId: string;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || 'N/A'}</span>
    </div>
  );
}

export default function ProfileTab({ userInfo, clientProfile, traderId }: ProfileTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Personal Information</h3>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <InfoRow label="First Name" value={userInfo?.first_name} />
            <InfoRow label="Last Name" value={userInfo?.last_name} />
            <InfoRow label="Email" value={userInfo?.email} />
            <InfoRow label="Phone" value={userInfo?.phone} />
            <InfoRow label="Username" value={userInfo?.username} />
            <InfoRow label="Role" value={
              <Badge variant="outline" className="text-xs">{userInfo?.role || 'N/A'}</Badge>
            } />
          </div>
        </section>

        {/* Address & KYC */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Address & Verification</h3>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            {clientProfile ? (
              <>
                <InfoRow label="Country" value={clientProfile.address_info?.country} />
                <InfoRow label="City" value={clientProfile.address_info?.city} />
                <InfoRow label="Address" value={clientProfile.address_info?.address_line_1} />
                <InfoRow label="Phone" value={clientProfile.address_info?.phone} />
                <InfoRow label="KYC Status" value={
                  <Badge variant={clientProfile.kyc_status === 'approved' ? 'default' : 'secondary'} className="text-xs capitalize">
                    {clientProfile.kyc_status || 'N/A'}
                  </Badge>
                } />
                <InfoRow label="Live Account" value={
                  <Badge variant={clientProfile.has_live_account ? 'default' : 'secondary'} className="text-xs">
                    {clientProfile.has_live_account ? 'Yes' : 'No'}
                  </Badge>
                } />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No client profile found</p>
            )}
          </div>
        </section>
      </div>

      {/* Internal Notes */}
      {clientProfile && (
        <InternalNotesSection
          traderId={traderId}
          title="Profile Notes"
        />
      )}
    </div>
  );
}
