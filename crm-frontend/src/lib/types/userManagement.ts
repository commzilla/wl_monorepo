export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'support' | 'risk' | 'content_creator' | 'discord_manager';
  status: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture?: string;
  two_factor_enabled: boolean;
  two_factor_method?: string;
  rbac_role?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminUserRequest {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'support' | 'risk' | 'content_creator' | 'discord_manager';
  status?: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture?: string;
  two_factor_enabled?: boolean;
  two_factor_method?: string;
  password: string;
  rbac_role_id?: string;
}

export interface UpdateAdminUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'support' | 'risk' | 'content_creator' | 'discord_manager';
  status?: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture?: string;
  two_factor_enabled?: boolean;
  two_factor_method?: string;
  rbac_role_id?: string | null;
}
