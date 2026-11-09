export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/**
 * JSON fetch wrapper for /api/*. Throws ApiError with a code that maps to errors.<code>
 * in the translation files. When the API is missing (e.g. `npm run dev`, where Vite
 * answers /api with index.html) it throws code 'network'.
 */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (!(res.headers.get('content-type') || '').includes('application/json')) {
    throw new ApiError('network', res.status);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'generic', res.status);
  return data;
}

export function errorKey(err) {
  return `errors.${err?.code || 'generic'}`;
}
