const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super('API request failed');
  }
}

/** Turn API validation / error payloads into a user-readable message. */
export function formatApiError(body: unknown, fallback = 'Something went wrong'): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as {
    message?: string;
    error?: {
      message?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };
  };

  const fieldErrors = b.error?.details?.fieldErrors;
  if (fieldErrors) {
    const labels: Record<string, string> = {
      title: 'Title',
      body: 'Details',
      company: 'Company',
      role: 'Role',
    };
    const parts = Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages.map((msg) => {
        const label = labels[field] ?? field;
        if (msg.includes('at least')) {
          const n = msg.match(/\d+/)?.[0];
          return n ? `${label} must be at least ${n} characters` : `${label}: ${msg}`;
        }
        return `${label}: ${msg}`;
      }),
    );
    if (parts.length) return parts.join('. ');
  }

  const formErrors = b.error?.details?.formErrors;
  if (formErrors?.length) return formErrors.join('. ');

  return b.error?.message ?? b.message ?? fallback;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setToken(token: string) {
  localStorage.setItem('accessToken', token);
}

export function clearToken() {
  localStorage.removeItem('accessToken');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const data = await refreshed.json();
      setToken(data.accessToken);
      headers.Authorization = `Bearer ${data.accessToken}`;
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
      if (!retry.ok) throw new ApiError(retry.status, await retry.json().catch(() => ({})));
      if (retry.status === 204) return undefined as T;
      return retry.json();
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => ({ message: res.statusText })));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_URL };
