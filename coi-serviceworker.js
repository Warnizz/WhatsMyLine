/* coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
// https://github.com/gzuidhof/coi-serviceworker
var reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
window.sessionStorage.removeItem("coiReloadedBySelf");
var coiConfig = Object.assign({
  shouldRegister: () => !reloadedBySelf,
  shouldDeregister: () => false,
  coepCredentialless: () => true,
  coepDegrade: () => true,
  doReload: () => window.location.reload(),
  quiet: false
}, window.coi);

if ("serviceWorker" in navigator) {
  if (coiConfig.shouldDeregister()) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (let registration of registrations) { registration.unregister(); }
    });
  } else if (coiConfig.shouldRegister()) {
    navigator.serviceWorker.register(document.currentScript.src).then(registration => {
      if (!coiConfig.quiet) console.log("coi-serviceworker: registered", registration.scope);
      registration.addEventListener("updatefound", () => {
        if (!coiConfig.quiet) console.log("coi-serviceworker: update found, reloading");
        window.sessionStorage.setItem("coiReloadedBySelf", "coi");
        coiConfig.doReload();
      });
      if (registration.active && !navigator.serviceWorker.controller) {
        if (!coiConfig.quiet) console.log("coi-serviceworker: reloading to activate");
        window.sessionStorage.setItem("coiReloadedBySelf", "coi");
        coiConfig.doReload();
      }
    }, err => {
      if (!coiConfig.quiet) console.error("coi-serviceworker: registration failed", err);
    });
  }
} else {
  if (!coiConfig.quiet) console.warn("coi-serviceworker: service workers not supported");
}

if (typeof window === "undefined") {
  // ---- SERVICE WORKER SCOPE ----
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

  async function handleFetch(request) {
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
    const url = new URL(request.url);
    const coepCredentialless = true;

    let response;
    try {
      if (coepCredentialless && request.mode === "no-cors") {
        request = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          mode: "cors",
          credentials: "omit",
          redirect: request.redirect
        });
      }
      response = await fetch(request);
    } catch(e) {
      return response;
    }

    if (response.status === 0) return response;

    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  self.addEventListener("fetch", e => e.respondWith(handleFetch(e.request)));
}
