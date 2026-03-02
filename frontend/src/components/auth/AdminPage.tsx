"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Moon, Sun, Plus, Trash2, Pencil, ArrowLeft, Loader2, Users } from 'lucide-react';
import { useAuthStore, type User } from '@/lib/store';
import { useTheme } from '@/components/three-panel/hooks/useTheme';
import { API_URLS } from '@/lib/config';

interface AdminPageProps {
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  
  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  
  // Edit user form
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  
  const { user, token } = useAuthStore();
  const { isDarkMode, toggleTheme, mounted } = useTheme();

  const loadUsers = useCallback(async () => {
    if (!user?.id || !token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URLS.USERS}?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async () => {
    if (!user?.id || !token) return;
    if (!newUsername || !newName || !newPassword) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(API_URLS.USERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUsers([...users, data]);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('user');
      } else {
        alert(data.detail || '创建用户失败');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('创建用户失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!user?.id || !token || !editingUser) return;
    
    try {
      const response = await fetch(`${API_URLS.USERS}/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          role: editRole,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? data : u));
        setEditingUser(null);
      } else {
        alert(data.detail || '更新用户失败');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('更新用户失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user?.id || !token) return;
    
    try {
      const response = await fetch(`${API_URLS.USERS}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert(data.detail || '删除用户失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除用户失败');
    } finally {
      setDeleteUserId(null);
    }
  };

  const startEdit = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name);
    setEditRole(targetUser.role as 'admin' | 'user');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-lg font-semibold">用户管理</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-8 w-8 p-0"
        >
          {mounted ? (
            isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Create User Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mb-6 bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200">
                <Plus className="h-4 w-4 mr-2" />
                添加用户
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle>创建新用户</DialogTitle>
                <DialogDescription>
                  添加一个新用户到系统。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">用户名</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-white dark:bg-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name">姓名</Label>
                  <Input
                    id="new-name"
                    placeholder="请输入姓名"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white dark:bg-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">密码</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="请输入密码"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white dark:bg-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-role">角色</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'user')}>
                    <SelectTrigger className="bg-white dark:bg-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">普通用户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={!newUsername || !newName || !newPassword || isCreating}
                      className="bg-black text-white dark:bg-white dark:text-black"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          创建中...
                        </>
                      ) : (
                        '创建用户'
                      )}
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Users Table */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead>姓名</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((tableUser) => (
                    <TableRow key={tableUser.id}>
                      <TableCell className="font-medium">{tableUser.name}</TableCell>
                      <TableCell>{tableUser.username}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tableUser.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {tableUser.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400">
                        {new Date(tableUser.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(tableUser)}
                            className="h-8 w-8 p-0"
                            disabled={tableUser.id === user?.id}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                disabled={tableUser.id === user?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>删除用户？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要删除用户 {tableUser.name} 吗？此操作无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteUser(tableUser.id)}
                                >
                                  删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              更新用户信息。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">姓名</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white dark:bg-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">角色</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'user')}>
                <SelectTrigger className="bg-white dark:bg-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              取消
            </Button>
            <Button 
              onClick={handleUpdateUser}
              className="bg-black text-white dark:bg-white dark:text-black"
            >
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
