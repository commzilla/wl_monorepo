import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import { fetchUserProfileSettings, updateUserProfileSettings, UserProfileSettings } from '@/utils/api';
import { getCountryName } from '@/utils/countryUtils';

export const ProfileTab: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState<UserProfileSettings | null>(null);

  useEffect(() => {
    loadProfileSettings();
  }, []);

  const loadProfileSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfileSettings();
      setFormData(data);
      if (data.profile_picture) {
        setProfileImage(data.profile_picture);
      }
    } catch (error) {
      console.error('Failed to load profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Clean up previous URL if it exists
      if (profileImage && profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }
      
      // Store the file for upload
      setProfileImageFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileImage(previewUrl);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (field: string, value: string) => {
    if (!formData) return;
    
    if (field.startsWith('address_')) {
      const addressField = field.replace('address_', '');
      setFormData(prev => ({
        ...prev!,
        client_profile: {
          ...prev!.client_profile,
          address_info: {
            ...(prev!.client_profile?.address_info || {}),
            [addressField]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData) return;
    
    try {
      setUpdating(true);
      const updatedProfile = await updateUserProfileSettings(formData, profileImageFile || undefined);
      
      // Update the form data with the response (including new profile picture URL)
      setFormData(updatedProfile);
      
      // If we uploaded a new picture, clean up the blob URL and use the server URL
      if (profileImageFile && updatedProfile.profile_picture) {
        if (profileImage && profileImage.startsWith('blob:')) {
          URL.revokeObjectURL(profileImage);
        }
        setProfileImage(updatedProfile.profile_picture);
        setProfileImageFile(null);
      }
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Loading profile settings...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Failed to load profile settings</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-medium text-[#E4EEF5] mb-8">{t('profileSettings.profileInformation')}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Details - Left Column */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#E4EEF5] mb-4">{t('profileSettings.personalDetails')}</h3>
          
          {/* Profile Picture */}
          <div className="flex items-center gap-4 mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <div className="relative">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#4EC1FF] to-[#3AB3FF]">
                <div className="w-full h-full rounded-full bg-[#0A1114] flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                  )}
                </div>
              </div>
              <button
                onClick={handleCameraClick}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#1A2633] border-2 border-[#0A1114] flex items-center justify-center hover:bg-[#23353E] transition-colors"
              >
                <Camera size={16} className="text-[#4EC1FF]" />
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">{t('profileSettings.email')}</label>
            <input
              type="email"
              value={formData.email || ''}
              disabled
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#85A8C3] placeholder-[#85A8C3] cursor-not-allowed opacity-50"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">{t('profileSettings.username')}</label>
            <input
              type="text"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">{t('profileSettings.firstName')}</label>
            <input
              type="text"
              value={formData.first_name || ''}
              disabled
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#85A8C3] placeholder-[#85A8C3] cursor-not-allowed opacity-50"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">Last Name</label>
            <input
              type="text"
              value={formData.last_name || ''}
              disabled
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#85A8C3] placeholder-[#85A8C3] cursor-not-allowed opacity-50"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">Phone</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">Date of Birth</label>
            <input
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
            />
          </div>
        </div>

        {/* Address Details - Right Column */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-[#E4EEF5] mb-10">{t('profileSettings.addressDetails')}</h3>
          
           {/* Address Line 1 */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">Address Line 1</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.address_line_1 || ''}
               onChange={(e) => handleInputChange('address_address_line_1', e.target.value)}
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>

           {/* Address Line 2 */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">Address Line 2</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.address_line_2 || ''}
               onChange={(e) => handleInputChange('address_address_line_2', e.target.value)}
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>

           {/* City */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">City</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.city || ''}
               onChange={(e) => handleInputChange('address_city', e.target.value)}
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>

           {/* Postal Code */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">Postal Code</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.postcode || ''}
               onChange={(e) => handleInputChange('address_postcode', e.target.value)}
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>

           {/* State */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">State</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.state || ''}
               onChange={(e) => handleInputChange('address_state', e.target.value)}
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>

           {/* Country */}
           <div>
             <label className="block text-sm font-medium text-[#85A8C3] mb-2">Country</label>
             <input
               type="text"
               value={formData.client_profile?.address_info?.country ? getCountryName(formData.client_profile.address_info.country) : ''}
               onChange={(e) => handleInputChange('address_country', e.target.value)}
               placeholder="Enter country name or code (e.g., United Arab Emirates, AE)"
               className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent"
             />
           </div>
        </div>
      </div>

      {/* Update Profile Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleUpdateProfile}
          disabled={updating}
          className="px-6 py-3 bg-[#4EC1FF] text-[#E4EEF5] font-semibold rounded-lg hover:bg-[#3AB3FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4EC1FF] focus:ring-offset-2 focus:ring-offset-[#080808] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? t('profileSettings.updating') : t('profileSettings.updateProfile')}
        </button>
      </div>
    </div>
  );
};
