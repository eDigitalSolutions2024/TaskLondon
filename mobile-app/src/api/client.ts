import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Resolve API base URL: EXPO_PUBLIC_API_URL env var takes precedence, then
// app.json's expo.extra.apiUrl, falling back to localhost for local dev.
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
  if (extra.apiUrl) return extra.apiUrl;

  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

export const TOKEN_KEY = "londoncafe.token";
export const USER_KEY = "londoncafe.user";

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken !== null) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData = false, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    console.error(`[API Network Error] ${method} ${API_URL}${path}:`, netErr);
    throw new ApiError(0, `Error de conexión: No se pudo conectar con el servidor (${API_URL}). Verifica que tu celular y servidor estén en la misma red Wi-Fi.`, netErr);
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      (isJson && data && typeof data === "object" && "message" in data && (data as any).message) ||
      `Error ${response.status}: ${typeof data === "string" ? data : "Fallo en la solicitud"}`;
    console.error(`[API Error ${response.status}] ${method} ${path}:`, message, data);
    throw new ApiError(response.status, String(message), data);
  }

  return data as T;
}

export function toAbsoluteUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${API_URL}${pathOrUrl}`;
}
