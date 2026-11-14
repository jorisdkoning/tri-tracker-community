"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestReminder,
  setReminderPrefs,
} from "./reminder-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

type Support = "checking" | "yes" | "no" | "ios-install";

export function RemindersCard({
  vapidKey,
  remindCheckIn,
  remindWeekly,
}: {
  vapidKey: string | null;
  remindCheckIn: boolean;
  remindWeekly: boolean;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ remindCheckIn, remindWeekly });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function detect(): Promise<[Support, PushSubscription | null]> {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return [isIos && !standalone ? "ios-install" : "no", null];
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        return ["yes", await reg.pushManager.getSubscription()];
      } catch {
        return ["no", null];
      }
    }
    detect().then(([result, sub]) => {
      if (cancelled) return;
      setSupport(result);
      setSubscription(sub);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!vapidKey) {
    return <p className="text-sm text-foreground/60">Reminders aren&apos;t switched on for this app yet.</p>;
  }
  if (support === "checking") return null;
  if (support === "ios-install") {
    return (
      <p className="text-sm text-foreground/70">
        On iPhone, first put FitLog on your home screen (Share → <b>Add to Home Screen</b>), open it from there and
        come back to this page.
      </p>
    );
  }
  if (support === "no") {
    return <p className="text-sm text-foreground/60">This browser can&apos;t show reminders. Try Chrome, Edge, Firefox or Safari.</p>;
  }

  function turnOn() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage("Notifications are blocked. Allow them for FitLog in your phone or browser settings.");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!),
        });
        const result = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
        if (!result.ok) throw new Error("save failed");
        setSubscription(sub);
        setMessage("Reminders are on for this device.");
      } catch {
        setMessage("Couldn't turn on reminders. Try again.");
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe().catch(() => {});
      }
      setSubscription(null);
      setMessage("Reminders are off for this device.");
    });
  }

  function toggle(key: "remindCheckIn" | "remindWeekly") {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    startTransition(() => setReminderPrefs(next));
  }

  function test() {
    startTransition(async () => {
      const { sent } = await sendTestReminder();
      setMessage(sent > 0 ? "Sent! It should pop up in a few seconds." : "Nothing was sent. Turn reminders off and on again.");
    });
  }

  return (
    <div className="space-y-3">
      {subscription ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.remindCheckIn} onChange={() => toggle("remindCheckIn")} />
            Daily check-in reminder (early evening, only if you haven&apos;t checked in)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.remindWeekly} onChange={() => toggle("remindWeekly")} />
            Weekly summary every Monday
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={test} disabled={pending} className="btn-secondary">
              Send a test
            </button>
            <button type="button" onClick={turnOff} disabled={pending} className="text-sm text-foreground/60 hover:underline">
              Turn off on this device
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={turnOn} disabled={pending} className="btn-primary">
          {pending ? "Turning on…" : "Turn on reminders"}
        </button>
      )}
      {message && <p className="text-sm text-foreground/70" role="status">{message}</p>}
    </div>
  );
}
