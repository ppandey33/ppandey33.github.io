class ThemeManager {
  constructor() {
    this.themes = [];
    this.currentTheme = localStorage.getItem("theme") || "charcoal";
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
  }

  async init() {
    const dateElem = document.querySelector("[data-date-time]");
    if (dateElem) {
      dateElem.textContent = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    }

    await this.loadThemes();
    this.applyTheme(this.currentTheme);
    this.setupUI();
  }

  async loadThemes() {
    const data = await window.App.modules.apiClient.loadJSON("/data/themes.json");
    if (data && data.themes) {
      this.themes = data.themes;
    }
  }

  applyTheme(themeId) {
    document.body.setAttribute("data-theme", themeId);
    this.currentTheme = themeId;
    localStorage.setItem("theme", themeId);
    
    // Update root CSS variables for immediate effect
    requestAnimationFrame(() => {
      //this.updateRootVariables();
      this.updateUI();
    });
  }

  updateRootVariables() {
    // Get computed style from body (which has the data-theme attribute)
    const computedStyle = getComputedStyle(document.body);
    
    // Get all theme-specific variables
    const primary = computedStyle.getPropertyValue('--primary').trim();
    const secondary = computedStyle.getPropertyValue('--secondary').trim();
    const accent = computedStyle.getPropertyValue('--accent').trim();
    const background = computedStyle.getPropertyValue('--background').trim();
    const surface = computedStyle.getPropertyValue('--surface').trim();
    const textPrimary = computedStyle.getPropertyValue('--textPrimary').trim();
    const textSecondary = computedStyle.getPropertyValue('--textSecondary').trim();
    const textMuted = computedStyle.getPropertyValue('--textMuted').trim();
    
    // Update :root variables so scrollbar and other global styles use the new theme colors
    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--background', background);
    root.style.setProperty('--surface', surface);
    root.style.setProperty('--textPrimary', textPrimary);
    root.style.setProperty('--textSecondary', textSecondary);
    root.style.setProperty('--textMuted', textMuted);
  }

  positionSubmenu() {
    if (!this.submenuPlaceholder || !this.themeDropdown.classList.contains("show")) return;

    const triggerRect = this.themeToggle.getBoundingClientRect();
    const dropdownRect = this.themeDropdown.getBoundingClientRect();
    
    // Get computed styles for margins
    const triggerStyle = window.getComputedStyle(this.themeToggle);
    const dropdownStyle = window.getComputedStyle(this.themeDropdown);
    
    const triggerMargin = {
      top: parseFloat(triggerStyle.marginTop) || 0,
      right: parseFloat(triggerStyle.marginRight) || 0,
      bottom: parseFloat(triggerStyle.marginBottom) || 0,
      left: parseFloat(triggerStyle.marginLeft) || 0
    };
    
    const dropdownMargin = {
      top: parseFloat(dropdownStyle.marginTop) || 0,
      right: parseFloat(dropdownStyle.marginRight) || 0,
      bottom: parseFloat(dropdownStyle.marginBottom) || 0,
      left: parseFloat(dropdownStyle.marginLeft) || 0
    };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const viewportMargin = 16;

    // Move to placeholder if not already there
    if (this.themeDropdown.parentElement !== this.submenuPlaceholder) {
      this.submenuPlaceholder.appendChild(this.themeDropdown);
    }

    this.themeDropdown.style.position = 'fixed';
    this.themeDropdown.style.zIndex = '9999';

    // Calculate horizontal position (prefer right side of trigger)
    let left = triggerRect.right + triggerMargin.right + gap - dropdownMargin.left;
    
    // Check if dropdown would overflow right edge
    if (left + dropdownRect.width + dropdownMargin.right > viewportWidth - viewportMargin) {
      // Try left side of trigger
      left = triggerRect.left - triggerMargin.left - gap - dropdownRect.width - dropdownMargin.right;
      
      // If still overflows, align to right edge of viewport
      if (left < viewportMargin) {
        left = viewportWidth - dropdownRect.width - dropdownMargin.right - viewportMargin;
      }
    }

    // Calculate vertical position (align with trigger top)
    let top = triggerRect.top - triggerMargin.top - dropdownMargin.top;
    
    // Check if dropdown would overflow bottom edge
    if (top + dropdownRect.height + dropdownMargin.bottom > viewportHeight - viewportMargin) {
      // Align to bottom of trigger
      top = triggerRect.bottom + triggerMargin.bottom - dropdownRect.height + dropdownMargin.top;
      
      // If still overflows, align to bottom of viewport
      if (top < viewportMargin) {
        top = viewportHeight - dropdownRect.height - dropdownMargin.bottom - viewportMargin;
      }
    }

    // Ensure minimum margins
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
    this.submenuPlaceholder = document.querySelector('[data-submenu-item]');

    if (this.submenuPlaceholder) {
      this.resizeHandler = () => this.positionSubmenu();
      this.scrollHandler = () => this.positionSubmenu();
      window.addEventListener('resize', this.resizeHandler);
      window.addEventListener('scroll', this.scrollHandler, true);
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

      option.addEventListener("click", () => {
        this.applyTheme(theme.id);
        this.themeDropdown.classList.remove("show");
        this.themeToggle.classList.remove("active");
        
        if (this.submenuPlaceholder && this.themeDropdown.parentElement === this.submenuPlaceholder) {
          this.originalParent.appendChild(this.themeDropdown);
        }
      });

      container.appendChild(option);
    });
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
  }

  cleanup() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
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
  const themeModule = new ThemeManager();
  window.App.register("theme", themeModule, 'initThemes');
  themeModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemes);
} else {
  initThemes();
}

export { ThemeManager, initThemes };
