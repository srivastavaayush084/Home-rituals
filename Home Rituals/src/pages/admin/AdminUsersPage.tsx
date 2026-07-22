import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';

interface UserRecord {
  id: string | number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any>('/api/admin/users?limit=100');
      setUsers(Array.isArray(res) ? res : (res?.data || res?.items || []));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch user directory' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (userId: string | number, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Are you sure you want to change this user's role to ${nextRole}?`)) return;
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, 'PUT');
      setMessage({ type: 'success', text: `User role changed to ${nextRole}` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Role change failed' });
    }
  };

  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">User Role Management</h1>
        <p className="text-stone-600 text-sm mt-0.5">Manage user accounts, privileges, and administrator permissions.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search filter */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading user directory...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No users match query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500 bg-stone-50">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role Privilege</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{u.name}</div>
                      <div className="text-xs text-stone-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          <ShieldCheck className="w-3.5 h-3.5" /> ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleRole(u.id, u.role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          u.role === 'ADMIN'
                            ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'Revoke Admin' : 'Grant Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
