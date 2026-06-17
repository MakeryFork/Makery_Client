import type { Paginated } from "./types";

export const BASE_URL = "/api/v1";

export const getToken = () => localStorage.getItem("makery_token");
export const setToken = (t: string) => localStorage.setItem("makery_token", t);
export const clearToken = () => localStorage.removeItem("makery_token");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!json.success) {
    throw new ApiError(res.status, json.message ?? "Unknown error");
  }

  const data = json.data;
  if (Array.isArray(data) && "total" in json) {
    return { items: data, total: json.total, page: json.page, limit: json.limit } as Paginated<unknown> as T;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

export async function uploadFile(file: File): Promise<{ url: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new ApiError(res.status, json.message ?? "Upload failed");
  return json.data as { url: string };
}
