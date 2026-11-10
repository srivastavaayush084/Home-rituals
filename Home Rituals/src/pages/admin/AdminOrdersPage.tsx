import React, { useEffect, useState } from 'react';
import {
  Truck,
  Search,
  Eye,
  X,
  RotateCcw,
  CheckCircle2,
  Package,
  RefreshCw,
  Check,
  Ban,
} from 'lucide-react';
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
  paymentGateway?: string;
  transactionId?: string;
  gatewayOrderId?: string;
  signature?: string;
  createdAt: string;
  user?: { name: string; email: string };
  items: OrderItem[];
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancellationComment?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
  refundId?: string | null;
  refundInitiatedAt?: string | null;
  refundProcessedAt?: string | null;
  refundFailureReason?: string | null;
}

interface ReturnItem {
  orderItemId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  image?: string;
}

interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  items: ReturnItem[];
  reason: string;
  description?: string;
  images: string[];
  status: string;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  reverseCourier?: string | null;
  reversePickupAwb?: string | null;
  pickupScheduledAt?: string | null;
  pickedUpAt?: string | null;
  receivedAtWarehouseAt?: string | null;
  inspectionResult?: string | null;
  inspectionNotes?: string | null;
  inspectedAt?: string | null;
  refundType?: string | null;
  refundAmount?: number | null;
  refundId?: string | null;
  codUpiId?: string | null;
  codPayoutReference?: string | null;
  codPaidAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    fullName: string;
    phone: string;
    totalAmount: number;
    status: string;
    paymentGateway?: string;
    transactionId?: string;
    deliveredAt?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const AdminOrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status update dialog for Orders
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [saving, setSaving] = useState(false);

  // Returns State
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnStatusFilter, setReturnStatusFilter] = useState('ALL');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Return Action Modals
  const [actionModalType, setActionModalType] = useState<
    'REJECT' | 'PICKUP' | 'INSPECT' | 'COD_PAYOUT' | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pickupCourier, setPickupCourier] = useState('BlueDart Express');
  const [pickupAwb, setPickupAwb] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [inspectResult, setInspectResult] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectRestoreStock, setInspectRestoreStock] = useState(true);
  const [codPayoutRef, setCodPayoutRef] = useState('');
  const [codPayoutAmt, setCodPayoutAmt] = useState<number>(0);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await apiRequest<any>('/api/orders/all');
      setOrders(Array.isArray(data) ? data : data?.data || data?.orders || data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoadingReturns(true);
      const data = await apiRequest<any>('/api/returns/admin/all');
      setReturns(Array.isArray(data) ? data : data?.items || data?.data || []);
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setLoadingReturns(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchReturns();
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

  // Return Actions
  const handleApproveReturn = async (returnId: string) => {
    if (!window.confirm('Approve this customer return request?')) return;
    try {
      await apiRequest(`/api/returns/admin/${returnId}/review`, 'POST', {
        action: 'APPROVE',
      });
      fetchReturns();
      if (selectedReturn?.id === returnId) setSelectedReturn(null);
    } catch (err: any) {
      alert(err.message || 'Failed to approve return');
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    try {
      setSubmittingAction(true);
      if (actionModalType === 'REJECT') {
        if (!rejectionReason.trim()) {
          alert('Please provide a rejection reason');
          return;
        }
        await apiRequest(`/api/returns/admin/${selectedReturn.id}/review`, 'POST', {
          action: 'REJECT',
          rejectionReason: rejectionReason.trim(),
        });
      } else if (actionModalType === 'PICKUP') {
        if (!pickupAwb.trim()) {
          alert('Please enter the reverse AWB tracking number');
          return;
        }
        await apiRequest(`/api/returns/admin/${selectedReturn.id}/pickup`, 'POST', {
          courier: pickupCourier,
          awb: pickupAwb.trim(),
          scheduledAt: pickupDate || undefined,
        });
      } else if (actionModalType === 'INSPECT') {
        if (!inspectNotes.trim()) {
          alert('Please provide quality inspection notes');
          return;
        }
        await apiRequest(`/api/returns/admin/${selectedReturn.id}/inspect`, 'POST', {
          result: inspectResult,
          notes: inspectNotes.trim(),
          restoreStock: inspectRestoreStock,
        });
      } else if (actionModalType === 'COD_PAYOUT') {
        if (!codPayoutRef.trim()) {
          alert('Please enter bank / UPI payout reference (UTR number)');
          return;
        }
        await apiRequest(`/api/returns/admin/${selectedReturn.id}/cod-payout`, 'POST', {
          amount: codPayoutAmt || selectedReturn.refundAmount || selectedReturn.order?.totalAmount || 0,
          payoutReference: codPayoutRef.trim(),
        });
      }

      setActionModalType(null);
      setSelectedReturn(null);
      fetchReturns();
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUpdateReturnStatusDirect = async (
    returnId: string,
    endpoint: string,
    body: any,
    confirmMsg?: string
  ) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await apiRequest(`/api/returns/admin/${returnId}/${endpoint}`, 'POST', body);
      fetchReturns();
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'refund_pending') {
      matchesStatus = o.refundStatus === 'PENDING';
    } else if (statusFilter === 'refund_processing') {
      matchesStatus = o.refundStatus === 'PROCESSING';
    } else if (statusFilter === 'refund_processed') {
      matchesStatus = o.refundStatus === 'PROCESSED';
    } else if (statusFilter === 'refund_failed') {
      matchesStatus = o.refundStatus === 'FAILED';
    } else {
      matchesStatus = o.status === statusFilter;
    }

    const matchesSearch =
      String(o.id).includes(search) ||
      o.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (o.refundId && o.refundId.toLowerCase().includes(search.toLowerCase())) ||
      (o.cancellationReason && o.cancellationReason.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const filteredReturns = returns.filter((r) => {
    const matchesStatus = returnStatusFilter === 'ALL' || r.status === returnStatusFilter;
    const matchesSearch =
      String(r.id).includes(search) ||
      String(r.orderId).includes(search) ||
      (r.user?.name && r.user.name.toLowerCase().includes(search.toLowerCase())) ||
      (r.user?.email && r.user.email.toLowerCase().includes(search.toLowerCase())) ||
      (r.reversePickupAwb && r.reversePickupAwb.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header with Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Orders & Returns Hub</h1>
          <p className="text-stone-600 text-sm mt-0.5">
            Manage shipments, reverse pickups, quality inspections, and Razorpay refunds.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>All Orders ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'returns'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <span>Return Requests ({returns.length})</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: ALL ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID, customer, refund ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B8F3C]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-stone-500 uppercase">Filter Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#0B8F3C]"
              >
                <option value="all">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Packed">Packed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Returned">Returned</option>
                <option value="Refunded">Refunded</option>
                <option value="refund_pending">Refund: Pending</option>
                <option value="refund_processing">Refund: Processing</option>
                <option value="refund_processed">Refund: Completed</option>
                <option value="refund_failed">Refund: Failed</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {loadingOrders ? (
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
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.paymentStatus === 'Refunded'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : order.status === 'Returned'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          {order.trackingNumber ? (
                            <span className="text-stone-700">
                              {order.courierName}: {order.trackingNumber}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">Not Dispatched</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                            title="View Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenStatusModal(order)}
                            className="px-2.5 py-1 text-xs font-medium bg-[#0B8F3C] text-white rounded-lg hover:bg-[#097330] transition"
                          >
                            Update
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
      )}

      {/* SECTION 2: RETURN REQUESTS TAB */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          {/* Returns Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Return ID, Order ID, AWB..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-stone-500 uppercase">Return Status:</label>
              <select
                value={returnStatusFilter}
                onChange={(e) => setReturnStatusFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Return Stages</option>
                <option value="REQUESTED">1. Requested (Needs Review)</option>
                <option value="APPROVED">2. Approved (Pending Reverse Pickup)</option>
                <option value="PICKUP_SCHEDULED">3. Pickup Scheduled</option>
                <option value="PICKED_UP">4. In Transit to Warehouse</option>
                <option value="RECEIVED_AT_WAREHOUSE">5. Received at Warehouse</option>
                <option value="INSPECTION_PASSED">6. Inspection Passed (Pending Refund)</option>
                <option value="INSPECTION_FAILED">Inspection Failed</option>
                <option value="REFUNDED">Completed & Refunded</option>
                <option value="REJECTED">Declined / Rejected</option>
              </select>
            </div>
          </div>

          {/* Returns Cards Grid / Table */}
          <div className="space-y-4">
            {loadingReturns ? (
              <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
                Loading return requests...
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
                No return requests match filter criteria.
              </div>
            ) : (
              filteredReturns.map((ret) => (
                <div
                  key={ret.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 hover:border-stone-300 transition"
                >
                  {/* Top Bar: Return Meta & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800">
                        Return #{ret.id}
                      </span>
                      <span className="text-xs text-stone-500">
                        Order #{ret.orderId} • {new Date(ret.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          ret.status === 'REQUESTED'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : ret.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : ret.status === 'PICKUP_SCHEDULED'
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : ret.status === 'RECEIVED_AT_WAREHOUSE'
                            ? 'bg-teal-100 text-teal-900 border border-teal-300'
                            : ret.status === 'INSPECTION_PASSED'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : ret.status === 'REFUNDED'
                            ? 'bg-green-100 text-green-900 border border-green-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {ret.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Middle Content: Returned Items, Customer Note, Images */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Column 1: Items */}
                    <div>
                      <span className="font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                        Items for Return
                      </span>
                      <div className="space-y-1.5">
                        {ret.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50">
                            <span className="font-semibold text-stone-800 truncate mr-2">{it.name}</span>
                            <span className="font-mono text-stone-600 shrink-0">
                              Qty: {it.quantity} (₹{it.price * it.quantity})
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-stone-700 font-semibold">
                        Refund Target: ₹{ret.refundAmount || ret.order?.totalAmount || 0} (
                        {ret.refundType === 'COD_MANUAL' ? 'COD Manual UPI' : 'Razorpay Gateway'})
                      </div>
                    </div>

                    {/* Column 2: Reason & Description */}
                    <div>
                      <span className="font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                        Reason & Evidence
                      </span>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1">
                        <div className="font-semibold text-stone-900">Reason: {ret.reason}</div>
                        <p className="text-stone-600 italic">"{ret.description || 'No description provided'}"</p>
                      </div>

                      {/* Photo Thumbnails */}
                      {ret.images && ret.images.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ret.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Damage Proof"
                              onClick={() => setPreviewImage(img)}
                              className="w-12 h-12 object-cover rounded-lg border border-stone-300 cursor-pointer hover:opacity-80 transition"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Column 3: Logistics & Inspection Details */}
                    <div>
                      <span className="font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                        Logistics & Inspection
                      </span>
                      <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1 text-stone-700">
                        {ret.reverseCourier && (
                          <p>
                            <strong>Courier:</strong> {ret.reverseCourier}
                          </p>
                        )}
                        {ret.reversePickupAwb && (
                          <p>
                            <strong>Reverse AWB:</strong> <span className="font-mono">{ret.reversePickupAwb}</span>
                          </p>
                        )}
                        {ret.inspectionNotes && (
                          <p>
                            <strong>Inspection:</strong> {ret.inspectionResult} • {ret.inspectionNotes}
                          </p>
                        )}
                        {ret.codPayoutReference && (
                          <p>
                            <strong>UPI / UTR Ref:</strong> <span className="font-mono">{ret.codPayoutReference}</span>
                          </p>
                        )}
                        {ret.rejectionReason && (
                          <p className="text-rose-700">
                            <strong>Declined:</strong> {ret.rejectionReason}
                          </p>
                        )}
                        {ret.codUpiId && (
                          <p className="text-amber-800">
                            <strong>Customer UPI:</strong> {ret.codUpiId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 flex-wrap">
                    {ret.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedReturn(ret);
                            setRejectionReason('');
                            setActionModalType('REJECT');
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Decline Return</span>
                        </button>
                        <button
                          onClick={() => handleApproveReturn(ret.id)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Return</span>
                        </button>
                      </>
                    )}

                    {ret.status === 'APPROVED' && (
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setPickupAwb(`HR-REV-${Date.now().toString().slice(-6)}`);
                          setActionModalType('PICKUP');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Schedule Reverse Pickup</span>
                      </button>
                    )}

                    {ret.status === 'PICKUP_SCHEDULED' && (
                      <>
                        <button
                          onClick={() =>
                            handleUpdateReturnStatusDirect(
                              ret.id,
                              'pickup-status',
                              { status: 'PICKED_UP' },
                              'Mark package as picked up by courier?'
                            )
                          }
                          className="px-3.5 py-1.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition"
                        >
                          Mark Picked Up
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateReturnStatusDirect(
                              ret.id,
                              'receive',
                              { notes: 'Received in good packaging' },
                              'Mark package received at warehouse?'
                            )
                          }
                          className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Record Warehouse Receipt</span>
                        </button>
                      </>
                    )}

                    {ret.status === 'PICKED_UP' && (
                      <button
                        onClick={() =>
                          handleUpdateReturnStatusDirect(
                            ret.id,
                            'receive',
                            { notes: 'Arrived at hub' },
                            'Mark package received at warehouse?'
                          )
                        }
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Record Warehouse Receipt</span>
                      </button>
                    )}

                    {ret.status === 'RECEIVED_AT_WAREHOUSE' && (
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setInspectResult('PASSED');
                          setInspectNotes('Original packaging verified, seals intact.');
                          setInspectRestoreStock(true);
                          setActionModalType('INSPECT');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Perform Quality Inspection</span>
                      </button>
                    )}

                    {ret.status === 'INSPECTION_PASSED' && ret.refundType === 'COD_MANUAL' && (
                      <button
                        onClick={() => {
                          setSelectedReturn(ret);
                          setCodPayoutAmt(ret.refundAmount || 0);
                          setCodPayoutRef('');
                          setActionModalType('COD_PAYOUT');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[#0B8F3C] hover:bg-[#097330] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Record COD UPI Payout</span>
                      </button>
                    )}

                    {ret.status === 'INSPECTION_PASSED' && ret.refundType === 'GATEWAY' && (
                      <button
                        onClick={() =>
                          handleUpdateReturnStatusDirect(
                            ret.id,
                            'retry-refund',
                            {},
                            'Retry automated Razorpay gateway refund?'
                          )
                        }
                        className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Razorpay Refund</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ACTION MODAL: REJECT / PICKUP / INSPECT / COD_PAYOUT */}
      {actionModalType && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
              <h3 className="font-bold text-stone-900 text-base">
                {actionModalType === 'REJECT' && 'Decline Return Request'}
                {actionModalType === 'PICKUP' && 'Schedule Reverse Pickup'}
                {actionModalType === 'INSPECT' && 'Quality Inspection'}
                {actionModalType === 'COD_PAYOUT' && 'Record COD Manual Payout'}
              </h3>
              <button onClick={() => setActionModalType(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs text-stone-700">
              {actionModalType === 'REJECT' && (
                <div>
                  <label className="block font-semibold uppercase text-stone-600 mb-1">
                    Reason for Rejection
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Products reported damaged show physical user tamper, or request was submitted outside terms..."
                    rows={4}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-500 text-xs"
                    required
                  />
                </div>
              )}

              {actionModalType === 'PICKUP' && (
                <>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">Courier Partner</label>
                    <select
                      value={pickupCourier}
                      onChange={(e) => setPickupCourier(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl"
                    >
                      <option value="BlueDart Express">BlueDart Express</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="DTDC Logistics">DTDC Logistics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">Reverse AWB Number</label>
                    <input
                      type="text"
                      value={pickupAwb}
                      onChange={(e) => setPickupAwb(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">Scheduled Pickup Date</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl"
                    />
                  </div>
                </>
              )}

              {actionModalType === 'INSPECT' && (
                <>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-2">Inspection Result</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="insp"
                          value="PASSED"
                          checked={inspectResult === 'PASSED'}
                          onChange={() => setInspectResult('PASSED')}
                          className="text-emerald-600"
                        />
                        <span className="font-bold text-emerald-800">Pass (Trigger Refund)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="insp"
                          value="FAILED"
                          checked={inspectResult === 'FAILED'}
                          onChange={() => setInspectResult('FAILED')}
                          className="text-rose-600"
                        />
                        <span className="font-bold text-rose-800">Fail (Deny Refund)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">Inspection Remarks</label>
                    <textarea
                      value={inspectNotes}
                      onChange={(e) => setInspectNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs"
                      required
                    />
                  </div>

                  {inspectResult === 'PASSED' && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={inspectRestoreStock}
                        onChange={(e) => setInspectRestoreStock(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Restock returned quantities in product inventory</span>
                    </label>
                  )}
                </>
              )}

              {actionModalType === 'COD_PAYOUT' && (
                <>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">
                      Customer UPI ID on File
                    </label>
                    <div className="p-2 bg-stone-100 rounded-xl font-mono text-stone-800">
                      {selectedReturn.codUpiId || 'Not provided by customer'}
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">Payout Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={codPayoutAmt}
                      onChange={(e) => setCodPayoutAmt(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase text-stone-600 mb-1">
                      Bank / UPI UTR Reference Number
                    </label>
                    <input
                      type="text"
                      value={codPayoutRef}
                      onChange={(e) => setCodPayoutRef(e.target.value)}
                      placeholder="e.g. 412589012345"
                      className="w-full p-2 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModalType(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {submittingAction ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-stone-900/60 hover:bg-stone-900 text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Enlarged evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-lg">Order #{selectedOrder.id}</h3>
                <p className="text-xs text-stone-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase block">Customer Details</span>
                  <p className="font-medium text-stone-900 mt-1">{selectedOrder.fullName}</p>
                  <p className="text-stone-600 text-xs">{selectedOrder.user?.email || 'Guest'}</p>
                  <p className="text-stone-600 text-xs">{selectedOrder.phone}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase block">Shipping Address</span>
                  <p className="text-stone-800 text-xs mt-1 leading-relaxed">
                    {selectedOrder.address1}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.postalCode}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-stone-900 mb-3">Order Items ({selectedOrder.items?.length || 0})</h4>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                  {selectedOrder.items?.map((it) => (
                    <div key={it.id} className="p-3 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={it.product?.image}
                          alt={it.product?.name}
                          className="w-10 h-10 object-cover rounded-lg border border-stone-200"
                        />
                        <div>
                          <p className="font-medium text-stone-900 text-xs">{it.product?.name}</p>
                          <p className="text-[11px] text-stone-400 font-mono">SKU: {it.product?.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-stone-900">₹{it.price * it.quantity}</p>
                        <p className="text-[11px] text-stone-500">
                          {it.quantity} × ₹{it.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER STATUS MODAL */}
      {isStatusModalOpen && updatingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900">Update Order #{updatingOrder.id}</h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 rounded-lg p-1 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0B8F3C]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Courier Partner Name
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0B8F3C]"
                  placeholder="e.g. BlueDart / Delhivery"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                  Tracking AWB Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#0B8F3C]"
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
                  className="px-6 py-2 bg-[#0B8F3C] text-white rounded-xl text-sm font-medium hover:bg-[#097330] transition"
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
