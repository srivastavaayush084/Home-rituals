import React, { useState } from 'react';
import { X, AlertCircle, RotateCcw, Upload, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';

export const RETURN_REASONS = [
  'Damaged / Defective',
  'Wrong Item Delivered',
  'Quality Not as Expected',
  'Missing Parts or Accessories',
  'Item Different from Description',
  'Other',
];

interface OrderItem {
  id: string | number;
  productId: string | number;
  quantity: number;
  price: number;
  product?: {
    id: string | number;
    name: string;
    image?: string;
  };
}

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    totalAmount: number;
    paymentStatus?: string;
    paymentGateway?: string;
    items?: OrderItem[];
  } | null;
  onSuccess: (returnRequest: any, message?: string) => void;
}

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  if (!isOpen || !order) return null;

  const isCod = (order.paymentGateway || '').toUpperCase() === 'COD';

  // Initialize selected items state: default to all items with full quantity
  const [selectedItems, setSelectedItems] = useState<{ [orderItemId: string]: { selected: boolean; quantity: number } }>(() => {
    const init: any = {};
    order.items?.forEach((it) => {
      init[String(it.id)] = { selected: true, quantity: it.quantity };
    });
    return init;
  });

  const [reason, setReason] = useState<string>('Damaged / Defective');
  const [description, setDescription] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [codUpiId, setCodUpiId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate estimated refund
  const estimatedRefund = (order.items || []).reduce((sum, item) => {
    const state = selectedItems[String(item.id)];
    if (state?.selected && state.quantity > 0) {
      return sum + item.price * state.quantity;
    }
    return sum;
  }, 0);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  };

  const handleQuantityChange = (itemId: string, maxQty: number, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId]?.quantity || 1;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: next,
        },
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      setErrorMessage(null);
      const formData = new FormData();
      formData.append('image', files[0]);

      // Use native fetch for multipart/form-data
      const token = localStorage.getItem('token');
      const res = await fetch('/api/returns/upload-image', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Image upload failed');

      const url = data.data?.url || data.imageUrl || data.url || data.path;
      if (url) {
        setImages((prev) => [...prev, url]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one item selected
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([_, val]) => val.selected && val.quantity > 0)
      .map(([orderItemId, val]) => ({
        orderItemId,
        quantity: val.quantity,
      }));

    if (itemsToReturn.length === 0) {
      setErrorMessage('Please select at least one item to return.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please provide a brief description of the issue (at least 5 characters).');
      return;
    }

    if (isCod && !codUpiId.trim()) {
      setErrorMessage('Please provide your UPI ID (e.g., name@upi) for the refund payout.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await apiRequest<any>('/api/returns', 'POST', {
        orderId: order.id,
        items: itemsToReturn,
        reason,
        description: description.trim(),
        images,
        codUpiId: isCod ? codUpiId.trim() : undefined,
      });

      const returnRequest = res?.data || res;
      onSuccess(
        returnRequest,
        'Return request submitted successfully. Our team will review your request and schedule reverse pickup.'
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit return request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white w-full max-w-xl rounded-[28px] shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-stone-900">Request Return</h2>
              <p className="text-xs text-stone-500">Order #{order.id} • 48-Hour Return Policy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm text-stone-700 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 48-Hour Guarantee Callout */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#0B8F3C] shrink-0 mt-0.5" />
            <div className="text-xs text-stone-700 leading-relaxed">
              <span className="font-semibold text-emerald-900">48-Hour Hassle-Free Returns: </span>
              Items must be unadulterated with original packaging. Once approved, reverse pickup will be scheduled.
            </div>
          </div>

          {/* Items to Return */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Select Products to Return
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {order.items?.map((item) => {
                const isSelected = selectedItems[String(item.id)]?.selected ?? true;
                const currentQty = selectedItems[String(item.id)]?.quantity ?? item.quantity;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isSelected
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-stone-200 bg-stone-50/60 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(String(item.id))}
                        className="w-4 h-4 rounded text-[#0B8F3C] focus:ring-[#0B8F3C] border-stone-300"
                      />
                      {item.product?.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-stone-200 bg-white"
                        />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-stone-900">{item.product?.name || 'Home Rituals Product'}</div>
                        <div className="text-[11px] text-stone-500">₹{item.price} each</div>
                      </div>
                    </label>

                    {isSelected && item.quantity > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">Qty:</span>
                        <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(String(item.id), item.quantity, -1)}
                            className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-stone-900">{currentQty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(String(item.id), item.quantity, 1)}
                            className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Reason for Return
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B8F3C]"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Describe the Issue
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe why you are requesting a return (e.g., bottle leak during transit, damaged cap, wrong variant)..."
              rows={3}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B8F3C]"
            />
          </div>

          {/* Photo Upload / Evidence */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              Upload Photographs (Recommended for Damaged/Wrong Items)
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
              Attach photos of the outer packaging, product condition, or shipping label.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-300 group">
                  <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/40 flex flex-col items-center justify-center cursor-pointer transition text-stone-400 hover:text-emerald-700">
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-[#0B8F3C] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-1">Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* If COD: Request UPI ID */}
          {isCod && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                UPI ID for Refund Transfer (COD Order)
              </label>
              <input
                type="text"
                value={codUpiId}
                onChange={(e) => setCodUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank or 9876543210@upi"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-amber-800">
                Since this was Cash on Delivery, your refund will be transferred directly to this UPI ID once quality inspection passes.
              </p>
            </div>
          )}

          {/* Refund Estimate Banner */}
          <div className="p-3.5 bg-stone-100 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600">Estimated Refund Amount:</span>
            <span className="text-base font-bold text-stone-900">₹{estimatedRefund.toFixed(2)}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || estimatedRefund <= 0}
              className="px-6 py-2.5 rounded-xl bg-[#0B8F3C] hover:bg-[#097330] text-white font-bold transition text-xs shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Return Request</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
