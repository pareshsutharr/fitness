const request = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
};

const enc = encodeURIComponent;

export const api = {
  users: () => request("/api/users"),
  saveEntry: (name, dateKey, data) =>
    request(`/api/users/${enc(name)}/entries/${dateKey}`, { method: "PUT", body: data }),
  deleteEntry: (name, dateKey) =>
    request(`/api/users/${enc(name)}/entries/${dateKey}`, { method: "DELETE" }),
  messages: () => request("/api/messages"),
  sendMessage: (user, text) => request("/api/messages", { method: "POST", body: { user, text } }),
  pushKey: () => request("/api/push/public-key"),
  pushSubscribe: (user, subscription) =>
    request("/api/push/subscribe", { method: "POST", body: { user, subscription } }),
  pushUnsubscribe: (endpoint) =>
    request("/api/push/unsubscribe", { method: "POST", body: { endpoint } }),
  pushTest: (user, endpoint) =>
    request("/api/push/test", { method: "POST", body: { user, endpoint } })
};
