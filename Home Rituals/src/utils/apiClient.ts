let rawBaseUrl = import.meta.env.VITE_API_URL || '';
if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}
if (rawBaseUrl.endsWith('/api')) {
  rawBaseUrl = rawBaseUrl.slice(0, -4);
}
export const API_BASE_URL = rawBaseUrl;

// In-memory access token storage
let inMemoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    return localStorage.getItem('home-rituals-token');
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('home-rituals-token', token);
    } else {
      localStorage.removeItem('home-rituals-token');
    }
  } catch {
    // ignore local storage restrictions in private browsing if any
  }
}

// Concurrency lock for silent refresh
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Protection': '1',
        },
        credentials: 'include', // Transmits HttpOnly refresh cookie
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const data = await response.json();
      const newToken =
        data?.data?.token || data?.data?.accessToken || data?.token || data?.accessToken;
      if (newToken && typeof newToken === 'string') {
        setAccessToken(newToken);
        return newToken;
      } else {
        setAccessToken(null);
        return null;
      }
    } catch (_err) {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function getStandardHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Protection': '1',
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isRetry = false
): Promise<T> {
  const headers = getStandardHeaders(true);

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include', // Ensures HttpOnly cookies work seamlessly
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  // Automatic 401 handling with token renewal
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(endpoint, method, body, true);
    }
  }

  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.ok || !result.success) {
    const errorMsg =
      result.error?.message ||
      (typeof result === 'string' ? result : response.statusText || 'An error occurred');
    throw new Error(errorMsg);
  }

  return result.data as T;
}

export async function apiUploadRequest<T>(
  endpoint: string,
  file: File,
  folder = 'products',
  isRetry = false
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const headers = getStandardHeaders(false);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (response.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiUploadRequest<T>(endpoint, file, folder, true);
    }
  }

  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(text || `Upload failed with status ${response.status}`);
  }

  if (!response.ok || !result.success) {
    const errorMsg =
      result.error?.message ||
      (typeof result === 'string' ? result : response.statusText || 'Upload failed');
    throw new Error(errorMsg);
  }

  return result.data as T;
}

export async function uploadReturnPhoto(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const headers = getStandardHeaders(false);

  const response = await fetch(`${API_BASE_URL}/api/returns/upload-image`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${API_BASE_URL}/api/returns/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      const data = await retryRes.json();
      if (!retryRes.ok) throw new Error(data.message || 'Image upload failed');
      const url = data.data?.url || data.imageUrl || data.url || data.path;
      return { url };
    }
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Image upload failed');
  const url = data.data?.url || data.imageUrl || data.url || data.path;
  return { url };
}

export async function downloadInvoicePdf(orderId: string, customFilename?: string): Promise<void> {
  const headers = getStandardHeaders(false);

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Failed to download invoice';
    try {
      const json = await response.json();
      errorMsg = json.error?.message || json.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `HomeRituals-Invoice-${orderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function cancelOrderRequest(
  orderId: string,
  payload: { reason: string; comment?: string }
): Promise<any> {
  return await apiRequest(`/api/orders/${orderId}/cancel`, 'POST', payload);
}
