import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/apiClient';

interface ContactMessage {
  id: string | number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface NewsletterSub {
  id: string | number;
  email: string;
  active: boolean;
  createdAt: string;
}

export const AdminInquiriesPage: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contact' | 'newsletter'>('contact');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [msgRes, subRes] = await Promise.all([
        apiRequest<any>('/api/contact'),
        apiRequest<any>('/api/newsletter'),
      ]);
      setMessages(Array.isArray(msgRes) ? msgRes : (msgRes?.data || msgRes?.messages || msgRes?.items || []));
      setSubscribers(Array.isArray(subRes) ? subRes : (subRes?.data || subRes?.subscribers || subRes?.items || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string | number, status: string) => {
    try {
      await apiRequest(`/api/contact/${id}`, 'PUT', { status });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Inquiries & Subscriptions</h1>
        <p className="text-stone-600 text-sm mt-0.5">Manage incoming contact forms and newsletter subscriber lists.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveTab('contact')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'contact' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Contact Submissions ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab('newsletter')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'newsletter' ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Newsletter Subscribers ({subscribers.length})
        </button>
      </div>

      {activeTab === 'contact' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          {loading ? (
            <div className="py-12 text-center text-stone-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-stone-500">No contact messages received yet.</div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900 text-sm">{m.subject}</span>
                      <span className="text-xs text-stone-500 ml-2">from {m.name} ({m.email})</span>
                    </div>
                    <span className="text-xs text-stone-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200">{m.message}</p>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleUpdateStatus(m.id, 'Replied')}
                      className={`px-3 py-1 rounded-md font-medium transition ${
                        m.status === 'Replied' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      {m.status === 'Replied' ? 'Marked Replied' : 'Mark Replied'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-stone-500">Loading subscribers...</div>
          ) : subscribers.length === 0 ? (
            <div className="p-12 text-center text-stone-500">No newsletter subscribers yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500 bg-stone-50">
                    <th className="py-3 px-4">Subscriber Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Subscribed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">{s.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
