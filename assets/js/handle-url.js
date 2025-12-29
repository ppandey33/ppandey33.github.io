import { Observable } from "./observable.js";
const handleURLEvent = new Observable();
class HandleUrl {
  constructor() {
    this.decodedParams = new Map();
  }
  decodeBase64Url(token) {
    try {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      );
      const preferences = JSON.parse(json);
      return new Map(Object.entries(preferences));
    } catch (error) {
      console.error("Failed to decode base64:", error);
      return new Map();
    }
  }
  isBase64Url(str) {
    return /^[A-Za-z0-9\-_]+$/.test(str) && str.length > 20;
  }
  init() {
    this.handleURLParams();
    window.addEventListener("hashchange", () => this.handleURLParams());
  }
  handleURLParams() {
    const payload = {};
    const { params, isHashURL, pathPart } = this.parseURL();
    if (!params) {
      return;
    } else if (params.has("b")) {
      const b64Token = params.get("b");
      if (this.isBase64Url(b64Token)) {
        this.decodedParams = this.decodeBase64Url(b64Token);
      }
    }
    let modified = false;
    if (this.decodedParams.has("t") || params.has("t")) {
      payload.theme = { key: "theme", newValue: (this.decodedParams || params).get("t"), oldValue: localStorage.getItem("theme") };
      modified = true;
    }
    if (this.decodedParams.has("s")) {
      payload.sysTheme = { key: "sysTheme", newValue: (this.decodedParams || params).get("s"), oldValue: localStorage.getItem("sysTheme") };
      modified = true;
    }
    if (this.decodedParams.has("l")) {
      payload.layout = { key: "layout", newValue: (this.decodedParams || params).get("l"), oldValue: localStorage.getItem("layout") };
      modified = true;
    }
    if (modified) {
      this.cleanURL(params, isHashURL, pathPart);
      handleURLEvent.next(payload);
    }
  }
  parseURL() {
    const hash = window.location.hash;
    if (hash && hash.includes("?")) {
      const [hashPath, queryString] = hash.split("?");
      return {
        params: new URLSearchParams(queryString),
        isHashURL: true,
        pathPart: hashPath,
      };
    }
    if (window.location.search) {
      return {
        params: new URLSearchParams(window.location.search),
        isHashURL: false,
        pathPart: window.location.pathname,
      };
    }
    return { params: null, isHashURL: false, pathPart: null };
  }
  cleanURL(params, isHashURL = false, pathPart = window.location.pathname) {
    const url = new URL(window.location.href);
    params.forEach((_value, key) => {
      url.searchParams.delete(key);
    });
    window.history.replaceState(null, "", url.pathname + url.hash);
  }
  cleanup() {
    if (this.hashChangeHandler) {
      window.removeEventListener("hashchange", this.hashChangeHandler);
      this.hashChangeHandler = null;
    }
    this.decodedParams = new Map();
  }
}
function initHandleUrl() {
  if (window.App?.modules?.handleUrl) {
    window.App.modules.handleUrl.cleanup?.();
  }
  const handledModule = new HandleUrl();
  window.App.register("handleUrl", handledModule, "initHandleUrl");
  handledModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHandleUrl);
} else {
  initHandleUrl();
}
export { HandleUrl, initHandleUrl, handleURLEvent };
