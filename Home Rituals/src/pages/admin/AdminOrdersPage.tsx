import React, { useEffect, useState } from 'react';
import { Truck, Search, Eye, X } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';

interface OrderItem {
  id: string | number;
  quantity: number;
  price: number;
  product: { id: string | number; name: string; image: string; sku: string };
}

interface Order {
  id: string | number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  fullName: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  trackingNumber?: string;
  courierName?: string;
  createdAt: string;
  user?: { name: string; email: string };
  items: OrderItem[];
}

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status update dialog
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any>('/api/orders');
      setOrders(Array.isArray(data) ? data : (data?.data || data?.orders || data?.items || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenStatusModal = (order: Order) => {
    setUpdatingOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.trackingNumber || '');
    setCourierName(order.courierName || 'BlueDart Express');
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingOrder) return;
    try {
      setSaving(true);
      await apiRequest(`/api/orders/${updatingOrder.id}/status`, 'PUT', {
        status: newStatus,
        trackingNumber: trackingNumber || undefined,
        courierName: courierName || undefined,
      });
      setIsStatusModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch =
      String(o.id).includes(search) ||
      o.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Orders Manager</h1>
        <p className="text-stone-600 text-sm mt-0.5">Track fulfillment, update order status, and inspect customer purchases.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order ID, customer name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-stone-500 uppercase">Fulfillment Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Packed">Packed</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No orders match criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wider text-stone-500 bg-stone-50">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tracking</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-stone-900">#{order.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{order.fullName}</div>
                      <div className="text-xs text-stone-500">{order.user?.email || order.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">₹{order.totalAmount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                          order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-900 text-white">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-stone-600">
                      {order.trackingNumber ? `${order.courierName || 'Courier'}: ${order.trackingNumber}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(order)}
                          className="p-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition font-medium text-xs flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details View Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-stone-900">Order #{selectedOrder.id} Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="bg-stone-50 p-4 rounded-xl space-y-1">
                <p className="font-semibold text-stone-900">Shipping Address:</p>
                <p className="text-stone-700">{selectedOrder.fullName}</p>
                <p className="text-stone-600 text-xs">{selectedOrder.address1}</p>
                <p className="text-stone-600 text-xs">
                  {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.postalCode}
                </p>
                <p className="text-stone-600 text-xs font-mono mt-1">Phone: {selectedOrder.phone}</p>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-2">Order Line Items:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-3">
                        <img src={item.product?.image} alt={item.product?.name} className="w-10 h-10 rounded object-cover border" />
                        <div>
                          <p className="font-medium text-stone-900 text-xs">{item.product?.name}</p>
                          <p className="text-[10px] text-stone-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-stone-900">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900">
                <span>Total Amount Paid</span>
                <span>₹{selectedOrder.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-serif font-bold text-stone-900">Update Order #{updatingOrder?.id} Status</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Fulfillment Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Courier Partner Name</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. BlueDart / Delhivery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Tracking AWB Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. AWB984123512"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition"
                >
                  {saving ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
