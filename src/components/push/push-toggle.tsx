"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/lib/push/actions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "working";

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// iOS only allows web push from an app added to the Home Screen.
function isIosBrowserTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (isIosBrowserTab()) return setState("ios-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState("unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      });
      const { ok } = await savePushSubscription(sub.toJSON());
      setState(ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading" || state === "unsupported") return null;

  const text: Record<Exclude<State, "loading" | "unsupported">, string> = {
    "ios-install": /CriOS/.test(typeof navigator === "undefined" ? "" : navigator.userAgent)
      ? "Su iPhone le notifiche funzionano solo dall'app: in Chrome tocca Condividi, poi \"Visualizza altro\" e \"Aggiungi alla schermata Home\", e aprila da lì."
      : "Su iPhone le notifiche funzionano solo dall'app: tocca \"···\" in basso a destra, poi \"Condividi\", \"Visualizza altro\" e \"Aggiungi alla schermata Home\", e aprila da lì.",
    denied: "Hai bloccato le notifiche. Riattivale dalle impostazioni del browser per questo sito.",
    off: "Promemoria il giorno prima, posti liberati e messaggi del barbiere.",
    on: "Notifiche attive su questo dispositivo.",
    working: "Un momento…",
  };

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "rounded-lg bg-ink-900 border border-paper-50/15 p-4"}`}>
      <div>
        <p className="font-semibold">Notifiche sul telefono</p>
        <p className="text-sm text-paper-50/60">{text[state]}</p>
      </div>
      {(state === "off" || state === "working") && (
        <button
          type="button"
          onClick={enable}
          disabled={state === "working"}
          className="h-12 rounded-md bg-accent text-paper-50 font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          Attiva notifiche
        </button>
      )}
      {state === "on" && (
        <button type="button" onClick={disable} className="h-11 text-sm text-paper-50/70 underline underline-offset-2 self-start">
          Disattiva su questo dispositivo
        </button>
      )}
    </div>
  );
}
