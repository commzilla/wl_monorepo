import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Eye,
  ArrowUpRight
} from 'lucide-react';

interface ClientInfoCardProps {
  clientInfo?: any;
  analytics?: any;
}

const ClientInfoCard: React.FC<ClientInfoCardProps> = ({ clientInfo, analytics }) => {
  if (!clientInfo && !analytics) return null;

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone size={12} />;
      case 'tablet': return <Tablet size={12} />;
      default: return <Monitor size={12} />;
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-lg border text-xs space-y-2">
      <div className="flex items-center gap-1 font-medium text-muted-foreground mb-2">
        <Eye size={12} />
        <span>Client Information</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Location & IP */}
        {(clientInfo?.location || clientInfo?.ip) && (
          <div className="flex items-start gap-2">
            <MapPin size={12} className="text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                {clientInfo?.location?.city && clientInfo?.location?.country && (
                  <Badge variant="outline" className="text-xs">
                    {clientInfo.location.city}, {clientInfo.location.country}
                  </Badge>
                )}
                {clientInfo?.ip && (
                  <Badge variant="secondary" className="text-xs">
                    {clientInfo.ip}
                  </Badge>
                )}
              </div>
              {clientInfo?.location?.timezone && (
                <div className="text-muted-foreground mt-1">
                  {clientInfo.location.timezone}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Device & Browser */}
        {(clientInfo?.device || clientInfo?.browser) && (
          <div className="flex items-start gap-2">
            {clientInfo?.device?.type && getDeviceIcon(clientInfo.device.type)}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                {clientInfo?.browser?.name && (
                  <Badge variant="outline" className="text-xs">
                    {clientInfo.browser.name} {clientInfo.browser.version}
                  </Badge>
                )}
                {clientInfo?.device?.os && (
                  <Badge variant="secondary" className="text-xs">
                    {clientInfo.device.os}
                  </Badge>
                )}
              </div>
              {clientInfo?.device?.screen && (
                <div className="text-muted-foreground mt-1">
                  {clientInfo.device.screen.width}×{clientInfo.device.screen.height}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Analytics */}
        {analytics?.chatCounts && (
          <div className="flex items-start gap-2">
            <MessageSquare size={12} className="text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {analytics.chatCounts.totalSessions} sessions
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {analytics.chatCounts.totalMessages} messages
                </Badge>
                {analytics.isReturningVisitor && (
                  <Badge variant="default" className="text-xs">
                    Returning
                  </Badge>
                )}
              </div>
              {analytics.chatCounts.averageSessionLength > 0 && (
                <div className="text-muted-foreground mt-1">
                  Avg: {formatDuration(analytics.chatCounts.averageSessionLength)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page & Referrer */}
        {(clientInfo?.page?.referrer && clientInfo.page.referrer !== 'Direct') && (
          <div className="flex items-start gap-2">
            <ArrowUpRight size={12} className="text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="text-xs">
                From: {new URL(clientInfo.page.referrer).hostname}
              </Badge>
            </div>
          </div>
        )}

        {/* Session Duration */}
        {analytics?.sessionDuration && (
          <div className="flex items-start gap-2">
            <Clock size={12} className="text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <Badge variant="secondary" className="text-xs">
                {formatDuration(analytics.sessionDuration)} on site
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientInfoCard;