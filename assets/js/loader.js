class LoaderManager {
  constructor(loaderSelector = "[data-app-loader]") {
    this.loader = null;
    this.loaderSelector = loaderSelector;
    this.isLoaderOn = false;
    this.activeRequests = 0;
    this.idleCallbackId = null;
    this.checkInterval = null;
    this.performanceObserver = null;
    this.lastActivityTime = Date.now();
    this.idleThreshold = 2000;
    this.trackedIframes = new WeakSet();
    this.iframeObserver = null;
    this.userIdleThreshold = 30 * 60 * 1000;
    this.userIdleCheckInterval = null;
    this.lastUserActivityTime = Date.now();
    this.isUserIdle = false;
  }
  init() {
    this.loader = document.querySelector(this.loaderSelector);
    if (!this.loader) {
      console.warn("⚠︎ Loader element not found:", this.loaderSelector);
      return;
    }
    if (document.readyState === "loading") {
      this.show();
    }
    this.setupPerformanceObserver();
    this.setupIframeTracking();
    this.setupIdleDetection();
    this.setupUserIdleDetection();
    this.setupLoadListeners();
  }
  setupPerformanceObserver() {
    if (!window.PerformanceObserver) {
      console.warn("⚠︎ PerformanceObserver not supported");
      return;
    }
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "resource") {
            this.handleResourceTiming(entry);
          }
          if (entry.entryType === "navigation") {
            this.handleNavigationTiming(entry);
          }
        });
      });
      this.performanceObserver.observe({
        entryTypes: ["resource", "navigation"],
      });
    } catch (error) {
      console.error("❌ Error setting up PerformanceObserver:", error);
    }
  }
  handleResourceTiming(entry) {
    const isLoading = entry.responseEnd === 0 || entry.responseEnd - entry.fetchStart > 0;
    if (isLoading) {
      this.updateActivity();
    }
    const duration = entry.responseEnd - entry.fetchStart;
    if (duration > 1000) {
    }
  }
  handleNavigationTiming(entry) {
    if (entry.loadEventEnd > 0) {
      this.checkIdleState();
    }
  }
  setupIframeTracking() {
    const existingIframes = document.querySelectorAll("iframe");
    existingIframes.forEach((iframe) => this.trackIframe(iframe));
    this.iframeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === "IFRAME") {
            this.trackIframe(node);
          }
          if (node.querySelectorAll) {
            const iframes = node.querySelectorAll("iframe");
            iframes.forEach((iframe) => this.trackIframe(iframe));
          }
        });
      });
    });
    this.iframeObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  trackIframe(iframe) {
    if (this.trackedIframes.has(iframe)) {
      return;
    }
    if (!iframe.src || iframe.src === "about:blank" || iframe.src === "") {
      return;
    }
    this.trackedIframes.add(iframe);
    this.increment();
    let loadHandled = false;
    const handleLoad = () => {
      if (loadHandled) return;
      loadHandled = true;
      this.decrement();
    };
    const handleError = () => {
      if (loadHandled) return;
      loadHandled = true;
      console.error(`❌ Iframe failed: ${iframe.src}`);
      this.decrement();
    };
    iframe.addEventListener("load", handleLoad, { once: true });
    iframe.addEventListener("error", handleError, { once: true });
    const srcObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "src") {
          const newSrc = iframe.getAttribute("src");
          if (newSrc && newSrc !== "about:blank" && newSrc !== "") {
            loadHandled = false;
            this.increment();
          }
        }
      });
    });
    srcObserver.observe(iframe, { attributes: true, attributeFilter: ["src"] });
    setTimeout(() => {
      if (!loadHandled) {
        handleLoad();
      }
    }, 5000);
  }
  setupIdleDetection() {
    if ("requestIdleCallback" in window) {
      this.scheduleIdleCheck();
    } else {
      this.checkInterval = setInterval(() => {
        this.checkIdleState();
      }, 500);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
      } else {
        this.updateActivity();
      }
    });
  }
  scheduleIdleCheck() {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
    }
    this.idleCallbackId = requestIdleCallback(
      (deadline) => {
        const timeRemaining = deadline.timeRemaining();
        if (timeRemaining > 0) {
          this.checkIdleState();
        }
        this.scheduleIdleCheck();
      },
      { timeout: 1000 }
    );
  }
  setupLoadListeners() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.updateActivity();
      });
    }
    window.addEventListener("load", () => {
      this.checkIdleState();
    });
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }
  setupUserIdleDetection() {
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click", "contextmenu", "wheel"];
    const resetUserIdle = () => {
      const wasIdle = this.isUserIdle;
      this.lastUserActivityTime = Date.now();
      this.isUserIdle = false;
      if (wasIdle) {
        window.dispatchEvent(new CustomEvent("user:active"));
      }
    };
    activityEvents.forEach((event) => {
      document.addEventListener(event, resetUserIdle, {
        passive: true,
        capture: true,
      });
    });
    this.userIdleCheckInterval = setInterval(() => {
      this.checkUserIdleState();
    }, 30000);
    this.checkUserIdleState();
  }
  checkUserIdleState() {
    const idleTime = Date.now() - this.lastUserActivityTime;
    if (idleTime >= this.userIdleThreshold && !this.isUserIdle) {
      this.isUserIdle = true;
      const idleData = this.getIdleTimeInfo();
      window.dispatchEvent(
        new CustomEvent("user:idle", {
          detail: idleData,
        })
      );
    }
  }
  getIdleTimeInfo() {
    const idleTime = Date.now() - this.lastUserActivityTime;
    const seconds = Math.floor(idleTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    let formatted = "";
    if (days > 0) {
      formatted = `${days} day${days > 1 ? "s" : ""} ${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
      formatted = `${hours} hour${hours > 1 ? "s" : ""} ${minutes % 60} minute${minutes % 60 !== 1 ? "s" : ""}`;
    } else if (minutes > 0) {
      formatted = `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      formatted = `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
    return {
      milliseconds: idleTime,
      seconds,
      minutes,
      hours,
      days,
      formatted,
      timestamp: this.lastUserActivityTime,
    };
  }
  setUserIdleThreshold(ms) {
    this.userIdleThreshold = ms;
  }
  isUserCurrentlyIdle() {
    return this.isUserIdle;
  }
  getCurrentIdleTime() {
    if (!this.isUserIdle) {
      return null;
    }
    return this.getIdleTimeInfo();
  }
  updateActivity() {
    this.lastActivityTime = Date.now();
  }
  checkIdleState() {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const isIdle = timeSinceActivity > this.idleThreshold;
    const isPageLoaded = document.readyState === "complete";
    const hasPendingRequests = this.checkPendingRequests();
    if (isPageLoaded && isIdle && !hasPendingRequests && this.activeRequests === 0) {
      this.hide();
      window.dispatchEvent(new CustomEvent("app:idle"));
    }
  }
  checkPendingRequests() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return false;
    }
    const resources = performance.getEntriesByType("resource");
    const recentResources = resources.filter((entry) => {
      return entry.responseEnd === 0 || Date.now() - entry.responseEnd < 100;
    });
    return recentResources.length > 0;
  }
  show() {
    if (this.loader && !this.isLoaderOn) {
      this.loader.style.display = "flex";
      this.isLoaderOn = true;
      this.updateActivity();
    }
  }
  hide() {
    if (this.loader && this.isLoaderOn) {
      this.loader.style.display = "none";
      this.isLoaderOn = false;
    }
  }
  increment() {
    this.activeRequests++;
    this.updateActivity();
    this.show();
  }
  decrement() {
    this.activeRequests--;
    if (this.activeRequests < 0) {
      this.activeRequests = 0;
    }
    if (this.activeRequests === 0) {
      setTimeout(() => this.checkIdleState(), 100);
    }
  }
  getMetrics() {
    if (!window.performance) {
      return null;
    }
    const navigation = performance.getEntriesByType("navigation")[0];
    if (!navigation) {
      return {
        isIdle: Date.now() - this.lastActivityTime > this.idleThreshold,
        activeRequests: this.activeRequests,
        documentState: document.readyState,
        pageVisible: !document.hidden,
      };
    }
    return {
      pageLoadTime: navigation.loadEventEnd,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      domInteractive: navigation.domInteractive,
      domComplete: navigation.domComplete,
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnection: navigation.connectEnd - navigation.connectStart,
      tlsNegotiation: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
      requestTime: navigation.responseStart - navigation.requestStart,
      responseTime: navigation.responseEnd - navigation.responseStart,
      fetchTime: navigation.responseEnd - navigation.fetchStart,
      redirectTime: navigation.redirectEnd - navigation.redirectStart,
      isIdle: Date.now() - this.lastActivityTime > this.idleThreshold,
      activeRequests: this.activeRequests,
      documentState: document.readyState,
      pageVisible: !document.hidden,
      navigation: {
        type: navigation.type,
        redirectCount: navigation.redirectCount,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
      },
    };
  }
  reset() {
    this.activeRequests = 0;
    this.lastActivityTime = Date.now();
    this.hide();
  }
  cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    if (this.iframeObserver) {
      this.iframeObserver.disconnect();
      this.iframeObserver = null;
    }
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.userIdleCheckInterval) {
      clearInterval(this.userIdleCheckInterval);
      this.userIdleCheckInterval = null;
    }
    this.reset();
    this.loader = null;
  }
}
class APIClient {
  constructor(baseURL = "", loaderManager = null) {
    this.cachedData = new Map();
    this.pendingRequests = new Map();
    this.baseURL = baseURL || window.APP_BASEURL || "";
    this.loaderManager = loaderManager;
  }
  async loadJSON(url, header = null) {
    const fullURL = url.includes("http") ? url : `${this.baseURL}${url}`;
    if (this.cachedData.has(fullURL)) {
      return this.cachedData.get(fullURL);
    }
    if (this.pendingRequests.has(fullURL)) {
      return this.pendingRequests.get(fullURL);
    }
    if (this.loaderManager) {
      this.loaderManager.increment();
    }
    const markName = `fetch-start-${Date.now()}`;
    performance.mark(markName);
    const requestPromise = (async () => {
      try {
        const response = header ? await fetch(fullURL, header) : await fetch(fullURL);
        if (!response.ok) {
          throw new Error(`Failed to load ${fullURL}: ${response.status}`);
        }
        const data = await response.json();
        const endMarkName = `fetch-end-${Date.now()}`;
        performance.mark(endMarkName);
        try {
          performance.measure(`fetch-${fullURL}`, markName, endMarkName);
        } catch (e) {}
        this.cachedData.set(fullURL, data);
        return data;
      } catch (error) {
        console.error("❌ Error loading JSON:", error);
        throw error;
      } finally {
        this.pendingRequests.delete(fullURL);
        if (this.loaderManager) {
          this.loaderManager.decrement();
        }
      }
    })();
    this.pendingRequests.set(fullURL, requestPromise);
    return requestPromise;
  }
  async loadText(url, header = null) {
    const fullURL = url.includes("http") ? url : `${this.baseURL}${url}`;
    if (this.loaderManager) {
      this.loaderManager.increment();
    }
    try {
      const response = header ? await fetch(fullURL, header) : await fetch(fullURL);
      if (!response.ok) {
        throw new Error(`Failed to load ${fullURL}: ${response.status}`);
      }
      const text = await response.text();
      if (this.loaderManager) {
        this.loaderManager.decrement();
      }
      return text;
    } catch (error) {
      console.error("❌ Error loading text:", error);
      if (this.loaderManager) {
        this.loaderManager.decrement();
      }
      return null;
    }
  }
  async post(url, data, header = null) {
    const fullURL = url.includes("http") ? url : `${this.baseURL}${url}`;
    if (this.loaderManager) {
      this.loaderManager.increment();
    }
    try {
      const options = {
        method: "POST",
        headers: {
          ...(header || {}),
        },
        body: data,
      };
      if (!(data instanceof FormData)) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
      }
      const response = await fetch(fullURL, options);
      const result = await response.json();
      if (this.loaderManager) {
        this.loaderManager.decrement();
      }
      return result;
    } catch (error) {
      console.error("❌ Error posting data:", error);
      if (this.loaderManager) {
        this.loaderManager.decrement();
      }
      return {'error' : 'Response Error !!!'};
    }
  }
  clearCache(url = null) {
    if (url) {
      const fullURL = url.includes("http") ? url : `${this.baseURL}${url}`;
      this.cachedData.delete(fullURL);
    } else {
      this.cachedData.clear();
    }
  }
  cleanup() {
    this.cachedData.clear();
    this.pendingRequests.clear();
  }
}
class IdlePopupManager {
  constructor(options = {}) {
    this.popupId = options.popupId || "idle-popup";
    this.overlayId = options.overlayId || "idle-popup-overlay";
    this.messageSelector = options.messageSelector || "[data-idle-message]";
    this.closeButtonSelector = options.closeButtonSelector || "[data-idle-close]";
    this.autoCreatePopup = options.autoCreatePopup !== false;
    this.popup = null;
    this.overlay = null;
    this.messageElement = null;
    this.closeButton = null;
    this.isVisible = false;
    this.loaderManager = null;
  }
  init(loaderManager) {
    this.loaderManager = loaderManager;
    this.popup = document.getElementById(this.popupId);
    this.overlay = document.getElementById(this.overlayId);
    if (!this.popup && this.autoCreatePopup) {
      this.createPopup();
    }
    if (this.popup) {
      this.messageElement = this.popup.querySelector(this.messageSelector);
      this.closeButton = this.popup.querySelector(this.closeButtonSelector);
      if (this.closeButton) {
        this.closeButton.addEventListener("click", () => this.hide());
      }
      if (this.overlay) {
        this.overlay.addEventListener("click", (e) => {
          if (e.target === this.overlay) {
            this.hide();
          }
        });
      }
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isVisible) {
          this.hide();
        }
      });
    }
    window.addEventListener("user:idle", (e) => {
      this.handleUserIdle(e.detail);
    });
    window.addEventListener("user:active", () => {
      this.hide();
    });
  }
  createPopup() {
    this.overlay = document.createElement("div");
    this.overlay.id = this.overlayId;
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    `;
    this.popup = document.createElement("div");
    this.popup.id = this.popupId;
    this.popup.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
      animation: slideIn 0.3s ease-out;
    `;
    this.popup.innerHTML = `
      <style>
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>
      <div style="text-align: center;">
        <div style="font-size: 64px; margin-bottom: 16px;">😴</div>
        <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #333;">Still there?</h2>
        <p data-idle-message style="margin: 0 0 24px 0; font-size: 16px; color: #666; line-height: 1.5;">
          You've been idle for a while. Click continue to keep working.
        </p>
        <button data-idle-close style="
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 32px;
          font-size: 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
          Continue Working
        </button>
      </div>
    `;
    this.overlay.appendChild(this.popup);
    document.body.appendChild(this.overlay);
    this.messageElement = this.popup.querySelector(this.messageSelector);
    this.closeButton = this.popup.querySelector(this.closeButtonSelector);
  }
  handleUserIdle(idleData) {
    if (this.messageElement && idleData) {
      this.messageElement.textContent = `You've been idle for ${idleData.formatted}. Click continue to keep working.`;
    }
    this.show();
  }
  show() {
    if (!this.overlay || !this.popup) {
      console.warn("⚠︎ Idle popup elements not found");
      return;
    }
    this.overlay.style.display = "flex";
    this.isVisible = true;
    window.dispatchEvent(new CustomEvent("idle-popup:shown"));
  }
  hide() {
    if (!this.overlay) {
      return;
    }
    this.overlay.style.display = "none";
    this.isVisible = false;
    window.dispatchEvent(new CustomEvent("idle-popup:hidden"));
  }
  updateMessage(message) {
    if (this.messageElement) {
      this.messageElement.textContent = message;
    }
  }
  setIdleThreshold(minutes) {
    if (this.loaderManager) {
      this.loaderManager.setUserIdleThreshold(minutes * 60 * 1000);
    }
  }
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.popup = null;
    this.overlay = null;
    this.messageElement = null;
    this.closeButton = null;
    this.isVisible = false;
  }
}
function initLoader(loaderSelector = "[data-app-loader]") {
  if (window.App?.modules?.loader) {
    window.App.modules.loader.cleanup?.();
  }
  const loaderModule = new LoaderManager(loaderSelector);
  if (window.App?.modules?.apiClient) {
    window.App.modules.apiClient.cleanup?.();
  }
  const apiClient = new APIClient(window.APP_BASEURL || "", loaderModule);
  if (window.App?.modules?.idlePopup) {
    window.App.modules.idlePopup.destroy?.();
  }
  const idlePopupManager = new IdlePopupManager({
    autoCreatePopup: true,
  });
  window.App.register("loader", loaderModule);
  window.App.register("apiClient", apiClient, "initLoader");
  window.App.register("idlePopup", idlePopupManager);
  loaderModule.init();
  idlePopupManager.init(loaderModule);
  window.checkIdleState = () => loaderModule.getMetrics();
  window.checkUserIdle = () => ({
    isIdle: loaderModule.isUserCurrentlyIdle(),
    idleTime: loaderManager.getCurrentIdleTime(),
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoader);
} else {
  initLoader();
}
export { LoaderManager, APIClient, IdlePopupManager, initLoader };
