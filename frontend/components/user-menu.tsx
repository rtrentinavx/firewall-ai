'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Eye } from 'lucide-react';
import { auditApi } from '@/lib/api';
import { User as UserType } from '@/types';

const STORAGE_KEY = 'authBasic';

interface UserInfo {
  username: string;
  role: 'admin' | 'user' | 'viewer';
  email: string;
}

function decodeUsername(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = atob(token);
    const [username] = decoded.split(':', 1);
    return username || null;
  } catch {
    return null;
  }
}

export default function UserMenu() {
  const [username, setUsername] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const updateUser = async () => {
      const token = localStorage.getItem(STORAGE_KEY);
      const decodedUsername = decodeUsername(token);
      setUsername(decodedUsername);
      
      // Try to fetch full user info
      if (token && typeof window !== 'undefined') {
        try {
          const user = await auditApi.getCurrentUser();
          setUserInfo({
            username: user.username,
            role: user.role,
            email: user.email
          });
        } catch (err) {
          // If API call fails, just use username
          console.debug('Could not fetch user info:', err);
        }
      }
    };

    updateUser();
    window.addEventListener('storage', updateUser);
    window.addEventListener('auth-changed', updateUser as EventListener);

    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('auth-changed', updateUser as EventListener);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserInfo(null);
    window.dispatchEvent(new Event('auth-changed'));
    window.location.reload();
  };

  if (!username) return null;

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role?: string) => {
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
    <div className="flex items-center gap-2">
      {userInfo && (
        <Badge className={`${getRoleColor(userInfo.role)} flex items-center gap-1`}>
          {getRoleIcon(userInfo.role)}
          <span className="capitalize">{userInfo.username}</span>
        </Badge>
      )}
      {!userInfo && (
        <Badge variant="secondary" className="capitalize">
          {username}
        </Badge>
      )}
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
