// Client-side notification helpers.
// Local notifications work standalone. Push (server-sent) requires a backend
// that stores PushSubscriptions and sends via Web Push (VAPID).

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

export async function showLocalNotification(title: string, body: string, url = "/") {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: url,
  });
}

// Subscribe to push (requires VAPID public key from your backend).
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!notificationsSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
