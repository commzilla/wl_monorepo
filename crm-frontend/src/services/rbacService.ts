import { apiService } from '@/services/apiService';
import { Role, PermissionsByCategory } from '@/lib/types/rbac';

export const rbacService = {
  async getRoles(): Promise<Role[]> {
    const response = await apiService.get<Role[]>('/admin/roles/');
    return response.data;
  },

  async getRole(id: string): Promise<Role> {
    const response = await apiService.get<Role>(`/admin/roles/${id}/`);
    return response.data;
  },

  async createRole(data: { name: string; slug: string; description: string; permissions: string[] }): Promise<Role> {
    const response = await apiService.post<Role>('/admin/roles/', data);
    return response.data;
  },

  async updateRole(id: string, data: Partial<{ name: string; slug: string; description: string; permissions: string[] }>): Promise<Role> {
    const response = await apiService.patch<Role>(`/admin/roles/${id}/`, data);
    return response.data;
  },

  async deleteRole(id: string): Promise<void> {
    await apiService.delete(`/admin/roles/${id}/`);
  },

  async getPermissions(): Promise<PermissionsByCategory> {
    const response = await apiService.get<PermissionsByCategory>('/admin/permissions/');
    return response.data;
  },
};
