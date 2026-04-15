
import { mockAuthService } from '@/services/mockAuthService';

export const roleService = {
  async fetchUserRoles(userId: string): Promise<string[]> {
    try {
      console.log('Fetching roles for user:', userId);
      const roles = await mockAuthService.fetchUserRoles(userId);
      console.log('Fetched roles:', roles);
      return roles;
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
    }
  }
};
