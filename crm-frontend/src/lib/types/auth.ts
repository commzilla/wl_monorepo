
export interface User {
  id: string;
  email: string;
  created_at?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  aud?: string;
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

export interface ProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  avatar_url?: string;
  role?: 'admin' | 'support' | 'risk' | 'content_creator' | 'discord_manager';
  status?: string;
  created_at?: string;
  updated_at?: string;
}
