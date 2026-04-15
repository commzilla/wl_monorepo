
import React from 'react';
import ProfileSection from './ProfileSection';
import AccountSection from './AccountSection';
import PasswordSection from './PasswordSection';
import PreferencesSection from './PreferencesSection';

const GeneralSettings = () => {
  return (
    <div className="space-y-6">
      <ProfileSection />
      <AccountSection />
      <PasswordSection />
      <PreferencesSection />
    </div>
  );
};

export default GeneralSettings;
