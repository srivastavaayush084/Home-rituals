const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const token = localStorage.getItem('home-rituals-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!response.ok || !result.success) {
    const errorMsg = result.error?.message || (typeof result === 'string' ? result : response.statusText || 'An error occurred');
    throw new Error(errorMsg);
  }

  return result.data as T;
}
export async function apiUploadRequest<T>(
  endpoint: string,
  file: File,
  folder = 'products'
): Promise<T> {
  const token = localStorage.getItem('home-rituals-token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(text || `Upload failed with status ${response.status}`);
  }

  if (!response.ok || !result.success) {
    const errorMsg = result.error?.message || (typeof result === 'string' ? result : response.statusText || 'Upload failed');
    throw new Error(errorMsg);
  }

  return result.data as T;
}
