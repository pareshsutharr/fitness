import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
};

const detectSupport = () => {
  if (typeof window === "undefined") return "unsupported";
  const ua = window.navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  const hasApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIOS && !standalone) return "needs-install";
  if (!hasApis) return "unsupported";
  return "ready";
};

export default function usePush(userName) {
  const [support, setSupport] = useState("checking");
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastTest, setLastTest] = useState("");
  const subscriptionRef = useRef(null);
  const boundUserRef = useRef(null);

  useEffect(() => {
    const state = detectSupport();
    setSupport(state);
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    if (state !== "ready") return;
    let active = true;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!active) return;
        subscriptionRef.current = sub;
        setSubscribed(Boolean(sub));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Keep the device bound to whoever pressed "This is me".
  useEffect(() => {
    const sub = subscriptionRef.current;
    if (!subscribed || !sub || !userName) return;
    if (boundUserRef.current === userName) return;
    boundUserRef.current = userName;
    api.pushSubscribe(userName, sub.toJSON()).catch(() => {});
  }, [subscribed, userName]);

  const enable = useCallback(async () => {
    if (!userName) {
      setError("Pick who you are first.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setError("Notifications are blocked for this site. Allow them in your browser settings.");
        return false;
      }
      const { publicKey } = await api.pushKey();
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }
      await api.pushSubscribe(userName, sub.toJSON());
      subscriptionRef.current = sub;
      boundUserRef.current = userName;
      setSubscribed(true);
      return true;
    } catch (err) {
      setError(err.message || "Could not turn on reminders.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [userName]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const sub = subscriptionRef.current;
      if (sub) {
        await api.pushUnsubscribe(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      subscriptionRef.current = null;
      boundUserRef.current = null;
      setSubscribed(false);
    } catch (err) {
      setError(err.message || "Could not turn off reminders.");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setError("");
    setLastTest("");
    try {
      await api.pushTest(userName, subscriptionRef.current?.endpoint);
      setLastTest("Test sent. It should pop up on this device in a moment.");
    } catch (err) {
      setError(err.message || "Test failed.");
    } finally {
      setBusy(false);
    }
  }, [userName]);

  return { support, permission, subscribed, busy, error, lastTest, enable, disable, sendTest };
}
