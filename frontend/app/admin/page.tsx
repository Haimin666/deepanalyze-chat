'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/config';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      alert('无权限访问');
      router.push('/');
      return;
    }
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return alert('请填写完整');
    try {
      await api.post('/api/admin/users', newUser);
      setNewUser({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (e) {
      alert('添加失败，用户名可能已存在');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该用户吗？')) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      fetchUsers();
    } catch (e) {
      alert('删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">用户管理 (Admin)</h1>
          <button onClick={() => router.push('/')} className="text-blue-600 hover:underline">返回对话系统</button>
        </div>

        <div className="mb-6 flex gap-4 bg-gray-100 p-4 rounded-lg">
          <input className="border p-2 rounded flex-1" placeholder="新用户名" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
          <input className="border p-2 rounded flex-1" type="password" placeholder="密码" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          <select className="border p-2 rounded bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
            <option value="user">普通用户 (User)</option>
            <option value="admin">管理员 (Admin)</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={handleAddUser}>增加用户</button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="p-3 border">ID</th>
              <th className="p-3 border">用户名</th>
              <th className="p-3 border">角色</th>
              <th className="p-3 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 border">{u.id}</td>
                <td className="p-3 border">{u.username}</td>
                <td className="p-3 border">{u.role === 'admin' ? '管理员' : '普通用户'}</td>
                <td className="p-3 border">
                  {u.username !== 'admin' && (
                    <button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600" onClick={() => handleDelete(u.id)}>删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}