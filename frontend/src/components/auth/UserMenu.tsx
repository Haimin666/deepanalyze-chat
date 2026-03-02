"use client";

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Shield } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import type { User as UserType } from '@/lib/auth-types';

interface UserMenuProps {
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export function UserMenu({ onLogout, onOpenAdmin }: UserMenuProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
          Admin
        </span>
      );
    }
    return null;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              {getRoleBadge(user.role)}
            </div>
            <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
        <DropdownMenuItem className="text-gray-600 dark:text-gray-300">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem 
            className="text-gray-600 dark:text-gray-300"
            onClick={onOpenAdmin}
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-gray-600 dark:text-gray-300">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />
        <DropdownMenuItem 
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
