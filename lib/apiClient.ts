/**
 * Learn4Africa — API client.
 *
 * Thin fetch wrapper that injects the backend JWT from the NextAuth
 * session when one is available. Use this for all calls to the
 * FastAPI backend — never call fetch() directly from a page if the
 * route needs authentication.
 *
 * Usage (client component):
 *   const res = await apiFetch("/api/v1/users/me/progress");
 *
 * Usage with the session token (client):
 *   import { getSession } from "next-auth/react";
 *   const session = await getSession();
 *   const res = await apiFetch("/api/v1/...", { token: session?.backendToken });
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

type RequestInitWithToken = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  token?: string | null;
  json?: unknown;
};

/**
 * Low-level fetch helper. Adds the backend Bearer token if available
 * and serialises the `json` option into the request body.
 */
export async function apiFetch(path: string, init: RequestInitWithToken = {}) {
  const { token, json, headers = {}, ...rest } = init;

  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (json !== undefined) {
    mergedHeaders["Content-Type"] = "application/json";
    (rest as RequestInit).body = JSON.stringify(json);
  }

  // Token precedence: explicit > NextAuth client session.
  let bearer = token ?? null;
  if (!bearer && typeof window !== "undefined") {
    try {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      bearer = (session as any)?.backendToken ?? null;
    } catch {
      /* ignore — logged-out user */
    }
  }
  if (bearer) {
    mergedHeaders["Authorization"] = `Bearer ${bearer}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, { ...rest, headers: mergedHeaders });
  return res;
}

/**
 * Convenience — GET JSON and throw on non-2xx.
 */
export async function apiGet<T = unknown>(
  path: string,
  opts: RequestInitWithToken = {}
): Promise<T> {
  const res = await apiFetch(path, { ...opts, method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Convenience — POST JSON and throw on non-2xx.
 */
export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  opts: RequestInitWithToken = {}
): Promise<T> {
  const res = await apiFetch(path, { ...opts, method: "POST", json: body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Convenience — PATCH JSON and throw on non-2xx.
 */
export async function apiPatch<T = unknown>(
  path: string,
  body: unknown,
  opts: RequestInitWithToken = {}
): Promise<T> {
  const res = await apiFetch(path, { ...opts, method: "PATCH", json: body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}
