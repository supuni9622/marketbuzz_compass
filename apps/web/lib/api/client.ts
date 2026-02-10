/**
 * API client: base URL + Bearer token from auth.
 * All GET /metrics/kpis, /brief, /merchants/lifecycle require Authorization.
 */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return "http://localhost:3001";
}

export interface ApiClientOptions {
  getToken: () => string | null;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = getBaseUrl();

  async function request<T>(
    path: string,
    init?: RequestInit & { params?: Record<string, string> }
  ): Promise<T> {
    const token = options.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    const { params, ...rest } = init ?? {};
    let url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams(params);
      url += (url.includes("?") ? "&" : "?") + search.toString();
    }
    const res = await fetch(url, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...rest.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as Promise<T>;
  }

  return {
    get<T>(path: string, params?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: "GET", params });
    },
  };
}
