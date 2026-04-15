
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Info, CheckCircle, AlertTriangle, AlertCircle, FileText, Trophy, DollarSign, Settings, Loader2, ExternalLink, X } from 'lucide-react';
import { fetchNotifications, markNotificationAsRead, deleteNotification, Notification } from '@/utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'kyc':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'challenge':
      return <Trophy className="w-5 h-5 text-purple-500" />;
    case 'payout':
      return <DollarSign className="w-5 h-5 text-green-500" />;
    case 'system':
      return <Settings className="w-5 h-5 text-gray-500" />;
    case 'update':
      return <Info className="w-5 h-5 text-blue-500" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500/10 text-green-400';
    case 'warning':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'error':
      return 'bg-red-500/10 text-red-400';
    case 'kyc':
      return 'bg-blue-500/10 text-blue-400';
    case 'challenge':
      return 'bg-purple-500/10 text-purple-400';
    case 'payout':
      return 'bg-green-500/10 text-green-400';
    case 'system':
      return 'bg-gray-500/10 text-gray-400';
    case 'update':
      return 'bg-blue-500/10 text-blue-400';
    default:
      return 'bg-blue-500/10 text-blue-400';
  }
};

export default function NotificationsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', currentPage, 20],
    queryFn: () => fetchNotifications(currentPage, 20),
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  console.log('NotificationsPage - Data:', notificationsData);
  console.log('NotificationsPage - Loading:', isLoading);
  console.log('NotificationsPage - Error:', error);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      if (notification.action_url.startsWith('/')) {
        window.location.href = notification.action_url;
      } else {
        window.open(notification.action_url, '_blank');
      }
    }
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const notifications = notificationsData?.results || [];
  const totalCount = notificationsData?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  if (isLoading) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-[#28BFFF]" />
          </div>
        </main>
    );
  }

  if (error) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <p className="text-[#E4EEF5] text-lg mb-4">Failed to load notifications</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#28BFFF] text-white rounded-lg hover:bg-[#28BFFF]/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </main>
    );
  }

  return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full mb-8">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="justify-center items-center border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-12 gap-2 w-12 h-12 my-auto px-2.5 rounded-xl border-solid">
              <Bell className="aspect-[1] object-contain w-7 self-stretch my-auto text-[#28BFFF]" />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              Notifications
            </h1>
          </div>
        </header>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-[#85A8C3] mx-auto mb-4" />
              <p className="text-[#E4EEF5] text-lg mb-2">No notifications yet</p>
              <p className="text-[#85A8C3]">You'll see important updates and alerts here</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-[#0A1114] border border-[rgba(40,191,255,0.1)] rounded-xl p-6 hover:bg-[rgba(40,191,255,0.02)] transition-colors ${
                  notification.action_url ? 'cursor-pointer' : ''
                } ${!notification.is_read ? 'ring-1 ring-[#28BFFF]/20' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {notification.image_url ? (
                      <img
                        src={notification.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      getNotificationIcon(notification.type)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className={`font-semibold ${!notification.is_read ? 'text-[#E4EEF5]' : 'text-[#B0C4DE]'}`}>
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 w-2 h-2 bg-[#28BFFF] rounded-full inline-block"></span>
                        )}
                      </h3>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        {notification.action_url && (
                          <ExternalLink className="w-4 h-4 text-[#85A8C3]" />
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="p-1 hover:bg-[rgba(255,0,0,0.1)] rounded transition-colors"
                          title="Delete notification"
                        >
                          <X className="w-4 h-4 text-[#85A8C3] hover:text-red-400" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[#85A8C3] mb-3 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#85A8C3]">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      <span className="text-[#85A8C3]">
                        {format(new Date(notification.created_at), 'MMM dd, yyyy • HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-[#0A1114] border border-[rgba(40,191,255,0.1)] rounded-lg text-[#E4EEF5] hover:bg-[rgba(40,191,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <span className="px-4 py-2 text-[#85A8C3]">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-[#0A1114] border border-[rgba(40,191,255,0.1)] rounded-lg text-[#E4EEF5] hover:bg-[rgba(40,191,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
  );
}
