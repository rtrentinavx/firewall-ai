'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  User as UserIcon,
  Eye,
  RefreshCw,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { User, UserStats } from '@/types';

export default function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user' | 'viewer',
    active: true
  });

  const getAuthHeaders = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authBasic');
      if (token) {
        return {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json',
        };
      }
    }
    return {
      'Content-Type': 'application/json',
    };
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const [usersResponse, statsResponse] = await Promise.all([
        axios.get(`${baseURL}/users`, { headers: getAuthHeaders(), timeout: 10000 }),
        axios.get(`${baseURL}/users/stats`, { headers: getAuthHeaders(), timeout: 10000 })
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.users || []);
      } else {
        throw new Error(usersResponse.data.error || 'Failed to load users');
      }
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      } else {
        console.warn('Failed to load user stats:', statsResponse.data.error);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timeout - backend may be slow or unresponsive');
        } else if (err.code === 'ECONNRESET') {
          setError('Connection reset - backend may have crashed. Please check backend logs.');
        } else {
          setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to load users');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('Username, email, and password are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/users`,
        formData,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setSuccess(`User ${formData.username} created successfully`);
        setShowCreateForm(false);
        setFormData({ username: '', email: '', password: '', role: 'user', active: true });
        await loadUsers();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (user: User) => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const updateData: any = {
        email: formData.email,
        role: formData.role,
        active: formData.active
      };
      
      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await axios.put(
        `${baseURL}/users/${user.user_id}`,
        updateData,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setSuccess(`User ${user.username} updated successfully`);
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', role: 'user', active: true });
        await loadUsers();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to update user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.delete(
        `${baseURL}/users/${user.user_id}`,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setSuccess(`User ${user.username} deleted successfully`);
        await loadUsers();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to delete user');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setShowCreateForm(false);
    setFormData({ username: '', email: '', password: '', role: 'user', active: true });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'viewer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">User Management</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage users, roles, and access permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setEditingUser(null);
              setFormData({ username: '', email: '', password: '', role: 'user', active: true });
            }}
            disabled={showCreateForm || editingUser !== null}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess(null)}
                className="ml-auto h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-6">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Total Users</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total_users}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Active</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.active_users}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Admins</p>
              <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{stats.admins}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Users</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.users}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Viewers</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.viewers}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Inactive</p>
              <p className="text-2xl font-semibold text-slate-500 dark:text-slate-400">{stats.inactive_users}</p>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {(showCreateForm || editingUser) && (
          <Card className="p-6 border-2 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h4>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser && '(leave blank to keep current)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'user' | 'viewer') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="active">Status</Label>
                  <Select
                    value={formData.active ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, active: value === 'active' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={editingUser ? () => handleUpdateUser(editingUser) : handleCreateUser}
                disabled={loading}
              >
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Users List */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 dark:text-white">Users</h4>
          {loading && users.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Card
                  key={user.user_id}
                  className={`p-4 border-slate-200/70 dark:border-slate-800/70 ${
                    !user.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {user.username}
                          </p>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                          {!user.active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                        <div className="flex gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
                          {user.last_login && (
                            <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(user)}
                        disabled={editingUser?.user_id === user.user_id || showCreateForm}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
