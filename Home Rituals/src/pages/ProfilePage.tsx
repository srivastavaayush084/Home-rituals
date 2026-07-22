import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  MapPin,
  Lock,
  Heart,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Truck,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  X,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../utils/apiClient';
import { ProductCard } from '../components/ui/ProductCard';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    image: string;
    slug?: string;
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  paymentMethod: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  shippingAddress: any;
  items: OrderItem[];
}

export function ProfilePage() {
  const { user, logout, addresses, fetchAddresses, createAddress, products, wishlistIds, toggleWishlist, addToCart } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'account' | 'wishlist'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | number | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    landmark: '',
    isDefault: false,
  });

  // Account Settings State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if guest
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user, navigate]);

  // Load orders
  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      try {
        setLoadingOrders(true);
        const data = await apiRequest<any>('/api/orders');
        const list = Array.isArray(data) ? data : (data?.data || data?.orders || []);
        setOrders(list);
      } catch (err) {
        console.warn('Failed to load user orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    }
    loadOrders();
    fetchAddresses();
  }, [user]);

  // Handle Address Submit
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddressId) {
        await apiRequest(`/api/addresses/${editingAddressId}`, 'PUT', addressForm);
      } else {
        await createAddress(addressForm);
      }
      await fetchAddresses();
      setIsAddressModalOpen(false);
      resetAddressForm();
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    }
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      fullName: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      landmark: '',
      isDefault: false,
    });
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      address1: addr.address1,
      address2: addr.address2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || 'India',
      landmark: addr.landmark || '',
      isDefault: addr.isDefault,
    });
    setIsAddressModalOpen(true);
  };

  const handleDeleteAddress = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await apiRequest(`/api/addresses/${id}`, 'DELETE');
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  // Handle Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsUpdatingProfile(true);
    try {
      await apiRequest('/api/auth/profile', 'PUT', { name, phone });
      setProfileMessage({ type: 'success', text: 'Personal details updated successfully!' });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiRequest('/api/auth/change-password', 'PUT', { currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const wishlistProducts = products.filter((p) => wishlistIds.some((id: any) => String(id) === String(p.id)));

  if (!user) return null;

  return (
    <div className="bg-[#f9faf9] min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* User Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#1c2c22] via-[#223229] to-[#2d4237] p-8 text-white shadow-lg mb-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-[#44D62C] text-[#111] flex items-center justify-center font-bold text-2xl shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-serif font-semibold text-white">{user.name}</h1>
                  {user.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-[#44D62C]" /> Customer
                    </span>
                  )}
                </div>
                <p className="text-stone-300 text-sm mt-1">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user.role === 'ADMIN' ? (
                <Link
                  to="/admin"
                  className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition shadow-sm"
                >
                  Admin Panel
                </Link>
              ) : null}
              <button
                onClick={logout}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[24px] border border-stone-200 p-4 shadow-sm space-y-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                  activeTab === 'orders' ? 'bg-[#44D62C] text-white shadow-sm font-semibold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Package className="w-4 h-4" />
                My Orders
                <span className="ml-auto text-xs opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                  activeTab === 'addresses' ? 'bg-[#44D62C] text-white shadow-sm font-semibold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Saved Addresses
                <span className="ml-auto text-xs opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                  {addresses.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                  activeTab === 'wishlist' ? 'bg-[#44D62C] text-white shadow-sm font-semibold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Heart className="w-4 h-4" />
                Wishlist
                <span className="ml-auto text-xs opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                  {wishlistIds.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
                  activeTab === 'account' ? 'bg-[#44D62C] text-white shadow-sm font-semibold' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Account Settings
              </button>
            </div>
          </div>

          {/* Main Content Pane */}
          <div className="lg:col-span-3">

            {/* TAB 1: MY ORDERS */}
            {activeTab === 'orders' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Order History</h2>
                  <span className="text-sm text-stone-500">{orders.length} past orders</span>
                </div>

                {loadingOrders ? (
                  <div className="bg-white rounded-[24px] p-12 border border-stone-200 text-center text-stone-500">
                    <div className="w-8 h-8 border-4 border-[#44D62C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading your order history...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 border border-stone-200 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-800">No orders yet</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto">
                      Explore our cleaning essentials catalog and place your first order today!
                    </p>
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#44D62C] text-white font-semibold rounded-full shadow-md hover:bg-[#3bc224] transition"
                    >
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white rounded-[24px] border border-stone-200 p-6 shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
                          <div>
                            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Order ID</span>
                            <h3 className="text-base font-bold text-stone-900">#{ord.id.slice(-8).toUpperCase()}</h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                ord.status === 'Delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : ord.status === 'Shipped'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ord.status === 'Confirmed'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                            <span className="text-lg font-bold text-stone-900">₹{ord.totalAmount}</span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="py-4 space-y-3">
                          {ord.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-4">
                              <img
                                src={item.product?.image || '/washing-machine-cleaner.png'}
                                alt={item.product?.name || 'Product'}
                                className="w-14 h-14 object-cover rounded-xl bg-stone-100 border border-stone-200"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-stone-900 truncate">
                                  {item.product?.name || 'Home Care Product'}
                                </h4>
                                <p className="text-xs text-stone-500 mt-0.5">
                                  Qty: {item.quantity} × ₹{item.price}
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-stone-900">
                                ₹{item.price * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order Footer & Tracking */}
                        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
                          <div>
                            {ord.trackingNumber ? (
                              <p className="flex items-center gap-1.5 text-stone-700 font-medium">
                                <Truck className="w-4 h-4 text-blue-600" />
                                {ord.carrier || 'Courier'}: <span className="font-mono">{ord.trackingNumber}</span>
                              </p>
                            ) : (
                              <p className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-stone-400" />
                                Payment Method: <span className="font-semibold text-stone-700">{ord.paymentMethod}</span>
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              ord.items?.forEach((it) => {
                                if (it.product) {
                                  addToCart(it.product as any, it.quantity);
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111] hover:text-[#44D62C] transition self-start sm:self-auto"
                          >
                            Reorder All Items <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* TAB 2: SAVED ADDRESSES */}
            {activeTab === 'addresses' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Saved Addresses</h2>
                  <button
                    onClick={() => {
                      resetAddressForm();
                      setIsAddressModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#44D62C] text-white font-semibold text-sm rounded-full shadow-sm hover:bg-[#3bc224] transition"
                  >
                    <Plus className="w-4 h-4" /> Add New Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 border border-stone-200 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-800">No saved addresses</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto">
                      Save your shipping address for a faster and smoother checkout experience!
                    </p>
                    <button
                      onClick={() => setIsAddressModalOpen(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#44D62C] text-white font-semibold rounded-full shadow-md hover:bg-[#3bc224] transition"
                    >
                      Add Address Now
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`bg-white rounded-[24px] border p-6 shadow-sm relative flex flex-col justify-between transition ${
                          addr.isDefault ? 'border-[#44D62C] ring-1 ring-[#44D62C]' : 'border-stone-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-stone-900 text-base">{addr.fullName}</span>
                            {addr.isDefault ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Default
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-stone-500 font-medium mb-2">Phone: {addr.phone}</p>
                          <p className="text-sm text-stone-700 leading-relaxed">
                            {addr.address1}
                            {addr.address2 ? `, ${addr.address2}` : ''}
                            {addr.landmark ? ` (Near ${addr.landmark})` : ''}
                            <br />
                            {addr.city}, {addr.state} - <span className="font-semibold">{addr.postalCode}</span>
                            <br />
                            {addr.country}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                          <button
                            onClick={() => handleEditAddress(addr)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* TAB 3: ACCOUNT SETTINGS */}
            {activeTab === 'account' ? (
              <div className="space-y-8">
                {/* Profile Edit */}
                <div className="bg-white rounded-[24px] border border-stone-200 p-6 md:p-8 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-stone-900 mb-4">Personal Details</h3>

                  {profileMessage ? (
                    <div
                      className={`mb-4 p-4 rounded-xl text-sm ${
                        profileMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {profileMessage.text}
                    </div>
                  ) : null}

                  <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Mobile Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed text-sm"
                      />
                      <span className="text-[11px] text-stone-400 mt-1 block">Email address cannot be changed.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-6 py-3 bg-[#44D62C] hover:bg-[#3bc224] text-white font-semibold text-sm rounded-full shadow-sm transition disabled:opacity-50"
                    >
                      {isUpdatingProfile ? 'Saving...' : 'Save Profile Details'}
                    </button>
                  </form>
                </div>

                {/* Password Change */}
                <div className="bg-white rounded-[24px] border border-stone-200 p-6 md:p-8 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-stone-700" /> Change Security Password
                  </h3>

                  {passwordMessage ? (
                    <div
                      className={`mb-4 p-4 rounded-xl text-sm ${
                        passwordMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {passwordMessage.text}
                    </div>
                  ) : null}

                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm rounded-full shadow-sm transition disabled:opacity-50"
                    >
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {/* TAB 4: WISHLIST */}
            {activeTab === 'wishlist' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-bold text-stone-900">Saved Wishlist</h2>
                  <span className="text-sm text-stone-500">{wishlistProducts.length} items</span>
                </div>

                {wishlistProducts.length === 0 ? (
                  <div className="bg-white rounded-[24px] p-12 border border-stone-200 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="w-8 h-8 fill-current" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-800">Your wishlist is empty</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto">
                      Click the heart icon on any product to save it to your personal wishlist!
                    </p>
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#44D62C] text-white font-semibold rounded-full shadow-md hover:bg-[#3bc224] transition"
                    >
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {wishlistProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isWishlisted={true}
                        onToggleWishlist={toggleWishlist}
                        onAddToCart={addToCart}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}

          </div>
        </div>

      </div>

      {/* ADDRESS MODAL */}
      {isAddressModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">
              {editingAddressId ? 'Edit Address' : 'Add New Address'}
            </h3>

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={addressForm.address1}
                  onChange={(e) => setAddressForm({ ...addressForm, address1: e.target.value })}
                  placeholder="House/Flat No., Building Name, Street"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addressForm.address2}
                  onChange={(e) => setAddressForm({ ...addressForm, address2: e.target.value })}
                  placeholder="Apartment, suite, unit, etc."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">PIN / Postal Code</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="Near Park / Hospital"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#44D62C] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-[#44D62C] rounded focus:ring-[#44D62C]"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-stone-700">
                  Set as default shipping address
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-full font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#44D62C] text-white hover:bg-[#3bc224] rounded-full font-semibold text-sm shadow-md transition"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProfilePage;
