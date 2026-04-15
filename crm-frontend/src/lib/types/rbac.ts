export interface Permission {
  id: string;
  codename: string;
  name: string;
  category: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface PermissionsByCategory {
  [category: string]: Permission[];
}
