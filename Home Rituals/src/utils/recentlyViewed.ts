import type { Product } from '../data/content';

const RECENTLY_VIEWED_KEY = 'home-rituals-recently-viewed';
const MAX_RECENT_ITEMS = 6;

export function getRecentlyViewed(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn('Failed to parse recently viewed items', err);
    return [];
  }
}

export function addRecentlyViewed(product: Product): void {
  if (typeof window === 'undefined' || !product || !product.id) return;
  try {
    const existing = getRecentlyViewed();
    // Remove if already in list to move to front
    const filtered = existing.filter((item) => String(item.id) !== String(product.id));
    const updated = [product, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save recently viewed product', err);
  }
}

