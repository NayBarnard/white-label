"use client";

import { useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let installPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyInstallChange() {
  listeners.forEach((listener) => listener());
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIPhoneSafari() {
  const userAgent = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(userAgent) &&
    /Safari/.test(userAgent) &&
    !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(userAgent)
  );
}

function getSnapshot() {
  if (typeof window === "undefined") return "server";
  return [
    isStandalone() ? "installed" : "not-installed",
    isIPhoneSafari() ? "ios-safari" : "other",
    installPrompt ? "prompt" : "no-prompt",
  ].join(":");
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(callback);
  const displayMode = window.matchMedia("(display-mode: standalone)");
  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    notifyInstallChange();
  };
  const onInstalled = () => {
    installPrompt = null;
    notifyInstallChange();
  };
  const onEnvironmentChange = notifyInstallChange;

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  displayMode.addEventListener("change", onEnvironmentChange);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    displayMode.removeEventListener("change", onEnvironmentChange);
  };
}

function getServerSnapshot() {
  return "server";
}

export function InstallAppControl({ showUnavailable = false }: { showUnavailable?: boolean } = {}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  async function promptInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    notifyInstallChange();
  }

  if (snapshot.startsWith("installed:")) {
    return null;
  }
  if (snapshot === "server" || (!snapshot.endsWith(":prompt") && !snapshot.includes("ios-safari"))) {
    if (!showUnavailable) return null;
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-white/65"
      >
        Install app
      </button>
    );
  }

  return (
    <div className="mt-5">
      {snapshot.endsWith(":prompt") ? (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="inline-flex min-h-10 items-center rounded-full border border-white/40 px-4 text-xs font-semibold text-white transition hover:border-white"
        >
          Install app
        </button>
      ) : (
        <p className="text-xs leading-5 text-white/85" aria-live="polite">
          Tap Share, then Add to Home Screen
        </p>
      )}
    </div>
  );
}
