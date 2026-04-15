
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchUserProfileSettings, updateUserProfileSettings, UserProfileSettings, NotificationSettings } from '@/utils/api';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  systemKey: keyof NotificationSettings;
  emailKey: keyof NotificationSettings;
}

export const NotificationsTab: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState<UserProfileSettings | null>(null);

  const notifications: NotificationSetting[] = [
    {
      id: 'trading-challenge',
      title: 'New Trading Challenge Available',
      description: 'Receive notifications related to your trading challenges, including progress updates, new challenges available, or completion milestones.',
      systemKey: 'system_new_challenge',
      emailKey: 'email_new_challenge'
    },
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'These notifications provide important updates about the platform, policy changes, or any significant news that traders need to be aware of.',
      systemKey: 'system_announcements',
      emailKey: 'email_announcements'
    },
    {
      id: 'risk-alerts',
      title: 'Risk Alerts',
      description: 'These notifications will warn you about high-risk trading behaviors, significant market volatility, or potential account drawdowns.',
      systemKey: 'system_risk_alerts',
      emailKey: 'email_risk_alerts'
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Notifications about community events, forum discussions, or social gatherings where you can interact with other traders, share insights, and learn from others.',
      systemKey: 'system_community',
      emailKey: 'email_community'
    },
    {
      id: 'platform',
      title: 'Platform',
      description: 'Notifications about platform updates, maintenance or new features.',
      systemKey: 'system_platform',
      emailKey: 'email_platform'
    }
  ];

  // Default notification settings when API returns null
  const defaultNotificationSettings: NotificationSettings = {
    system_new_challenge: true,
    system_announcements: true,
    system_risk_alerts: true,
    system_community: true,
    system_platform: true,
    email_new_challenge: true,
    email_announcements: true,
    email_risk_alerts: true,
    email_community: true,
    email_platform: true
  };

  useEffect(() => {
    loadProfileSettings();
  }, []);

  const loadProfileSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfileSettings();
      
      // If notification_settings is null, use default values
      if (!data.notification_settings) {
        data.notification_settings = defaultNotificationSettings;
      }
      
      setFormData(data);
    } catch (error) {
      console.error('Failed to load profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationSettings = () => {
    if (!formData || !formData.notification_settings) {
      return defaultNotificationSettings;
    }
    return formData.notification_settings;
  };

  const toggleNotification = async (key: keyof NotificationSettings) => {
    if (!formData) return;

    const currentSettings = getNotificationSettings();
    const updatedNotificationSettings = {
      ...currentSettings,
      [key]: !currentSettings[key]
    };

    const updatedData = {
      ...formData,
      notification_settings: updatedNotificationSettings
    };

    try {
      setUpdating(true);
      await updateUserProfileSettings({ notification_settings: updatedNotificationSettings });
      setFormData(updatedData);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    } finally {
      setUpdating(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4EC1FF] focus:ring-offset-2 focus:ring-offset-[#080808] disabled:opacity-50
        ${enabled ? 'bg-[#4EC1FF]' : 'bg-[#23353E]'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Loading notification settings...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Failed to load notification settings</div>
      </div>
    );
  }

  const notificationSettings = getNotificationSettings();

  return (
    <div className="w-full">
      <h2 className="text-2xl font-medium text-[#E4EEF5] mb-8">{t('notificationsSettings.notifications')}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Notifications - Left Column */}
        <div>
          <h3 className="text-lg font-medium text-[#E4EEF5] mb-6">{t('notificationsSettings.systemNotifications')}</h3>
          <div className="space-y-6">
            {notifications.map((notification) => (
              <div key={`system-${notification.id}`}>
                <div className="flex items-center">
                  <ToggleSwitch
                    enabled={notificationSettings[notification.systemKey]}
                    onChange={() => toggleNotification(notification.systemKey)}
                    disabled={updating}
                  />
                  <h4 className="text-[#E4EEF5] font-medium ml-3">{notification.title}</h4>
                </div>
                <p className="text-sm text-[#85A8C3] leading-relaxed mt-1 pl-[3.5rem]">
                  {notification.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Email Notifications - Right Column */}
        <div>
          <h3 className="text-lg font-medium text-[#E4EEF5] mb-6">{t('notificationsSettings.emailNotifications')}</h3>
          <div className="space-y-6">
            {notifications.map((notification) => (
              <div key={`email-${notification.id}`}>
                <div className="flex items-center">
                  <ToggleSwitch
                    enabled={notificationSettings[notification.emailKey]}
                    onChange={() => toggleNotification(notification.emailKey)}
                    disabled={updating}
                  />
                  <h4 className="text-[#E4EEF5] font-medium ml-3">{notification.title}</h4>
                </div>
                <p className="text-sm text-[#85A8C3] leading-relaxed mt-1 pl-[3.5rem]">
                  {notification.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
