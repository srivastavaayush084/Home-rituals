declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface CookieConsentPreferences {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_STORAGE_KEY = 'home-rituals-cookie-consent';

export function getStoredConsent(): CookieConsentPreferences | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConsent(preferences: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsentPreferences {
  const fullConsent: CookieConsentPreferences = {
    essential: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
  } catch (e) {
    console.warn('Unable to persist cookie consent to localStorage', e);
  }

  updateGtagConsent(fullConsent);
  return fullConsent;
}

export function updateGtagConsent(consent: { analytics: boolean; marketing: boolean }): void {
  if (typeof window === 'undefined') return;

  const analyticsState = consent.analytics ? 'granted' : 'denied';
  const marketingState = consent.marketing ? 'granted' : 'denied';

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: analyticsState,
      ad_storage: marketingState,
      ad_user_data: marketingState,
      ad_personalization: marketingState,
    });
  } else if (window.dataLayer) {
    window.dataLayer.push([
      'consent',
      'update',
      {
        analytics_storage: analyticsState,
        ad_storage: marketingState,
        ad_user_data: marketingState,
        ad_personalization: marketingState,
      },
    ]);
  }
}

// E-commerce Event Tracking with Google Analytics 4

function extractCategoryName(category?: any): string {
  if (!category) return 'Home Rituals';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category.name) return category.name;
  return 'Home Rituals';
}

export function trackViewItem(product: {
  id: string | number;
  name: string;
  price: number;
  category?: any;
}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', 'view_item', {
    currency: 'INR',
    value: Number(product.price) || 0,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_category: extractCategoryName(product.category),
        price: Number(product.price) || 0,
        quantity: 1,
      },
    ],
  });
}

export function trackAddToCart(
  product: { id: string | number; name: string; price: number; category?: any },
  quantity = 1
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: (Number(product.price) || 0) * quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_category: extractCategoryName(product.category),
        price: Number(product.price) || 0,
        quantity,
      },
    ],
  });
}

export function trackRemoveFromCart(
  product: { id: string | number; name: string; price: number },
  quantity = 1
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', 'remove_from_cart', {
    currency: 'INR',
    value: (Number(product.price) || 0) * quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        price: Number(product.price) || 0,
        quantity,
      },
    ],
  });
}

export function trackBeginCheckout(
  items: Array<{ id: string | number; name: string; price: number; quantity: number }>,
  totalValue: number
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', 'begin_checkout', {
    currency: 'INR',
    value: totalValue,
    items: items.map((item) => ({
      item_id: String(item.id),
      item_name: item.name,
      price: Number(item.price) || 0,
      quantity: item.quantity,
    })),
  });
}

export function trackPurchase(order: {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  items?: Array<any>;
}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const dedupeKey = `hr_ga_purchase_${order.id}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) {
      // Already tracked during this browsing session
      return;
    }
  } catch {
    // ignore sessionStorage restrictions
  }

  const items = (order.items || []).map((item) => ({
    item_id: String(item.productId || item.id),
    item_name: item.product?.name || item.name || 'Product',
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
  }));

  window.gtag('event', 'purchase', {
    transaction_id: order.orderNumber || order.id,
    value: Number(order.totalAmount) || 0,
    currency: 'INR',
    items,
  });

  try {
    sessionStorage.setItem(dedupeKey, '1');
  } catch {
    // ignore
  }
}
