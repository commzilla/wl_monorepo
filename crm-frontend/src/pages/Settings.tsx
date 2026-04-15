
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Users, UserPlus, Shield, Bot, Lock, Plus, MessageCircle, Upload, Cog, Server, UserCog, FileImage, Clock } from 'lucide-react';
import GeneralSettings from '@/components/settings/GeneralSettings';
import SimpleRoleManagement from '@/components/settings/SimpleRoleManagement';
import UserCreation from '@/components/settings/UserCreation';
import SystemSettings from '@/components/settings/SystemSettings';
import EAApproval from '@/components/settings/EAApproval';
import RolePermissions from '@/components/settings/RolePermissions';
import MigrationTool from '@/components/settings/MigrationTool';
import EngineManager from '@/components/settings/EngineManager';
import { SupervisorManager } from '@/components/settings/SupervisorManager';
import SupportWidgetAdmin from '@/components/settings/SupportWidgetAdmin';
import UserManagement from '@/components/settings/UserManagement';
import CertificateTemplates from '@/components/settings/CertificateTemplates';
import ShiftManagement from '@/components/settings/ShiftManagement';

const SettingsPage = () => {
  const { user, isAdmin, isSupport, isRisk, isContentCreator, isDiscordManager, rolesLoading, hasPermission, hasAnyPermission } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to access settings.</p>
      </div>
    );
  }

  // Show loading state while roles are being fetched
  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user permissions...</p>
        </div>
      </div>
    );
  }

  console.log('Settings page render - isAdmin:', isAdmin, 'user email:', user.email);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto min-w-max bg-muted p-1 rounded-md">
            <TabsTrigger value="general" className="flex items-center gap-2 shrink-0">
              <SettingsIcon className="h-4 w-4" />
              {t('settings.tabs.general')}
            </TabsTrigger>

            {hasPermission('support.manage_config') && (
              <TabsTrigger value="chat-widget" className="flex items-center gap-2 shrink-0">
                <MessageCircle className="h-4 w-4" />
                Support Widget
              </TabsTrigger>
            )}

            {hasPermission('support.manage_config') && (
              <TabsTrigger value="shift-management" className="flex items-center gap-2 shrink-0">
                <Clock className="h-4 w-4" />
                Shift Management
              </TabsTrigger>
            )}

            {hasPermission('users.view') && (
              <TabsTrigger value="user-management" className="flex items-center gap-2 shrink-0">
                <UserCog className="h-4 w-4" />
                User Management
              </TabsTrigger>
            )}

            {hasPermission('roles.view') && (
              <TabsTrigger value="role-creation" className="flex items-center gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                {t('settings.tabs.roleManagement')}
              </TabsTrigger>
            )}

            {hasPermission('users.create') && (
              <TabsTrigger value="add-users" className="flex items-center gap-2 shrink-0">
                <UserPlus className="h-4 w-4" />
                {t('settings.tabs.addUsers')}
              </TabsTrigger>
            )}

            {hasPermission('risk.manage_ea') && (
              <TabsTrigger value="ea-approval" className="flex items-center gap-2 shrink-0">
                <Bot className="h-4 w-4" />
                {t('settings.tabs.eaApproval')}
              </TabsTrigger>
            )}
            {hasPermission('config.edit') && (
              <>
                <TabsTrigger value="system" className="flex items-center gap-2 shrink-0">
                  <Users className="h-4 w-4" />
                  {t('settings.tabs.system')}
                </TabsTrigger>
                <TabsTrigger value="migration-tool" className="flex items-center gap-2 shrink-0">
                  <Upload className="h-4 w-4" />
                  Migration Tool
                </TabsTrigger>
                <TabsTrigger value="engine-manager" className="flex items-center gap-2 shrink-0">
                  <Cog className="h-4 w-4" />
                  Engine Manager
                </TabsTrigger>
                <TabsTrigger value="supervisor-manager" className="flex items-center gap-2 shrink-0">
                  <Server className="h-4 w-4" />
                  Supervisor Manager
                </TabsTrigger>
              </>
            )}
            {hasPermission('certificates.manage') && (
              <TabsTrigger value="certificate-templates" className="flex items-center gap-2 shrink-0">
                <FileImage className="h-4 w-4" />
                Certificate Templates
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings />
        </TabsContent>

        {hasPermission('support.manage_config') && (
          <TabsContent value="chat-widget" className="space-y-6">
            <SupportWidgetAdmin />
          </TabsContent>
        )}

        {hasPermission('support.manage_config') && (
          <TabsContent value="shift-management" className="space-y-6">
            <ShiftManagement />
          </TabsContent>
        )}

        <TabsContent value="role-creation" className="space-y-6">
          <RolePermissions />
        </TabsContent>

        <TabsContent value="add-users" className="space-y-6">
          <UserCreation />
        </TabsContent>

        {hasPermission('risk.manage_ea') && (
          <TabsContent value="ea-approval" className="space-y-6">
            <EAApproval />
          </TabsContent>
        )}

        {hasPermission('users.view') && (
          <TabsContent value="user-management" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}

        {hasPermission('config.edit') && (
          <>
            <TabsContent value="system" className="space-y-6">
              <SystemSettings />
            </TabsContent>

            <TabsContent value="migration-tool" className="space-y-6">
              <MigrationTool />
            </TabsContent>

            <TabsContent value="engine-manager" className="space-y-6">
              <EngineManager />
            </TabsContent>

            <TabsContent value="supervisor-manager" className="space-y-6">
              <SupervisorManager />
            </TabsContent>
          </>
        )}

        {hasPermission('certificates.manage') && (
          <TabsContent value="certificate-templates" className="space-y-6">
            <CertificateTemplates />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
