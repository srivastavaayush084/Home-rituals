import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { apiRequest, apiUploadRequest } from '../../utils/apiClient';

interface Banner {
  id: string | number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  createdAt: string;
}

export const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '/shop',
    active: true,
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Banner[]>('/api/banners/all');
      setBanners(Array.isArray(data) ? data : ((data as any)?.data || (data as any)?.items || []));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch image banners' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || '/shop',
        active: banner.active,
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1400&q=80',
        linkUrl: '/shop',
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await apiUploadRequest<{ url: string }>('/api/upload', file, 'banners');
      if (res.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.url }));
        setMessage({ type: 'success', text: 'Banner image uploaded successfully' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Image upload failed. You can also paste an image URL.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      if (editingBanner) {
        await apiRequest(`/api/banners/${editingBanner.id}`, 'PUT', formData);
        setMessage({ type: 'success', text: 'Image banner updated successfully' });
      } else {
        await apiRequest('/api/banners', 'POST', formData);
        setMessage({ type: 'success', text: 'New image offer banner created' });
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Saving failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await apiRequest(`/api/banners/${banner.id}`, 'PUT', { active: !banner.active });
      setMessage({ type: 'success', text: `Banner ${!banner.active ? 'activated' : 'deactivated'}` });
      fetchBanners();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Toggle failed' });
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Delete this image banner?')) return;
    try {
      await apiRequest(`/api/banners/${id}`, 'DELETE');
      setMessage({ type: 'success', text: 'Image banner deleted' });
      fetchBanners();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Deletion failed' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Offer Banner Images CMS</h1>
          <p className="text-stone-600 text-sm mt-0.5">Upload and manage graphic offer banners displayed on the storefront homepage.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Image Banner
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid of Image Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-stone-500">Loading offer image banners...</div>
        ) : banners.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200 p-8">
            <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-medium text-stone-700">No image banners uploaded yet</p>
            <p className="text-xs text-stone-500 mt-1">Upload an image offer banner to display on the storefront homepage.</p>
          </div>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm flex flex-col justify-between transition ${
                b.active ? 'border-stone-200' : 'border-stone-300 opacity-60'
              }`}
            >
              <div className="relative">
                <img src={b.imageUrl} alt={b.title} className="w-full h-48 object-cover bg-stone-100" />
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(b)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1 ${
                      b.active ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {b.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {b.active ? 'Live' : 'Hidden'}
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="font-bold text-stone-900 text-base">{b.title}</h3>
                <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1 font-mono">
                    <ExternalLink className="w-3.5 h-3.5" /> {b.linkUrl}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(b)}
                      className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-stone-900">
                {editingBanner ? 'Edit Image Banner' : 'Add Image Banner'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Banner Title / Campaign Name</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Festival Super Sale Banner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Banner Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="https://..."
                />
              </div>

              {/* Upload image option */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Or Upload Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {uploading && <p className="text-xs text-amber-600 mt-1">Uploading image...</p>}
              </div>

              {/* Live Preview */}
              {formData.imageUrl && (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Live Image Preview</label>
                  <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50 max-h-40">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-36 object-cover" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Click Destination Link URL</label>
                <input
                  type="text"
                  required
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. /shop or /product/5"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="activeToggle" className="text-sm font-medium text-stone-800">
                  Publish Image Banner to Storefront
                </label>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition"
                >
                  {saving ? 'Saving...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
