import { handleURLEvent } from "./handle-url.js";
class Themes {
  constructor() {
    this.themes = [];
    this.currentTheme = localStorage.getItem("theme") || "charcoal";
    this.sysTheme = localStorage.getItem("sysTheme") === "true";
    this.themeToggle = null;
    this.themeDropdown = null;
    this.themeList = null;
    this.toggleClickHandler = null;
    this.documentClickHandler = null;
    this.dropdownClickHandler = null;
    this.submenuPlaceholder = null;
    this.originalParent = null;
    this.resizeHandler = null;
    this.scrollHandler = null;
    this.subscription = null;
    this.mediaQueryListener = null;
    this.contrastQueryListener = null;
    this.motionQueryListener = null;
  }
  async init() {
    const dateElem = document.querySelector("[data-date-time]");
    if (dateElem) {
      dateElem.textContent = new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
    }
    await this.loadThemes();
    this.setupMediaQueryListeners();
    this.applyTheme(this.currentTheme);
    if (this.sysTheme) {
      this.applySystemOverlay();
    }
    this.setupUI();
    window.addEventListener("storage", (event) => {
      this.handleThemeChange(event);
    });
    this.subscription = handleURLEvent.subscribe((event) => {
      event.theme && this.handleThemeChange(event.theme);
      event.sysTheme && this.handleThemeChange(event.sysTheme);
    });
  }
  setupMediaQueryListeners() {
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaQueryListener = (e) => {
      if (this.sysTheme) {
        this.applySystemOverlay();
      }
    };
    darkModeQuery.addEventListener("change", this.mediaQueryListener);
    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    this.contrastQueryListener = (e) => {
      if (this.sysTheme) {
        document.body.setAttribute("data-high-contrast", e.matches ? "true" : "false");
      }
    };
    contrastQuery.addEventListener("change", this.contrastQueryListener);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.motionQueryListener = (e) => {
      if (this.sysTheme) {
        document.body.setAttribute("data-reduced-motion", e.matches ? "true" : "false");
      }
    };
    motionQuery.addEventListener("change", this.motionQueryListener);
  }
  applySystemOverlay() {
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.body.setAttribute("data-sys-theme", "true");
    document.body.setAttribute("data-color-scheme", darkModeQuery.matches ? "dark" : "light");
    document.body.setAttribute("data-high-contrast", contrastQuery.matches ? "true" : "false");
    document.body.setAttribute("data-reduced-motion", motionQuery.matches ? "true" : "false");
  }
  removeSystemOverlay() {
    document.body.removeAttribute("data-sys-theme");
    document.body.removeAttribute("data-color-scheme");
    document.body.removeAttribute("data-high-contrast");
    document.body.removeAttribute("data-reduced-motion");
  }
  handleThemeChange(event) {
    if (event.key === "theme" && event.newValue && event.newValue !== this.currentTheme) {
      if (this.themes.find((t) => t.id === event.newValue)) {
        this.applyTheme(event.newValue);
      } else if (event.oldValue && this.themes.find((t) => t.id === event.oldValue)) {
        this.applyTheme(event.oldValue);
      } else {
        this.loadThemes();
        this.applyTheme(this.themes && this.themes.length > 0 ? this.themes[0].id : "charcoal");
        this.setupUI();
      }
    }
    if (event.key === "sysTheme") {
      this.sysTheme = event.newValue === "true";
      localStorage.setItem("sysTheme", this.sysTheme.toString());
      if (this.sysTheme) {
        this.applySystemOverlay();
      } else {
        this.removeSystemOverlay();
      }
      this.updateUI();
    }
  }
  async loadThemes() {
    if (this.themes && this.themes.length > 0) return;
    const data = await window.App.modules.apiClient.loadJSON("/data/themes.json");
    if (data && data.themes) {
      this.themes = data.themes;
    }
  }
  async applyTheme(themeId) {
    document.body.setAttribute("data-theme", themeId);
    this.currentTheme = themeId;
    localStorage.setItem("theme", themeId);
    if (this.sysTheme) {
      this.applySystemOverlay();
    }
    requestAnimationFrame(() => {
      this.updateUI();
      this.updateAllMetaTags();
    });
  }
  toggleSystemTheme(enabled) {
    this.sysTheme = enabled;
    localStorage.setItem("sysTheme", enabled.toString());
    if (enabled) {
      this.applySystemOverlay();
    } else {
      this.removeSystemOverlay();
    }
    this.updateUI();
  }
  positionSubmenu() {
    if (!this.submenuPlaceholder || !this.themeDropdown.classList.contains("show")) return;
    const triggerRect = this.themeToggle.getBoundingClientRect();
    const dropdownRect = this.themeDropdown.getBoundingClientRect();
    const triggerStyle = window.getComputedStyle(this.themeToggle);
    const dropdownStyle = window.getComputedStyle(this.themeDropdown);
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
    if (this.themeDropdown.parentElement !== this.submenuPlaceholder) {
      this.submenuPlaceholder.appendChild(this.themeDropdown);
    }
    this.themeDropdown.style.position = "fixed";
    this.themeDropdown.style.zIndex = "9999";
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
    this.themeDropdown.style.left = `${left}px`;
    this.themeDropdown.style.top = `${top}px`;
  }
  setupUI() {
    this.themeToggle = document.querySelector("[data-theme-toggle]");
    this.themeDropdown = document.querySelector("[data-theme-dropdown]");
    this.themeList = document.querySelector("[data-theme-list]");
    if (!this.themeToggle || !this.themeDropdown || !this.themeList) return;
    this.originalParent = this.themeDropdown.parentElement;
    this.submenuPlaceholder = document.querySelector("[data-submenu-item]");
    if (this.submenuPlaceholder) {
      this.resizeHandler = () => this.positionSubmenu();
      this.scrollHandler = () => this.positionSubmenu();
      window.addEventListener("resize", this.resizeHandler);
      window.addEventListener("scroll", this.scrollHandler, true);
    }
    this.renderThemeList(this.themeList);
    this.toggleClickHandler = (e) => {
      if (this.themeDropdown.classList.contains("show")) {
        this.themeDropdown.classList.remove("show");
        this.themeToggle.classList.remove("active");
        if (this.submenuPlaceholder && this.themeDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.themeDropdown);
        }
      } else {
        this.themeDropdown.classList.add("show");
        this.themeToggle.classList.add("active");
        if (this.submenuPlaceholder) {
          this.positionSubmenu();
        }
      }
    };
    this.documentClickHandler = (e) => {
      if (e.target !== this.themeToggle && !this.themeDropdown.contains(e.target)) {
        this.themeDropdown.classList.remove("show");
        this.themeToggle.classList.remove("active");
        if (this.submenuPlaceholder && this.themeDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.themeDropdown);
        }
      }
    };
    this.dropdownClickHandler = (e) => {
      e.stopPropagation();
    };
    this.themeToggle.addEventListener("click", this.toggleClickHandler);
    document.addEventListener("click", this.documentClickHandler);
    this.themeDropdown.addEventListener("click", this.dropdownClickHandler);
  }
  renderThemeList(container) {
    container.innerHTML = "";
    this.themes.forEach((theme) => {
      const option = window.App.modules.util.createElement("div", "option");
      option.setAttribute("data-theme-id", theme.id);
      if (theme.id === this.currentTheme) {
        option.classList.add("show");
      }
      const name = window.App.modules.util.createElement("span", "option-name", theme.label);
      const check = window.App.modules.util.createElement("span", "option-check", "✓");
      option.appendChild(name);
      option.appendChild(check);
      option.addEventListener("click", async () => {
        await this.applyTheme(theme.id);
        this.themeDropdown.classList.remove("show");
        this.themeToggle.classList.remove("active");
        if (this.submenuPlaceholder && this.themeDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.themeDropdown);
        }
      });
      container.appendChild(option);
    });
    const separator = window.App.modules.util.createElement("div", "option-separator");
    container.appendChild(separator);
    const sysThemeOption = window.App.modules.util.createElement("div", "option sys-theme-toggle");
    const label = window.App.modules.util.createElement("span", "option-name", "OS Theme Sync");
    const toggleWrapper = window.App.modules.util.createElement("label", "toggle-switch");
    const checkbox = window.App.modules.util.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.sysTheme;
    checkbox.setAttribute("data-sys-theme-checkbox", "");
    const slider = window.App.modules.util.createElement("span", "toggle-slider");
    toggleWrapper.appendChild(checkbox);
    toggleWrapper.appendChild(slider);
    sysThemeOption.appendChild(label);
    sysThemeOption.appendChild(toggleWrapper);
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      this.toggleSystemTheme(checkbox.checked);
    });
    sysThemeOption.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        e.stopPropagation();
        checkbox.checked = !checkbox.checked;
        this.toggleSystemTheme(checkbox.checked);
      }
    });
    container.appendChild(sysThemeOption);
  }
  updateUI() {
    document.querySelectorAll("[data-theme-id]").forEach((option) => {
      const themeId = option.getAttribute("data-theme-id");
      if (themeId === this.currentTheme) {
        option.classList.add("show");
      } else {
        option.classList.remove("show");
      }
    });
    const sysThemeCheckbox = document.querySelector("[data-sys-theme-checkbox]");
    if (sysThemeCheckbox) {
      sysThemeCheckbox.checked = this.sysTheme;
    }
  }
  async updateAllMetaTags() {
    try {
      const elements = document.querySelectorAll(`[data-update-change]`);
      const grouped = {
        "content-theme": [],
        "content-color": [],
        "content-url": [],
        "href-url": [],
      };
      const values = {
        "content-theme": this.currentTheme,
        "content-color": getComputedStyle(document.body).getPropertyValue("--primary").trim() || getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#00ffcc",
        "content-url": `?theme=${this.currentTheme}`,
      };
      elements.forEach((element) => {
        const updateType = element.getAttribute("data-update-change");
        if (grouped[updateType]) {
          grouped[updateType].push(element);
        }
      });
      Object.keys(grouped).forEach((key) => {
        grouped[key].forEach((element) => {
          if (key == "href-url") {
            if (!element.href) return;
            const url = new URL(element.href, location.origin);
            url.pathname = url.pathname
              .replace(/\/[^/]+_favicon\.ico$/, `/${this.currentTheme}_favicon.ico`)
              .replace(/\/[^/]+_32x32\.png$/, `/${this.currentTheme}_32x32.png`)
              .replace(/\/[^/]+_512x512\.png$/, `/${this.currentTheme}_512x512.png`);
            url.search = "";
            element.href = url.toString();
            return;
          }
          const value = key == "content-url" ? `${element.getAttribute("content")}${values[key]}` : values[key];
          this.updateMetaTag(element, value, "content");
        });
      });
    } catch (error) {}
  }
  updateMetaTag(element, newContent, type) {
    try {
      element.setAttribute(type, newContent);
      return true;
    } catch (error) {
      return false;
    }
  }
  cleanup() {
    if (this.mediaQueryListener) {
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      darkModeQuery.removeEventListener("change", this.mediaQueryListener);
      this.mediaQueryListener = null;
    }
    if (this.contrastQueryListener) {
      const contrastQuery = window.matchMedia("(prefers-contrast: high)");
      contrastQuery.removeEventListener("change", this.contrastQueryListener);
      this.contrastQueryListener = null;
    }
    if (this.motionQueryListener) {
      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      motionQuery.removeEventListener("change", this.motionQueryListener);
      this.motionQueryListener = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler, true);
      this.scrollHandler = null;
    }
    if (this.themeToggle && this.toggleClickHandler) {
      this.themeToggle.removeEventListener("click", this.toggleClickHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener("click", this.documentClickHandler);
    }
    if (this.themeDropdown && this.dropdownClickHandler) {
      this.themeDropdown.removeEventListener("click", this.dropdownClickHandler);
    }
    if (this.themeDropdown && this.originalParent && this.themeDropdown.parentElement !== this.originalParent) {
      this.originalParent.appendChild(this.themeDropdown);
    }
    if (this.themeList) {
      this.themeList.innerHTML = "";
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.themeToggle = null;
    this.themeDropdown = null;
    this.themeList = null;
    this.submenuPlaceholder = null;
    this.originalParent = null;
  }
}
function initThemes() {
  if (window.App?.modules?.theme) {
    window.App.modules.theme.cleanup?.();
  }
  const themeModule = new Themes();
  window.App.register("theme", themeModule, "initThemes");
  themeModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemes);
} else {
  initThemes();
}
export { Themes, initThemes };
