
import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const PreferencesSection = () => {
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.preferences.title')}</CardTitle>
        <CardDescription>
          {t('settings.preferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('settings.emailNotifications')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('settings.emailNotifications.description')}
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        
        <div className="space-y-2">
          <Label>{t('language')}</Label>
          <Select value={currentLanguage} onValueChange={changeLanguage}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={`Select ${t('language').toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>{t('settings.timezone')}</Label>
          <Select defaultValue="utc">
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder={`Select ${t('settings.timezone').toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utc">UTC</SelectItem>
              <SelectItem value="est">Eastern Time</SelectItem>
              <SelectItem value="pst">Pacific Time</SelectItem>
              <SelectItem value="cet">Central European Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreferencesSection;
