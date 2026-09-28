"use client";

import { useEffect, useState } from "react";

// Chrome/Samsung-only event, not in the DOM lib types.
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "install-banner-dismissed";

// Every iOS browser runs on WebKit and none can install a site
// programmatically - only the Share button placement differs.
const STEPS = {
  safari:
    "Tocca i tre puntini \"···\" in basso a destra, poi \"Condividi\", poi \"Visualizza altro\" e infine \"Aggiungi alla schermata Home\".",
  // Chrome on iOS: Share sits in the address bar instead of the ··· menu.
  chrome:
    "Tocca il pulsante Condividi (il quadrato con la freccia in su) nella barra dell'indirizzo in alto a destra, poi \"Visualizza altro\" e infine \"Aggiungi alla schermata Home\".",
  otherIos:
    "Apri il menu del browser, tocca Condividi, poi \"Aggiungi alla schermata Home\". Se non lo trovi, apri il sito in Safari.",
  android:
    "Apri il menu del browser (⋮ in alto a destra), poi \"Aggiungi a schermata Home\" o \"Installa app\".",
};

// Top-of-site "add to home screen" strip, mobile only. Android fires
// beforeinstallprompt, so tapping triggers the real install dialog; iOS has
// no install API at all, so tapping there can only explain the Share-menu
// steps. Hidden once running as the installed app, or after the X.
export function InstallBanner() {
  const [platform, setPlatform] = useState<keyof typeof STEPS | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac - touch support gives it away.
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) setPlatform(/CriOS/.test(ua) ? "chrome" : /FxiOS|EdgiOS|OPiOS/.test(ua) ? "otherIos" : "safari");
    else if (/Android/.test(ua)) setPlatform("android");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPlatform(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!platform) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setPlatform(null);
  };

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
    } else {
      setShowSteps((s) => !s);
    }
  };

  return (
    <div className="relative z-50 bg-accent text-paper-50 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" onClick={install} className="flex-1 text-left text-sm font-semibold">
          Installa l&apos;app sul telefono
          <span className="block text-xs font-normal opacity-90">
            Tocca qui per aggiungerla alla schermata Home
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Chiudi"
          className="h-9 w-9 shrink-0 rounded-md text-lg leading-none"
        >
          ✕
        </button>
      </div>
      {showSteps && (
        <p className="px-4 pb-3 text-xs">{STEPS[platform]}</p>
      )}
    </div>
  );
}
