// Registers the offline helper and shows an "Install app" button when the browser allows it.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

let deferred = null;
const btn = document.createElement("button");
btn.textContent = "⬇ Install app";
btn.hidden = true;
btn.style.cssText = "position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:40;" +
  "background:#0f6b2f;color:#fff;border:0;border-radius:99px;padding:12px 18px;font:700 .95rem system-ui,sans-serif;" +
  "box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer";
document.body.appendChild(btn);

addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; btn.hidden = false; });
btn.onclick = async () => {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null; btn.hidden = true;
};
addEventListener("appinstalled", () => { btn.hidden = true; });
