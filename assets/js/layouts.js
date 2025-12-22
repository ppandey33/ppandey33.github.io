import { handleURLEvent } from "./handle-url.js";
class Layouts {
  constructor() {
    this.layouts = [];
    this.currentLayout = localStorage.getItem("layout") || "nexa";
    this.layoutToggle = null;
    this.layoutDropdown = null;
    this.layoutList = null;
    this.toggleClickHandler = null;
    this.documentClickHandler = null;
    this.dropdownClickHandler = null;
    this.submenuPlaceholder = null;
    this.originalParent = null;
    this.resizeHandler = null;
    this.scrollHandler = null;
    this.subscription = null;
  }

  async init() {
    await this.loadLayouts();
    this.applyLayout(this.currentLayout);
    this.setupUI();
    window.addEventListener("storage", (event) => {
      this.handleLayoutChange(event);
    });
    this.subscription = handleURLEvent.subscribe((event) => {
      event.layout && this.handleLayoutChange(event.layout);
    });
  }

  handleLayoutChange(event) {
    if (event.key === "layout" && event.newValue && event.newValue !== this.currentLayout) {
      if (this.layouts.find((l) => l.id === event.newValue)) {
        this.reloadNextLayout(event.newValue);
      } else if (event.oldValue && this.layouts.find((l) => l.id === event.oldValue)) {
        this.applyLayout(event.oldValue);
      } else {
        this.loadLayouts();
        this.applyLayout(this.currentLayout);
        this.setupUI();
      }
    }
  }

  async loadLayouts() {
    if (this.layouts && this.layouts.length > 0) return;
    const data = await window.App.modules.apiClient.loadJSON("/data/layouts.json");
    if (data && data.layouts) {
      this.layouts = data.layouts;
    }
  }

  applyLayout(layoutId) {
    document.body.setAttribute("data-layout", layoutId);
    this.currentLayout = layoutId;
    localStorage.setItem("layout", layoutId);
    requestAnimationFrame(() => this.updateUI());
  }

  positionSubmenu() {
    if (!this.submenuPlaceholder || !this.layoutDropdown.classList.contains("show")) return;

    const triggerRect = this.layoutToggle.getBoundingClientRect();
    const dropdownRect = this.layoutDropdown.getBoundingClientRect();
    const triggerStyle = window.getComputedStyle(this.layoutToggle);
    const dropdownStyle = window.getComputedStyle(this.layoutDropdown);

    const triggerMargin = {
      top: parseFloat(triggerStyle.marginTop) || 0,
      right: parseFloat(triggerStyle.marginRight) || 0,
      bottom: parseFloat(triggerStyle.marginBottom) || 0,
      left: parseFloat(triggerStyle.marginLeft) || 0,
    };

    const dropdownMargin = {
      top: parseFloat(dropdownStyle.marginTop) || 0,
      right: parseFloat(dropdownStyle.marginRight) || 0,
      bottom: parseFloat(dropdownStyle.marginBottom) || 0,
      left: parseFloat(dropdownStyle.marginLeft) || 0,
    };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const viewportMargin = 16;
    if (this.layoutDropdown.parentElement !== this.submenuPlaceholder) {
      this.submenuPlaceholder.appendChild(this.layoutDropdown);
    }

    this.layoutDropdown.style.position = "fixed";
    this.layoutDropdown.style.zIndex = "9999";
    let left = triggerRect.right + triggerMargin.right + gap - dropdownMargin.left;
    if (left + dropdownRect.width + dropdownMargin.right > viewportWidth - viewportMargin) {
      left = triggerRect.left - triggerMargin.left - gap - dropdownRect.width - dropdownMargin.right;
      if (left < viewportMargin) {
        left = viewportWidth - dropdownRect.width - dropdownMargin.right - viewportMargin;
      }
    }
    let top = triggerRect.top - triggerMargin.top - dropdownMargin.top;
    if (top + dropdownRect.height + dropdownMargin.bottom > viewportHeight - viewportMargin) {
      top = triggerRect.bottom + triggerMargin.bottom - dropdownRect.height + dropdownMargin.top;
      if (top < viewportMargin) {
        top = viewportHeight - dropdownRect.height - dropdownMargin.bottom - viewportMargin;
      }
    }
    left = Math.max(viewportMargin, Math.min(left, viewportWidth - dropdownRect.width - dropdownMargin.right - viewportMargin));
    top = Math.max(viewportMargin, Math.min(top, viewportHeight - dropdownRect.height - dropdownMargin.bottom - viewportMargin));

    this.layoutDropdown.style.left = `${left}px`;
    this.layoutDropdown.style.top = `${top}px`;
  }

  setupUI() {
    this.layoutToggle = document.querySelector("[data-layout-toggle]");
    this.layoutDropdown = document.querySelector("[data-layout-dropdown]");
    this.layoutList = document.querySelector("[data-layout-list]");

    if (!this.layoutToggle || !this.layoutDropdown || !this.layoutList) return;

    this.originalParent = this.layoutDropdown.parentElement;
    this.submenuPlaceholder = document.querySelector("[data-submenu-item]");

    if (this.submenuPlaceholder) {
      this.resizeHandler = () => this.positionSubmenu();
      this.scrollHandler = () => this.positionSubmenu();
      window.addEventListener("resize", this.resizeHandler);
      window.addEventListener("scroll", this.scrollHandler, true);
    }

    this.renderLayoutList(this.layoutList);

    this.toggleClickHandler = (e) => {
      if (this.layoutDropdown.classList.contains("show")) {
        this.layoutDropdown.classList.remove("show");
        this.layoutToggle.classList.remove("active");

        if (this.submenuPlaceholder && this.layoutDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.layoutDropdown);
        }
      } else {
        this.layoutDropdown.classList.add("show");
        this.layoutToggle.classList.add("active");

        if (this.submenuPlaceholder) {
          this.positionSubmenu();
        }
      }
    };

