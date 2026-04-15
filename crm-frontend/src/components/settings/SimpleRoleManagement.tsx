
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserMinus, UserPlus, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'support' | 'risk' | 'user';
  created_at: string;
}

type AppRole = 'admin' | 'support' | 'risk' | 'user';

const roleColors = {
  admin: 'destructive',
  support: 'secondary',
  risk: 'outline',
  user: 'default',
} as const;

const SimpleRoleManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Mock users data
      const mockUsers: UserProfile[] = [
        {
          id: '1',
          email: 'admin@wefund.com',
          first_name: 'John',
          last_name: 'Admin',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'support@wefund.com',
          first_name: 'Jane',
          last_name: 'Support',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
        },
        {
          id: '3',
          email: 'risk@wefund.com',
          first_name: 'Bob',
          last_name: 'Risk',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
        },
      ];

      setUsers(mockUsers);

      // Mock user roles data
      const mockRoles: UserRole[] = [
        { id: '1', user_id: '1', role: 'admin', created_at: new Date().toISOString() },
        { id: '2', user_id: '2', role: 'support', created_at: new Date().toISOString() },
        { id: '3', user_id: '3', role: 'risk', created_at: new Date().toISOString() },
      ];

      setUserRoles(mockRoles);
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles
      .filter(role => role.user_id === userId)
      .map(role => role.role);
  };

  const hasRole = (userId: string, role: AppRole): boolean => {
    return getUserRoles(userId).includes(role);
  };

  const assignRole = async (userId: string, role: AppRole) => {
    try {
      const newRole: UserRole = {
        id: Date.now().toString(),
        user_id: userId,
        role: role,
        created_at: new Date().toISOString(),
      };

      setUserRoles(prev => [...prev, newRole]);

      toast({
        title: "Role assigned",
        description: `Successfully assigned ${role} role`,
      });
    } catch (error) {
      console.error('Error in assignRole:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      setUserRoles(prev => prev.filter(r => !(r.user_id === userId && r.role === role)));

      toast({
        title: "Role removed",
        description: `Successfully removed ${role} role`,
      });
    } catch (error) {
      console.error('Error in removeRole:', error);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions across the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role Assignment Section */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-3">Quick Role Assignment</h3>
            <div className="flex items-center gap-3">
              <Select value={selectedRole} onValueChange={(value: AppRole) => setSelectedRole(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a role to assign/remove from users in the table below
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Roles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roles = getUserRoles(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {(user.first_name || user.last_name) && (
                            <p className="text-sm text-muted-foreground">
                              {user.first_name} {user.last_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.length > 0 ? (
                            roles.map((role) => (
                              <Badge 
                                key={role} 
                                variant={roleColors[role]}
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">No roles</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {hasRole(user.id, selectedRole) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeRole(user.id, selectedRole)}
                              className="text-xs"
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              Remove {selectedRole}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => assignRole(user.id, selectedRole)}
                              className="text-xs"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add {selectedRole}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <Badge variant="destructive" className="mb-2">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Full system access, user management, role assignment, EA approval
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge variant="secondary" className="mb-2">Support</Badge>
              <p className="text-sm text-muted-foreground">
                Customer support, ticket management, limited user access
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge variant="outline" className="mb-2">Risk</Badge>
              <p className="text-sm text-muted-foreground">
                Risk management, compliance monitoring, trading oversight
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge variant="default" className="mb-2">User</Badge>
              <p className="text-sm text-muted-foreground">
                Basic application access, personal profile management
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleRoleManagement;
