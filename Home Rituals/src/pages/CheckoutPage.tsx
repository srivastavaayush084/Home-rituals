import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, addresses, createAddress, setShipping, token } = useApp();
  
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statesOfIndia = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  // If not logged in, prompt user to sign in
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Set default selected address on load
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      setShowNewAddressForm(false);
    } else {
      setShowNewAddressForm(true);
    }
  }, [addresses]);

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createAddress({
        fullName,
        address1,
        address2: address2 || undefined,
        city,
        state,
        postalCode,
        country: 'India',
        landmark: landmark || undefined,
        phone,
      });
      
      // Reset form
      setFullName('');
      setAddress1('');
      setAddress2('');
      setCity('');
      setState('');
      setPostalCode('');
      setLandmark('');
      setPhone('');
      setShowNewAddressForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedAddressId) {
      setError('Please select or add a shipping address to proceed.');
      return;
    }
    const chosenAddress = addresses.find((a) => a.id === selectedAddressId);
    if (chosenAddress) {
      setShipping(chosenAddress);
      navigate('/payment');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold">Please Sign In to Checkout</h2>
        <p className="mt-2 text-[#6f6f6f]">You must have a Home Rituals account to complete your purchase.</p>
        <Link to="/login" className="mt-6 inline-flex items-center justify-center rounded-full bg-[#44D62C] text-white px-6 py-3 font-semibold">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>Shipping details</h1>
      <p className="mt-2 text-sm text-[#6f6f6f]">Select a shipping address or add a new one.</p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {/* Address Selection List */}
      {addresses.length > 0 && (
        <div className="mt-6 space-y-3">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                selectedAddressId === addr.id
                  ? 'border-[#44D62C] bg-[#fdfefc]'
                  : 'border-black/5 bg-white hover:border-black/10'
              }`}
            >
              <input
                type="radio"
                name="selectedAddress"
                checked={selectedAddressId === addr.id}
                onChange={() => setSelectedAddressId(addr.id)}
                className="mt-1 accent-[#44D62C]"
              />
              <div className="text-sm">
                <p className="font-semibold text-[#242424]">{addr.fullName} {addr.isDefault && <span className="ml-2 text-xs bg-[#44D62C]/10 text-[#0B8F3C] px-2 py-0.5 rounded-full">Default</span>}</p>
                <p className="mt-1 text-[#5f5f5f]">{addr.address1}, {addr.address2 && `${addr.address2}, `}{addr.city}, {addr.state} - {addr.postalCode}</p>
                {addr.landmark && <p className="text-[#888]">Landmark: {addr.landmark}</p>}
                <p className="mt-1 font-medium">Phone: {addr.phone}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Toggle Form Buttons */}
      <div className="mt-6 flex items-center gap-3">
        {addresses.length > 0 && (
          <button
            onClick={() => setShowNewAddressForm(!showNewAddressForm)}
            style={{ color: '#0B8F3C' }}
            className="text-sm font-semibold hover:underline"
          >
            {showNewAddressForm ? 'Cancel new address' : '+ Add a new address'}
          </button>
        )}
      </div>

      {/* New Address Form */}
      {showNewAddressForm && (
        <form onSubmit={handleAddNewAddress} className="mt-6 grid gap-4 border-t border-black/5 pt-6">
          <h3 className="text-lg font-semibold text-[#242424]">Add a new address</h3>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-md border border-black/10 px-4 py-3"
            required
          />
          <input
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            placeholder="Address line 1"
            className="w-full rounded-md border border-black/10 px-4 py-3"
            required
          />
          <input
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="Address line 2 (optional)"
            className="w-full rounded-md border border-black/10 px-4 py-3"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border border-black/10 px-4 py-3"
              required
            >
              <option value="">Select state</option>
              {statesOfIndia.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="rounded-md border border-black/10 px-4 py-3"
              required
            />
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal / ZIP code"
              className="rounded-md border border-black/10 px-4 py-3"
              required
            />
          </div>

          <input value="India" readOnly className="w-full rounded-md border border-black/10 px-4 py-3 bg-gray-50 text-gray-500" />
          <input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Landmark (optional)"
            className="w-full rounded-md border border-black/10 px-4 py-3"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-md border border-black/10 px-4 py-3"
            required
          />

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-[#44D62C] text-white px-6 py-3 font-semibold hover:bg-[#3ebe27] disabled:bg-gray-300"
            >
              {loading ? 'Adding Address...' : 'Add Address'}
            </button>
          </div>
        </form>
      )}

      {/* Next Step controls */}
      {!showNewAddressForm && addresses.length > 0 && (
        <div className="mt-8 pt-6 border-t border-black/5 flex items-center justify-between">
          <button
            onClick={handleProceedToPayment}
            className="inline-flex items-center justify-center rounded-full bg-[#44D62C] text-white px-6 py-3 font-semibold hover:bg-[#3ebe27]"
          >
            Save and continue to payment
          </button>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
