
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AccountSection = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.account.title')}</CardTitle>
        <CardDescription>
          {t('settings.account.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{t('email')}</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>
          <div>
            <Label>{t('settings.accountCreated')}</Label>
            <Input 
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} 
              disabled 
              className="bg-muted" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSection;
