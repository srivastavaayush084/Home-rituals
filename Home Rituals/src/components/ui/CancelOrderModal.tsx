import React, { useState } from 'react';
import { X, AlertCircle, AlertTriangle, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { cancelOrderRequest } from '../../utils/apiClient';

export const CANCELLATION_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Product no longer required',
  'Found a better price',
  'Delivery is taking too long',
  'Ordered the wrong product',
  'Other',
];

interface OrderItem {
  id: string | number;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    totalAmount: number;
    paymentStatus?: string;
    paymentGateway?: string;
    paymentMethod?: string;
    transactionId?: string;
    items?: OrderItem[];
    invoiceNumber?: string | null;
  } | null;
  onSuccess: (cancelledOrder: any, message?: string) => void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Changed my mind');
  const [customComment, setCustomComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isOnlinePaid =
    order.paymentStatus === 'Paid' ||
    Boolean(order.transactionId) ||
    (order.paymentGateway || order.paymentMethod || '').toLowerCase().includes('razorpay');

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setErrorMessage('Please select a cancellation reason.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await cancelOrderRequest(order.id, {
        reason: selectedReason,
        comment: customComment.trim() || undefined,
      });

      const updatedOrder = response?.data || response?.order || response;
      const successMessage =
        response?.message ||
        (isOnlinePaid
          ? `Order cancelled. Refund of ₹${order.totalAmount} has been initiated via Razorpay.`
          : 'Order cancelled successfully. No payment refund is required.');

      onSuccess(updatedOrder, successMessage);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          "We couldn't process the cancellation right now. Please try again or contact Home Rituals support."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 leading-snug">Cancel Order?</h3>
              <p className="text-xs text-stone-500 font-mono">
                Order #{order.id.slice(-8).toUpperCase()} {order.invoiceNumber ? `(${order.invoiceNumber})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleCancelSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Confirmation Prompt */}
          <p className="text-stone-600 text-sm leading-relaxed">
            Are you sure you want to cancel this order? Once cancelled, items cannot be reinstated and will be returned to stock.
          </p>

          {/* Order Summary Snapshot */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-200/60 pb-2">
              <span className="font-semibold uppercase tracking-wider">Order Summary</span>
              <span>{order.items?.length || 1} item(s)</span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {order.items?.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs text-stone-700">
                  <span className="truncate max-w-[260px] font-medium">
                    {it.product?.name || 'Home Care Product'}
                  </span>
                  <span className="font-mono text-stone-500 ml-2">
                    {it.quantity} × ₹{it.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-sm font-bold text-stone-900">
              <span>Total Order Value</span>
              <span className="text-[#0B8F3C]">₹{order.totalAmount}</span>
            </div>
          </div>

          {/* Refund Notice Banner */}
          {isOnlinePaid ? (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0B8F3C] shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-bold text-emerald-950 mb-0.5">Automated Razorpay Refund</p>
                <p>
                  A full refund of <strong>₹{order.totalAmount}</strong> will be initiated back to your original payment method via Razorpay. It typically reflects in your bank account or card within 5 to 7 business days.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-600 leading-relaxed">
              <strong>Cash on Delivery (COD):</strong> No online payment was charged for this order, so no refund is required.
            </div>
          )}

          {/* Cancellation Reason Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500 transition disabled:opacity-50"
            >
              {CANCELLATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Comment Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-600">
              {selectedReason === 'Other' ? 'Please tell us more *' : 'Additional Comments (Optional)'}
            </label>
            <textarea
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder={
                selectedReason === 'Other'
                  ? 'Please share why you wish to cancel this order...'
                  : 'Let us know how we can improve...'
              }
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-stone-400 transition disabled:opacity-50"
            />
            <div className="text-right text-[11px] text-stone-400">{customComment.length} / 500</div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Buttons Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold text-sm transition disabled:opacity-50 text-center"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isOnlinePaid ? 'Cancelling & initiating refund...' : 'Cancelling Order...'}</span>
                </>
              ) : (
                <>
                  <span>Cancel Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