    this.documentClickHandler = (e) => {
      if (e.target !== this.layoutToggle && !this.layoutDropdown.contains(e.target)) {
        this.layoutDropdown.classList.remove("show");
        this.layoutToggle.classList.remove("active");

        if (this.submenuPlaceholder && this.layoutDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.layoutDropdown);
        }
      }
    };

    this.dropdownClickHandler = (e) => {
      e.stopPropagation();
    };

    this.layoutToggle.addEventListener("click", this.toggleClickHandler);
    document.addEventListener("click", this.documentClickHandler);
    this.layoutDropdown.addEventListener("click", this.dropdownClickHandler);
  }

  renderLayoutList(container) {
    container.innerHTML = "";

    this.layouts.forEach((layout) => {
      const option = window.App.modules.util.createElement("div", "option");
      option.setAttribute("data-layout-id", layout.id);

      if (layout.id === this.currentLayout) {
        option.classList.add("show");
      }

      const name = window.App.modules.util.createElement("div", "option-name", layout.name);
      const desc = window.App.modules.util.createElement("div", "option-desc", layout.description);

      option.appendChild(name);
      option.appendChild(desc);

      option.addEventListener("click", () => {
        this.reloadNextLayout(layout.id);
      });

      container.appendChild(option);
    });
  }

  reloadNextLayout(layoutId, reloadFull = false) {
    this.applyLayout(layoutId);
    this.layoutDropdown && this.layoutDropdown.classList.remove("show"), this.layoutToggle && this.layoutToggle.classList.remove("active");

    if (this.submenuPlaceholder && this.layoutDropdown && this.layoutDropdown.parentElement === this.submenuPlaceholder) {
      this.originalParent.appendChild(this.layoutDropdown);
    }

    this.clearAllScript();
    setTimeout(() => this.reloadApp(), 1000);
  }

  updateUI() {
    document.querySelectorAll("[data-layout-id]").forEach((option) => {
      const layoutId = option.getAttribute("data-layout-id");
      if (layoutId === this.currentLayout) {
        option.classList.add("show");
      } else {
        option.classList.remove("show");
      }
    });
  }

  clearAllScript() {
    if (window.App && window.App.reset) {
      window.App.reset();
    }
    document.querySelectorAll('script[type="module"]').forEach((script) => script.remove());
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }
  }

  callBack() {
    fetch(`${window.location.origin}/404.html`)
      .then((response) => {
        if (!response.ok) throw new Error("Page not found");
        return response.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        doc.documentElement.querySelectorAll("head script").forEach((s) => s.remove());
        const root404 = doc.documentElement.querySelector("[data-error-page]");
        if (root404) root404.style.display = "flex";
        html = doc.documentElement.outerHTML;
        document.open();
        document.write(html);
        document.close();
      })
      .catch((error) => {
        console.error("Error loading theme:", error);
        document.body.innerHTML = "<h1>Page not found</h1>";
      });
  }

  themeName(path) {
    const ignoreTheme = ["blogs"];
    const theme = localStorage.getItem("layout") || "nexa";
    const segments = path.split("/").filter((segment) => segment !== "");
    const startsWithIgnoredTheme = segments.length > 0 && ignoreTheme.includes(segments[0]?.toLowerCase());
    const moreSegments = segments.length > 1;
    if (startsWithIgnoredTheme && moreSegments) {
      return "";
    }

    return `/${theme}`;
  }

  reloadApp() {
    let pagePath = window.location.pathname;

    if (pagePath === "/" || pagePath === "/index.html") {
      pagePath = "/index.html";
    }
    const theme = this.themeName(pagePath);
    const url = `${window.location.origin}${theme}${pagePath}`;
    fetch(url)
      .then((response) => {
        if (!response.ok) this.callBack();
        return response.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        if (doc?.body) {
          doc.body.style.opacity = "0";
        }
        html = doc.documentElement.outerHTML;
        document.open();
        document.write(html);
        document.close();
        window.reinit = true;
        setTimeout(() => {
          if (document?.body) {
            document.body.removeAttribute("style");
          }
        }, 1000);
      })
      .catch((error) => {
        this.callBack();
      });
  }

  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler, true);
      this.scrollHandler = null;
    }

    if (this.layoutToggle && this.toggleClickHandler) {
      this.layoutToggle.removeEventListener("click", this.toggleClickHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener("click", this.documentClickHandler);
    }
    if (this.layoutDropdown && this.dropdownClickHandler) {
      this.layoutDropdown.removeEventListener("click", this.dropdownClickHandler);
    }

    if (this.layoutDropdown && this.originalParent && this.layoutDropdown.parentElement !== this.originalParent) {
      this.originalParent.appendChild(this.layoutDropdown);
    }

    if (this.layoutList) {
      this.layoutList.innerHTML = "";
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.layoutToggle = null;
    this.layoutDropdown = null;
    this.layoutList = null;
    this.submenuPlaceholder = null;
    this.originalParent = null;
  }
}

function initLayouts(options = {}) {
  if (window.App?.modules?.layout) {
    window.App.modules.layout.cleanup?.();
  }
  const layoutModule = new Layouts(options);
  window.App.register("layout", layoutModule, "initLayouts");
  layoutModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLayouts);
} else {
  initLayouts();
}
export { Layouts, initLayouts };
