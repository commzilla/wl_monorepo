
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface SuperUserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_picture: string;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  profile_picture: string;
  two_factor_enabled: boolean;
  two_factor_method: string | null;
}

const ProfileSection = () => {
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileData, setProfileData] = useState<SuperUserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      profile_picture: '',
      two_factor_enabled: false,
      two_factor_method: null,
    },
  });

  // Fetch current profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await apiService.get<SuperUserProfile>('/superuser/profile/');
        if (response.data) {
          setProfileData(response.data);
          profileForm.reset({
            first_name: response.data.first_name || '',
            last_name: response.data.last_name || '',
            phone: response.data.phone || '',
            profile_picture: response.data.profile_picture || '',
            two_factor_enabled: response.data.two_factor_enabled || false,
            two_factor_method: response.data.two_factor_method || null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfileData();
  }, [profileForm]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      console.log('Uploading file:', file.name, file.type, file.size);
      const formData = new FormData();
      formData.append('profile_picture_file', file);

      const response = await apiService.uploadFile<SuperUserProfile>('/superuser/profile/', formData, 'PATCH');
      console.log('Upload response:', response);
      
      if (response.error) {
        console.error('Upload error:', response.error);
        throw new Error(response.error);
      }
      
      if (response.data) {
        console.log('Updated profile data:', response.data);
        setProfileData(response.data);
        profileForm.setValue('profile_picture', response.data.profile_picture);
        
        // Force a re-render by updating the key or triggering a state change
        if (response.data.profile_picture) {
          toast({
            title: "Profile picture updated",
            description: "Your profile picture has been successfully updated",
          });
        } else {
          console.warn('Backend returned empty profile_picture URL');
          toast({
            title: "Upload may have failed",
            description: "The backend didn't return a profile picture URL",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      const response = await apiService.patch<SuperUserProfile>('/superuser/profile/', data);
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (response.data) {
        setProfileData(response.data);
      }
      toast({
        title: t('settings.profileUpdated'),
        description: t('settings.profileUpdatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('settings.updateFailed'),
        description: t('settings.updateFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.profile.title')}</CardTitle>
        <CardDescription>
          {t('settings.profile.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={profileData?.profile_picture || "https://we-fund.b-cdn.net/img/default-avatar.svg"} 
                  alt="Profile picture" 
                />
                <AvatarFallback>
                  {profileData?.first_name?.[0] || profileData?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Profile Picture</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a profile picture (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('firstName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter your ${t('firstName').toLowerCase()}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('lastName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter your ${t('lastName').toLowerCase()}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter your ${t('phone').toLowerCase()}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Two-Factor Authentication Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="two_factor_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable 2FA</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Secure your account with two-factor authentication
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {profileForm.watch('two_factor_enabled') && (
                  <FormField
                    control={profileForm.control}
                    name="two_factor_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>2FA Method</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select 2FA method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="phone_call">Phone Call</SelectItem>
                            <SelectItem value="auth_app">Authenticator App</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? t('settings.updating') : t('settings.updateProfile')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProfileSection;
