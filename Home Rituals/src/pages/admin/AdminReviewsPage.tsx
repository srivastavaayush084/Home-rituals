import React, { useEffect, useState } from 'react';
import { Check, Trash2, Star, MessageSquare } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';

interface Review {
  id: string | number;
  author: string;
  title: string;
  text: string;
  rating: number;
  isApproved: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
  product?: { id: string | number; name: string; image: string };
}

export const AdminReviewsPage: React.FC = () => {
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Review[]>('/api/reviews/pending');
      setPendingReviews(Array.isArray(data) ? data : ((data as any)?.data || (data as any)?.items || []));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (id: string | number) => {
    try {
      await apiRequest(`/api/reviews/${id}/approve`, 'PUT');
      setMessage({ type: 'success', text: 'Review approved and published' });
      fetchReviews();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Approval failed' });
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await apiRequest(`/api/reviews/${id}`, 'DELETE');
      setMessage({ type: 'success', text: 'Review removed' });
      fetchReviews();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Reviews Moderation</h1>
        <p className="text-stone-600 text-sm mt-0.5">Review and approve customer feedback before publishing to store pages.</p>
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

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        {loading ? (
          <div className="py-12 text-center text-stone-500">Loading pending reviews...</div>
        ) : pendingReviews.length === 0 ? (
          <div className="py-12 text-center text-stone-500">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-medium text-stone-700">No pending reviews requiring moderation</p>
            <p className="text-xs mt-1">All submitted customer reviews have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < rev.rating ? 'fill-current' : 'text-stone-300'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-stone-900 text-sm">{rev.title}</span>
                  </div>
                  <p className="text-xs text-stone-700">{rev.text}</p>
                  <p className="text-[11px] text-stone-500">
                    By <span className="font-medium text-stone-800">{rev.author}</span> on product:{' '}
                    <span className="font-semibold text-stone-900">{rev.product?.name || `ID ${rev.id}`}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(rev.id)}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleDelete(rev.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
