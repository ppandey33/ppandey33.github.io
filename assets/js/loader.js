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
    this.idleThreshold = 2000; // 2 seconds of no activity = idle
    this.trackedIframes = new WeakSet();
    this.iframeObserver = null;
    
    // Separate idle tracking for user inactivity
    this.userIdleThreshold = 5 * 60 * 1000; // 5 minutes default
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

    // Show loader initially if page is still loading
    if (document.readyState === "loading") {
      this.show();
    }

    // Setup Performance Observer to track resource loading
    this.setupPerformanceObserver();

    // Setup iframe tracking
    this.setupIframeTracking();

    // Setup idle detection (for loader timing)
    this.setupIdleDetection();

    // Setup user idle detection (for inactivity popup)
    this.setupUserIdleDetection();

    // Listen for page load completion
    this.setupLoadListeners();
  }

  setupPerformanceObserver() {
    if (!window.PerformanceObserver) {
      console.warn("⚠︎ PerformanceObserver not supported");
      return;
    }

    try {
      // Observe resource timing for fetch, XHR, scripts, styles, images
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          // Track when resources start and finish loading
          if (entry.entryType === "resource") {
            this.handleResourceTiming(entry);
          }
          
          // Track navigation timing
          if (entry.entryType === "navigation") {
            this.handleNavigationTiming(entry);
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ["resource", "navigation"] 
      });
    } catch (error) {
      console.error("❌ Error setting up PerformanceObserver:", error);
    }
  }

  handleResourceTiming(entry) {
    // Check if resource is still loading
    const isLoading = entry.responseEnd === 0 || 
                     (entry.responseEnd - entry.fetchStart) > 0;
    
    if (isLoading) {
      this.updateActivity();
    }

    // Log slow resources (>1s)
    const duration = entry.responseEnd - entry.fetchStart;
    if (duration > 1000) {
      console.log(`⏱ Slow resource: ${entry.name} (${duration.toFixed(0)}ms)`);
    }
  }

  handleNavigationTiming(entry) {
    // Navigation complete
    if (entry.loadEventEnd > 0) {
      console.log(`✓ Page fully loaded in ${entry.loadEventEnd.toFixed(0)}ms`);
      this.checkIdleState();
    }
  }

  setupIframeTracking() {
    // Track existing iframes
    const existingIframes = document.querySelectorAll("iframe");
    existingIframes.forEach((iframe) => this.trackIframe(iframe));

    // Observe for new iframes
    this.iframeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === "IFRAME") {
            this.trackIframe(node);
          }
          // Check children for iframes
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
    // Prevent tracking the same iframe multiple times
    if (this.trackedIframes.has(iframe)) {
      return;
    }

    // Don't track iframes without src or with about:blank
    if (!iframe.src || iframe.src === "about:blank" || iframe.src === "") {
      return;
    }

    this.trackedIframes.add(iframe);
    this.increment();

    console.log(`🖼 Tracking iframe: ${iframe.src}`);

    let loadHandled = false;

    // Handle iframe load
    const handleLoad = () => {
      if (loadHandled) return;
      loadHandled = true;
      console.log(`✓ Iframe loaded: ${iframe.src}`);
      this.decrement();
    };

    // Handle iframe error
    const handleError = () => {
      if (loadHandled) return;
      loadHandled = true;
      console.error(`❌ Iframe failed: ${iframe.src}`);
      this.decrement();
    };

    // Attach load and error listeners
    iframe.addEventListener("load", handleLoad, { once: true });
    iframe.addEventListener("error", handleError, { once: true });

    // Watch for src attribute changes
    const srcObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "src") {
          const newSrc = iframe.getAttribute("src");
          if (newSrc && newSrc !== "about:blank" && newSrc !== "") {
            console.log(`🖼 Iframe src changed: ${newSrc}`);
            loadHandled = false;
            this.increment();
          }
        }
      });
    });

    srcObserver.observe(iframe, { attributes: true, attributeFilter: ["src"] });

    // Fallback timeout for cross-origin iframes (5 seconds)
    setTimeout(() => {
      if (!loadHandled) {
        console.log(`⏱ Iframe timeout: ${iframe.src}`);
        handleLoad();
      }
    }, 5000);
  }

  setupIdleDetection() {
    // Use requestIdleCallback if available (better performance)
    if ("requestIdleCallback" in window) {
      this.scheduleIdleCheck();
    } else {
      // Fallback to checking periodically
      this.checkInterval = setInterval(() => {
        this.checkIdleState();
      }, 500);
    }

    // REMOVED: User activity tracking for loader
    // The loader should only care about network/resource activity,
    // not user mouse/keyboard events

    // Use Page Visibility API to detect if page is visible
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("📱 Page hidden");
      } else {
        console.log("📱 Page visible");
        this.updateActivity(); // Update on visibility change
      }
    });
  }

  scheduleIdleCheck() {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
    }

    this.idleCallbackId = requestIdleCallback(
      (deadline) => {
        // Check if browser is idle
        const timeRemaining = deadline.timeRemaining();
        
        if (timeRemaining > 0) {
          this.checkIdleState();
        }

        // Schedule next check
        this.scheduleIdleCheck();
      },
      { timeout: 1000 } // Force check every 1 second max
    );
  }

  setupLoadListeners() {
    // Listen for DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("✓ DOM Content Loaded");
        this.updateActivity();
      });
    }

    // Listen for full page load
    window.addEventListener("load", () => {
      console.log("✓ Window Load Complete");
      this.checkIdleState();
    });

    // Listen for all resources loaded (including async)
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  // User idle detection system (separate from loader)
  setupUserIdleDetection() {
    // Track user activity events
    const activityEvents = [
      "mousedown", "mousemove", "keypress", "scroll", 
      "touchstart", "click", "contextmenu", "wheel"
    ];

    const resetUserIdle = () => {
      const wasIdle = this.isUserIdle;
      this.lastUserActivityTime = Date.now();
      this.isUserIdle = false;

      // If user was idle and now became active
      if (wasIdle) {
        console.log("👤 User is now ACTIVE");
        window.dispatchEvent(new CustomEvent("user:active"));
      }
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, resetUserIdle, {
        passive: true,
        capture: true,
      });
    });

    // Check user idle state every 30 seconds
    this.userIdleCheckInterval = setInterval(() => {
      this.checkUserIdleState();
    }, 30000);

    // Initial check
    this.checkUserIdleState();
  }

  checkUserIdleState() {
    const idleTime = Date.now() - this.lastUserActivityTime;
    
    if (idleTime >= this.userIdleThreshold && !this.isUserIdle) {
      this.isUserIdle = true;
      const idleData = this.getIdleTimeInfo();
      
      console.log(`😴 User is IDLE for ${idleData.formatted}`);
      
      // Dispatch event with idle duration
      window.dispatchEvent(new CustomEvent("user:idle", {
        detail: idleData
      }));
    }
  }

  // Get human-readable idle time
  getIdleTimeInfo() {
    const idleTime = Date.now() - this.lastUserActivityTime;
    const seconds = Math.floor(idleTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let formatted = "";
    if (days > 0) {
      formatted = `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      formatted = `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      formatted = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      formatted = `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    return {
      milliseconds: idleTime,
      seconds,
      minutes,
      hours,
      days,
      formatted,
      timestamp: this.lastUserActivityTime
    };
  }

  // Set custom idle threshold (in milliseconds)
  setUserIdleThreshold(ms) {
    this.userIdleThreshold = ms;
    console.log(`⏱ User idle threshold set to ${ms}ms (${ms / 60000} minutes)`);
  }

  // Check if user is currently idle
  isUserCurrentlyIdle() {
    return this.isUserIdle;
  }

  // Get current idle duration
  getCurrentIdleTime() {
    if (!this.isUserIdle) {
      return null;
    }
    return this.getIdleTimeInfo();
  }

  // Update activity timestamp - only called by network/resource events
  updateActivity() {
    this.lastActivityTime = Date.now();
  }

  checkIdleState() {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const isIdle = timeSinceActivity > this.idleThreshold;

    // Check if page is fully loaded
    const isPageLoaded = document.readyState === "complete";

    // Check if there are pending network requests
    const hasPendingRequests = this.checkPendingRequests();

    // Hide loader when: page loaded + idle + no pending requests + no active requests
    if (isPageLoaded && isIdle && !hasPendingRequests && this.activeRequests === 0) {
      this.hide();
      console.log("🎯 Screen is IDLE - all activity complete");
      
      // Dispatch custom event for idle state
      window.dispatchEvent(new CustomEvent("app:idle"));
    }
  }

  checkPendingRequests() {
    // Use Performance API to check for ongoing requests
    if (!window.performance || !window.performance.getEntriesByType) {
      return false;
    }

    const resources = performance.getEntriesByType("resource");
    const recentResources = resources.filter((entry) => {
      return entry.responseEnd === 0 || // Still loading
             (Date.now() - entry.responseEnd < 100); // Completed very recently
    });

    return recentResources.length > 0;
  }

  show() {
    if (this.loader && !this.isLoaderOn) {
      this.loader.style.display = "flex";
      this.isLoaderOn = true;
      this.updateActivity();
      console.log("🔄 Loader shown");
    }
  }

  hide() {
    if (this.loader && this.isLoaderOn) {
      this.loader.style.display = "none";
      this.isLoaderOn = false;
      console.log("✓ Loader hidden");
    }
  }

  // Manual control for API requests
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
      // Wait a bit before checking idle state
      setTimeout(() => this.checkIdleState(), 100);
    }
  }

  // Get current performance metrics using modern API
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
      // Modern timing metrics
      pageLoadTime: navigation.loadEventEnd,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      domInteractive: navigation.domInteractive,
      domComplete: navigation.domComplete,
      
      // Request timing
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnection: navigation.connectEnd - navigation.connectStart,
      tlsNegotiation: navigation.secureConnectionStart > 0 
        ? navigation.connectEnd - navigation.secureConnectionStart 
        : 0,
      requestTime: navigation.responseStart - navigation.requestStart,
      responseTime: navigation.responseEnd - navigation.responseStart,
      
      // Total times
      fetchTime: navigation.responseEnd - navigation.fetchStart,
      redirectTime: navigation.redirectEnd - navigation.redirectStart,
      
      // App state
      isIdle: Date.now() - this.lastActivityTime > this.idleThreshold,
      activeRequests: this.activeRequests,
      documentState: document.readyState,
      pageVisible: !document.hidden,
      
      // Navigation info
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

// Enhanced APIClient with Performance integration
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

    // Mark request start for performance tracking
    const markName = `fetch-start-${Date.now()}`;
    performance.mark(markName);

    const requestPromise = (async () => {
      try {
        const response = header ? await fetch(fullURL, header) : await fetch(fullURL);

        if (!response.ok) {
          throw new Error(`Failed to load ${fullURL}: ${response.status}`);
        }

        const data = await response.json();

        // Mark request end
        const endMarkName = `fetch-end-${Date.now()}`;
        performance.mark(endMarkName);
        
        // Measure duration
        try {
          performance.measure(`fetch-${fullURL}`, markName, endMarkName);
        } catch (e) {
          // Mark might not exist, ignore
        }

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
          "Content-Type": "application/json",
          ...(header || {}),
        },
        body: JSON.stringify(data),
      };

      const response = await fetch(fullURL, options);

      if (!response.ok) {
        throw new Error(`POST failed ${fullURL}: ${response.status}`);
      }

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

      return null;
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

// Idle Popup Manager
class IdlePopupManager {
  constructor(options = {}) {
    this.popupId = options.popupId || "idle-popup";
    this.overlayId = options.overlayId || "idle-popup-overlay";
    this.messageSelector = options.messageSelector || "[data-idle-message]";
    this.closeButtonSelector = options.closeButtonSelector || "[data-idle-close]";
    this.autoCreatePopup = options.autoCreatePopup !== false; // default true
    
    this.popup = null;
    this.overlay = null;
    this.messageElement = null;
    this.closeButton = null;
    this.isVisible = false;
    
    this.loaderManager = null;
  }

  init(loaderManager) {
    this.loaderManager = loaderManager;

    // Try to find existing popup elements
    this.popup = document.getElementById(this.popupId);
    this.overlay = document.getElementById(this.overlayId);

    // If no popup exists and autoCreatePopup is true, create one
    if (!this.popup && this.autoCreatePopup) {
      this.createPopup();
    }

    if (this.popup) {
      this.messageElement = this.popup.querySelector(this.messageSelector);
      this.closeButton = this.popup.querySelector(this.closeButtonSelector);

      // Setup close button
      if (this.closeButton) {
        this.closeButton.addEventListener("click", () => this.hide());
      }

      // Close on overlay click
      if (this.overlay) {
        this.overlay.addEventListener("click", (e) => {
          if (e.target === this.overlay) {
            this.hide();
          }
        });
      }

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.isVisible) {
          this.hide();
        }
      });
    }

    // Listen for user idle events from LoaderManager
    window.addEventListener("user:idle", (e) => {
      this.handleUserIdle(e.detail);
    });

    // Listen for user active events
    window.addEventListener("user:active", () => {
      this.hide();
    });

    console.log("✓ IdlePopupManager initialized");
  }

  createPopup() {
    // Create overlay
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

    // Create popup
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

    // Create content
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

    // Update references
    this.messageElement = this.popup.querySelector(this.messageSelector);
    this.closeButton = this.popup.querySelector(this.closeButtonSelector);
  }

  handleUserIdle(idleData) {
    console.log("🔔 User idle detected:", idleData);
    
    // Update message with idle time
    if (this.messageElement && idleData) {
      this.messageElement.textContent = 
        `You've been idle for ${idleData.formatted}. Click continue to keep working.`;
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
    console.log("🔔 Idle popup shown");

    // Dispatch event
    window.dispatchEvent(new CustomEvent("idle-popup:shown"));
  }

  hide() {
    if (!this.overlay) {
      return;
    }

    this.overlay.style.display = "none";
    this.isVisible = false;
    console.log("✓ Idle popup hidden");

    // Dispatch event
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

// Initialize with performance tracking
function initLoader(loaderSelector = "[data-app-loader]") {
  if (window.App?.modules?.loader) {
    window.App.modules.loader.cleanup?.();
  }

  const loaderModule = new LoaderManager(loaderSelector);
  
  if (window.App?.modules?.apiClient) {
    window.App.modules.apiClient.cleanup?.();
  }

  const apiClient = new APIClient(window.APP_BASEURL || "", loaderModule);

  // Initialize idle popup manager
  if (window.App?.modules?.idlePopup) {
    window.App.modules.idlePopup.destroy?.();
  }

  const idlePopupManager = new IdlePopupManager({
    autoCreatePopup: true // Will auto-create popup if not found in DOM
  });

  window.App.register("loader", loaderModule);
  window.App.register("apiClient", apiClient, 'initLoader');
  window.App.register("idlePopup", idlePopupManager);

  loaderModule.init();
  idlePopupManager.init(loaderModule);

  // Expose idle state checker globally
  window.checkIdleState = () => loaderModule.getMetrics();
  window.checkUserIdle = () => ({
    isIdle: loaderModule.isUserCurrentlyIdle(),
    idleTime: loaderManager.getCurrentIdleTime()
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoader);
} else {
  initLoader();
}

export { LoaderManager, APIClient, IdlePopupManager, initLoader };
