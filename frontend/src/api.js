// Talks to the backend. The logged-in user's id is kept in localStorage.
export const getUserId = () => localStorage.getItem("userId");
export const setUserId = (id) => localStorage.setItem("userId", id);
export const clearUserId = () => localStorage.removeItem("userId");

async function request(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getUserId() && { "x-user-id": getUserId() }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  delete: (url) => request("DELETE", url),
};