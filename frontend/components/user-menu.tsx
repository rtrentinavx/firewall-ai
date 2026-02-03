'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STORAGE_KEY = 'authBasic';

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

  useEffect(() => {
    const updateUser = () => {
      setUsername(decodeUsername(localStorage.getItem(STORAGE_KEY)));
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
    window.dispatchEvent(new Event('auth-changed'));
    window.location.reload();
  };

  if (!username) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="capitalize">
        {username}
      </Badge>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
