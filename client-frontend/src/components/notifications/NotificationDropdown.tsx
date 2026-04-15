
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle, FileText, Trophy, DollarSign, Settings } from 'lucide-react';
import { fetchNotifications, markNotificationAsRead, deleteNotification, Notification } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'kyc':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'challenge':
      return <Trophy className="w-4 h-4 text-purple-500" />;
    case 'payout':
      return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'system':
      return <Settings className="w-4 h-4 text-gray-500" />;
    case 'update':
      return <Info className="w-4 h-4 text-blue-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', 1, 10],
    queryFn: () => fetchNotifications(1, 10),
    refetchInterval: 30000, // Refetch every 30 seconds
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

  console.log('NotificationDropdown - Data:', notificationsData);
  console.log('NotificationDropdown - Loading:', isLoading);
  console.log('NotificationDropdown - Error:', error);

  const notifications = notificationsData?.results || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      // Check if it's an internal URL
      if (notification.action_url.startsWith('/')) {
        navigate(notification.action_url);
      } else {
        window.open(notification.action_url, '_blank');
      }
    }

    setIsOpen(false);
  };

  const handleViewAll = () => {
    navigate('/notifications');
    setIsOpen(false);
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg border border-[#28BFFF] bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[#85A8C3]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute top-12 right-0 w-80 bg-[#0A1114] border border-[rgba(40,191,255,0.1)] rounded-xl shadow-[0px_8px_32px_0px_rgba(0,0,0,0.3)] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-[rgba(40,191,255,0.1)]">
            <h3 className="text-[#E4EEF5] font-semibold">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[#85A8C3]">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">Failed to load notifications</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-[#85A8C3]">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.05)] cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-[rgba(40,191,255,0.02)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.image_url ? (
                        <img
                          src={notification.image_url}
                          alt=""
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.is_read ? 'text-[#E4EEF5]' : 'text-[#B0C4DE]'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-[#85A8C3] mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#85A8C3] mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-[#28BFFF] rounded-full"></div>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="p-1 hover:bg-[rgba(255,0,0,0.1)] rounded transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-3.5 h-3.5 text-[#85A8C3] hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-[rgba(40,191,255,0.1)]">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-sm text-[#28BFFF] hover:text-[#4EC1FF] font-medium"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
