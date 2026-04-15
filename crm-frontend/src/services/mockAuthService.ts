
interface MockUser {
  id: string;
  email: string;
  created_at: string;
}

interface MockSession {
  user: MockUser;
  access_token: string;
  expires_at: number;
}

interface MockProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  phone: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

class MockAuthService {
  private readonly STORAGE_KEYS = {
    SESSION: 'mock_auth_session',
    PROFILES: 'mock_user_profiles',
    ROLES: 'mock_user_roles'
  };

  // Mock users database
  private mockUsers: MockUser[] = [
    {
      id: 'admin-user-id',
      email: 'admin@wefund.com',
      created_at: new Date().toISOString()
    },
    {
      id: 'support-user-id', 
      email: 'support@wefund.com',
      created_at: new Date().toISOString()
    },
    {
      id: 'risk-user-id',
      email: 'risk@wefund.com', 
      created_at: new Date().toISOString()
    }
  ];

  // Initialize mock profiles
  private initializeMockData() {
    if (!localStorage.getItem(this.STORAGE_KEYS.PROFILES)) {
      const mockProfiles: MockProfile[] = [
        {
          id: 'admin-user-id',
          first_name: 'Admin',
          last_name: 'User',
          avatar_url: null,
          country: 'United States',
          phone: null,
          language: 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'support-user-id',
          first_name: 'Support',
          last_name: 'Agent',
          avatar_url: null,
          country: 'United States', 
          phone: null,
          language: 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'risk-user-id',
          first_name: 'Risk',
          last_name: 'Manager',
          avatar_url: null,
          country: 'United States',
          phone: null, 
          language: 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(this.STORAGE_KEYS.PROFILES, JSON.stringify(mockProfiles));
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.ROLES)) {
      const mockRoles = [
        { id: '1', user_id: 'admin-user-id', role: 'admin', created_at: new Date().toISOString() },
        { id: '2', user_id: 'support-user-id', role: 'support', created_at: new Date().toISOString() },
        { id: '3', user_id: 'risk-user-id', role: 'risk', created_at: new Date().toISOString() }
      ];
      localStorage.setItem(this.STORAGE_KEYS.ROLES, JSON.stringify(mockRoles));
    }
  }

  constructor() {
    this.initializeMockData();
  }

  async signUp(email: string, password: string, metadata?: { first_name?: string; last_name?: string }) {
    // Simulate signup delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user already exists
    if (this.mockUsers.find(u => u.email === email)) {
      throw new Error('User already registered');
    }

    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email,
      created_at: new Date().toISOString()
    };

    this.mockUsers.push(newUser);

    // Create profile
    if (metadata) {
      const profiles = this.getProfiles();
      const newProfile: MockProfile = {
        id: newUser.id,
        first_name: metadata.first_name || null,
        last_name: metadata.last_name || null,
        avatar_url: null,
        country: null,
        phone: null,
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      profiles.push(newProfile);
      localStorage.setItem(this.STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    }

    return { user: newUser };
  }

  async signIn(email: string, password: string) {
    // Simulate signin delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.mockUsers.find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid login credentials');
    }

    const session: MockSession = {
      user,
      access_token: `mock-token-${Date.now()}`,
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    localStorage.setItem(this.STORAGE_KEYS.SESSION, JSON.stringify(session));
    return session;
  }

  async signOut() {
    localStorage.removeItem(this.STORAGE_KEYS.SESSION);
  }

  getSession(): MockSession | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.SESSION);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as MockSession;
    
    // Check if session expired
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(this.STORAGE_KEYS.SESSION);
      return null;
    }
    
    return session;
  }

  getUser(): MockUser | null {
    const session = this.getSession();
    return session?.user || null;
  }

  async fetchProfile(userId: string): Promise<MockProfile> {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile;
  }

  async updateProfile(userId: string, data: Partial<MockProfile>): Promise<void> {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === userId);
    if (index === -1) {
      throw new Error('Profile not found');
    }
    
    profiles[index] = {
      ...profiles[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(this.STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  async fetchUserRoles(userId: string): Promise<string[]> {
    const roles = this.getRoles();
    return roles.filter(r => r.user_id === userId).map(r => r.role);
  }

  // Auth state change simulation
  private listeners: Array<(event: string, session: MockSession | null) => void> = [];

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return {
      unsubscribe: () => {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(event: string, session: MockSession | null) {
    this.listeners.forEach(callback => callback(event, session));
  }

  // Trigger auth state changes
  async triggerSignIn(email: string, password: string) {
    const session = await this.signIn(email, password);
    this.notifyListeners('SIGNED_IN', session);
    return session;
  }

  async triggerSignOut() {
    await this.signOut();
    this.notifyListeners('SIGNED_OUT', null);
  }

  private getProfiles(): MockProfile[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.PROFILES);
    return stored ? JSON.parse(stored) : [];
  }

  private getRoles() {
    const stored = localStorage.getItem(this.STORAGE_KEYS.ROLES);
    return stored ? JSON.parse(stored) : [];
  }
}

export const mockAuthService = new MockAuthService();
