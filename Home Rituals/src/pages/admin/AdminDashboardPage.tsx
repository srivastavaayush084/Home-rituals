import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/apiClient';

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    paidOrdersCount: number;
    averageOrderValue: number;
    totalUsers: number;
    totalProducts: number;
    outOfStockProducts: number;
    pendingReviews: number;
    newsletterSubscribers: number;
  };
  categoryDistribution: Array<{
    categoryId: number;
    categoryName: string;
    productCount: number;
  }>;
  salesTrend: Array<{
    month: string;
    sales: number;
  }>;
  recentOrders: Array<{
    id: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
}

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await apiRequest<AnalyticsData>('/api/admin/analytics');
        setData((res as any)?.summary ? res : ((res as any)?.data || res));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Loading real-time analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-semibold text-lg mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm mb-4">{error || 'Server unreachable or database connection required'}</p>
      </div>
    );
  }

  const { summary, categoryDistribution, salesTrend, recentOrders } = data;

  const maxSales = Math.max(...salesTrend.map((s) => s.sales), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900">Dashboard & Analytics</h1>
        <p className="text-stone-600 text-sm mt-1">Real-time overview of sales performance, inventory, and activity.</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-stone-500 tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">₹{summary.totalRevenue.toLocaleString()}</h3>
            <p className="text-xs text-stone-500 mt-1">Avg ₹{summary.averageOrderValue} / order</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-stone-500 tracking-wider">Paid Orders</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">{summary.paidOrdersCount}</h3>
            <p className="text-xs text-stone-500 mt-1">Completed transactions</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-stone-500 tracking-wider">Products Catalog</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">{summary.totalProducts}</h3>
            {summary.outOfStockProducts > 0 ? (
              <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {summary.outOfStockProducts} out of stock
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-medium mt-1">All in stock</p>
            )}
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-stone-500 tracking-wider">Registered Users</p>
            <h3 className="text-2xl font-bold text-stone-900 mt-1">{summary.totalUsers}</h3>
            <p className="text-xs text-stone-500 mt-1">{summary.newsletterSubscribers} subscribers</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Monthly Revenue Performance
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Paid order volume breakdown by month</p>
            </div>
          </div>

          <div className="h-64 flex items-end gap-3 pt-8 pb-2">
            {salesTrend.map((item) => {
              const heightPercent = (item.sales / maxSales) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-semibold text-stone-600">
                    {item.sales > 0 ? `₹${item.sales}` : ''}
                  </span>
                  <div
                    className="w-full bg-amber-600 rounded-t-md hover:bg-amber-700 transition"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />
                  <span className="text-xs font-medium text-stone-500">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-stone-900 mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {categoryDistribution.map((cat) => (
              <div key={cat.categoryId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-stone-800">{cat.categoryName}</span>
                  <span className="text-stone-500">{cat.productCount} products</span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900 rounded-full"
                    style={{
                      width: `${Math.min(100, (cat.productCount / (summary.totalProducts || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Log Table */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Recent Customer Orders
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Latest transactions processed through the system</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
          >
            View All Orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-center py-8 text-stone-500 text-sm">No orders recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-stone-900">#{order.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{order.user.name}</div>
                      <div className="text-xs text-stone-500">{order.user.email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">₹{order.totalAmount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(order.createdAt).toLocaleDateString()}
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
