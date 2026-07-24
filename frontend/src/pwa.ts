/** Регистрация service worker для установки PWA на планшетах. */
export function registerPwa(): void {
  if (!("serviceWorker" in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/sw.js`, { scope: "/" })
      .catch((err) => {
        console.warn("[pwa] service worker registration failed", err);
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
