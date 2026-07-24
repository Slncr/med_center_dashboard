/** Полноэкранный режим — убирает адресную строку на планшетах (Chrome/Android). */

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

export function isDisplayModeApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // iOS Safari «На экран Домой»
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isDocumentFullscreen(): boolean {
  const doc = document as FsDoc;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export function isImmersiveUi(): boolean {
  return isDisplayModeApp() || isDocumentFullscreen();
}

export async function enterAppFullscreen(target?: HTMLElement | null): Promise<boolean> {
  if (isImmersiveUi()) return true;
  const el = (target || document.documentElement) as FsEl;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn("[fullscreen]", err);
  }
  return false;
}

export function exitAppFullscreen(): void {
  const doc = document as FsDoc;
  if (!isDocumentFullscreen()) return;
  if (document.exitFullscreen) {
    void document.exitFullscreen();
  } else if (doc.webkitExitFullscreen) {
    void doc.webkitExitFullscreen();
  } else if (doc.msExitFullscreen) {
    void doc.msExitFullscreen();
  }
}

export function subscribeFullscreenChange(onChange: () => void): () => void {
  const events = ["fullscreenchange", "webkitfullscreenchange"] as const;
  events.forEach((ev) => document.addEventListener(ev, onChange));
  return () => events.forEach((ev) => document.removeEventListener(ev, onChange));
}
