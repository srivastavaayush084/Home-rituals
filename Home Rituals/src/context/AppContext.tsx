import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { products as staticProducts, type Product } from '../data/content';
import { apiRequest } from '../utils/apiClient';

interface CartItem {
  productId: number;
  quantity: number;
  product: Product;
}

interface UserPayload {
  id: string | number;
  email: string;
  name: string;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
}

interface Address {
  id: number;
  fullName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  phone: string;
  isDefault: boolean;
}

interface AppContextValue {
  // Auth state
  user: UserPayload | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;

  // Products state
  products: Product[];
  isLoadingProducts: boolean;

  // Cart & Wishlist state
  cart: CartItem[];
  wishlistIds: number[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => void;
  toastMessage: string | null;
  clearToast: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filteredProducts: Product[];
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
  
  // Address & Checkout state
  addresses: Address[];
  fetchAddresses: () => Promise<void>;
  createAddress: (addressData: Omit<Address, 'id' | 'isDefault'>) => Promise<void>;
  shipping: Record<string, any> | null;
  setShipping: (value: Record<string, any> | null) => void;
  clearShipping: () => void;

}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth State
  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('home-rituals-token'));

  // Products State
  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Cart & Wishlist State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  
  // UI states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shipping, setShipping] = useState<Record<string, any> | null>(null);

  // 1. Fetch products from API on mount
  useEffect(() => {
    async function fetchProducts() {
      setIsLoadingProducts(true);
      try {
        const data = await apiRequest<any>('/api/products?limit=50');
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data && Array.isArray(data.items)) {
          setProducts(data.items);
        } else if (data && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      } catch (err) {
        console.warn('Failed to load products from API, falling back to static content', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // 2. Fetch User Profile if token exists
  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;
      try {
        const data = await apiRequest<UserPayload>('/api/auth/me');
        setUser(data);
      } catch (err) {
        console.error('Invalid token, logging out', err);
        logout();
      }
    }
    fetchProfile();
  }, [token]);

  // 3. Sync Addresses, Cart and Wishlist on Auth changes
  useEffect(() => {
    if (user) {
      fetchAddresses();
      fetchCartFromServer();
      fetchWishlistFromServer();
    } else {
      // Load guest cart & wishlist from local storage
      setCart(readStoredCart());
      setWishlistIds(readStoredWishlist());
      setAddresses([]);
      setShipping(readStoredShipping());
    }
  }, [user]);

  // Read stored values for guest fallback
  function readStoredCart(): CartItem[] {
    try {
      const stored = localStorage.getItem('home-rituals-cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function readStoredWishlist(): number[] {
    try {
      const stored = localStorage.getItem('home-rituals-wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function readStoredShipping(): Record<string, any> | null {
    try {
      const stored = localStorage.getItem('home-rituals-shipping');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Server Fetch actions
  async function fetchCartFromServer() {
    try {
      const data = await apiRequest<any[]>('/api/cart');
      const formatted = data.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      }));
      setCart(formatted);
    } catch (err) {
      console.error('Failed to fetch cart from server', err);
    }
  }

  async function fetchWishlistFromServer() {
    try {
      const data = await apiRequest<any[]>('/api/wishlist');
      setWishlistIds(data.map(item => item.productId));
    } catch (err) {
      console.error('Failed to fetch wishlist from server', err);
    }
  }

  async function fetchAddresses() {
    try {
      const data = await apiRequest<any>('/api/addresses');
      const list = Array.isArray(data) ? data : (data?.data || []);
      setAddresses(list);
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    }
  }

  // Address creation
  async function createAddress(addressData: Omit<Address, 'id' | 'isDefault'>) {
    try {
      const res = await apiRequest<any>('/api/addresses', 'POST', addressData);
      await fetchAddresses();
      setToastMessage('Address added successfully');
      return res;
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to add address');
      throw err;
    }
  }

  // Local storage backup for guest cart changes
  useEffect(() => {
    if (!user) {
      localStorage.setItem('home-rituals-cart', JSON.stringify(cart));
    }
  }, [cart, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('home-rituals-wishlist', JSON.stringify(wishlistIds));
    }
  }, [wishlistIds, user]);

  useEffect(() => {
    if (shipping === null) {
      localStorage.removeItem('home-rituals-shipping');
    } else {
      localStorage.setItem('home-rituals-shipping', JSON.stringify(shipping));
    }
  }, [shipping]);

  const clearShipping = () => setShipping(null);

  // Authentication Flow
  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: UserPayload; token: string }>('/api/auth/login', 'POST', { email, password });
    localStorage.setItem('home-rituals-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setToastMessage('Signed in successfully');
    
    // Merge guest cart to server cart upon login
    const guestCart = readStoredCart();
    if (guestCart.length > 0) {
      for (const item of guestCart) {
        try {
          await apiRequest('/api/cart', 'POST', { productId: item.productId, quantity: item.quantity });
        } catch {}
      }
      localStorage.removeItem('home-rituals-cart');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiRequest<{ user: UserPayload; token: string }>('/api/auth/register', 'POST', { email, password, name });
    localStorage.setItem('home-rituals-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setToastMessage('Account registered successfully');
  };

  const logout = () => {
    localStorage.removeItem('home-rituals-token');
    setToken(null);
    setUser(null);
    setCart([]);
    setWishlistIds([]);
    setAddresses([]);
    setToastMessage('Signed out successfully');
  };

  const forgotPassword = async (email: string) => {
    await apiRequest('/api/auth/forgot-password', 'POST', { email });
  };

  const resetPassword = async (tkn: string, newPass: string) => {
    await apiRequest('/api/auth/reset-password', 'POST', { token: tkn, newPassword: newPass });
  };

  // Cart operations
  const addToCart = async (product: Product, quantity = 1) => {
    if (user) {
      try {
        await apiRequest('/api/cart', 'POST', { productId: product.id, quantity });
        await fetchCartFromServer();
      } catch (err: any) {
        setToastMessage(err.message || 'Failed to add to cart');
        return;
      }
    } else {
      setCart((current) => {
        const existing = current.find((item) => item.productId === product.id);
        if (existing) {
          return current.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...current, { productId: product.id, quantity, product }];
      });
    }

    setToastMessage(`${product.name} added to cart`);
    setIsCartOpen(true);
  };

  const removeFromCart = async (productId: number) => {
    if (user) {
      try {
        await apiRequest(`/api/cart/${productId}`, 'DELETE');
        await fetchCartFromServer();
      } catch (err) {
        console.error('Failed to remove from cart', err);
      }
    } else {
      setCart((current) => current.filter((item) => item.productId !== productId));
    }
  };

  const clearCart = async () => {
    if (user) {
      try {
        await apiRequest('/api/cart', 'DELETE');
        setCart([]);
      } catch (err) {
        console.error('Failed to clear cart', err);
      }
    } else {
      setCart([]);
    }
  };

  // Wishlist operations
  const toggleWishlist = async (productId: number) => {
    if (user) {
      try {
        await apiRequest('/api/wishlist/toggle', 'POST', { productId });
        await fetchWishlistFromServer();
        const wasAdded = !wishlistIds.includes(productId);
        setToastMessage(wasAdded ? 'Added to wishlist' : 'Removed from wishlist');
      } catch (err) {
        console.error('Failed to toggle wishlist', err);
      }
    } else {
      setWishlistIds((current) => {
        const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId];
        setToastMessage(current.includes(productId) ? 'Removed from wishlist' : 'Added to wishlist');
        return next;
      });
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return products.slice(0, 8);
    }
    return products.filter((product) =>
      [product.name, product.description, product.category, product.concern].join(' ').toLowerCase().includes(term)
    );
  }, [searchQuery, products]);

  const openQuickView = (product: Product) => setQuickViewProduct(product);
  const closeQuickView = () => setQuickViewProduct(null);

  const value = useMemo<AppContextValue>(() => ({
    user,
    token,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    products,
    isLoadingProducts,
    cart,
    wishlistIds,
    addToCart,
    removeFromCart,
    clearCart,
    toggleWishlist,
    toastMessage,
    clearToast: () => setToastMessage(null),
    isCartOpen,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    isWishlistOpen,
    openWishlist: () => setIsWishlistOpen(true),
    closeWishlist: () => setIsWishlistOpen(false),
    isSearchOpen,
    openSearch: () => setIsSearchOpen(true),
    closeSearch: () => setIsSearchOpen(false),
    searchQuery,
    setSearchQuery,
    filteredProducts,
    quickViewProduct,
    openQuickView,
    closeQuickView,
    addresses,
    fetchAddresses,
    createAddress,
    shipping,
    setShipping,
    clearShipping,
  }), [
    user, token, products, isLoadingProducts, cart, wishlistIds, isCartOpen,
    isWishlistOpen, isSearchOpen, searchQuery, filteredProducts, quickViewProduct,
    addresses, shipping
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
