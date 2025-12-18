const defaultBaseUrl = "http://localhost:8000/api";
const baseUrl = process.env.REACT_APP_API_BASE_URL || defaultBaseUrl;

export async function apiFetch(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson ? payload?.message || "Request failed" : String(payload);
    throw new Error(message);
  }

  return payload;
}
