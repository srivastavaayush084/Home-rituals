import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  FileText,
  MessageSquare,
  Users,
  Mail,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  // Guard against non-admin users
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-stone-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Admin Access Required</h2>
          <p className="text-stone-600 text-sm mb-6">
            You must be logged in with an Administrator account to access the Control Center & Content Management System.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition"
            >
              Sign In as Admin
            </Link>
            <Link
              to="/"
              className="block w-full py-3 text-stone-600 bg-stone-100 rounded-xl font-medium hover:bg-stone-200 transition"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Offer Banners', path: '/admin/banners', icon: Sparkles },
    { label: 'Products CMS', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Orders Manager', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Blog & Articles', path: '/admin/blog', icon: FileText },
    { label: 'Reviews', path: '/admin/reviews', icon: MessageSquare },
    { label: 'User Roles', path: '/admin/users', icon: Users },
    { label: 'Inquiries & Subscriptions', path: '/admin/inquiries', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-300 flex-shrink-0 flex flex-col justify-between border-r border-stone-800">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-stone-800 flex items-center justify-between">
            <div>
              <Link to="/admin" className="text-xl font-serif font-bold text-white tracking-wide">
                Home Rituals
              </Link>
              <span className="block text-[10px] uppercase tracking-widest text-amber-400 font-semibold mt-0.5">
                Admin Control Center
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer & Storefront Link */}
        <div className="p-4 border-t border-stone-800 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Administrator
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900">{user.name}</p>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
