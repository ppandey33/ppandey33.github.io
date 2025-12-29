class CommonUtilities {
  constructor() {
    this.mobileMenuToggle = null;
    this.siteNav = null;
    this.scrollRevealObserver = null;
    this.scrollTimeout = null;
    this.scrollHandler = null;
    this.headerScrollHandler = null;
    this.mobileMenuClickHandler = null;
    this.documentClickHandler = null;
    this.dropdownEventListeners = [];
  }
  init() {
    this.setup();
  }
  setup() {
    this.setupMobileMenu();
    this.initScrollReveal();
    this.setupHeaderScroll();
  }
  createElement(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content) {
      if (typeof content === "string") {
        el.textContent = content;
      } else {
        el.appendChild(content);
      }
    }
    return el;
  }
  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        clearTimeout(timeout);
        func(...args);
      }, wait);
    };
  }
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  smoothScroll(target) {
    const itemHash = target.includes("#") ? "#" + target.split("#")[1] : null;
    if (!itemHash) return;
    const el = document.querySelector(itemHash);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el?.offsetTop || el?.offsetParent?.offsetTop;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }
  setupMobileMenu() {
    this.mobileMenuToggle = document.querySelector("[mobile-menu-toggle]");
    this.siteNav = document.querySelector("[data-nav]");
    if (!this.mobileMenuToggle) {
      this.createMobileSidebarControls();
      return;
    }
    if (!this.siteNav) return;
    this.mobileMenuClickHandler = () => {
      this.siteNav.classList.toggle("active");
      this.mobileMenuToggle.classList.toggle("active");
    };
    this.documentClickHandler = (e) => {
      if (!this.mobileMenuToggle.contains(e.target) && !this.siteNav.contains(e.target)) {
        this.siteNav.classList.remove("active");
        this.mobileMenuToggle.classList.remove("active");
      }
    };
    this.mobileMenuToggle.addEventListener("click", this.mobileMenuClickHandler);
    document.addEventListener("click", this.documentClickHandler);
  }
  createMobileSidebarControls() {
    if (document.querySelector(".mobile-sidebar-controls")) return;
    const header = this.createElement("div", "mobile-sidebar-controls"),
      leftBtn = this.createElement("button", "mobile-sidebar-btn fa"),
      rightBtn = this.createElement("button", "mobile-sidebar-btn fa");
    leftBtn.innerHTML = "&#xf508;", leftBtn.setAttribute('data-target', 'left-sidebar');
    rightBtn.innerHTML = "&#xf0c9;", rightBtn.setAttribute('data-target', 'right-sidebar');
    header.appendChild(leftBtn), header.appendChild(rightBtn);
    const overlay = this.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(overlay, document.body.firstChild);
    this.moveNetworkDropdownToStatusBar();
    const leftSidebar = document.querySelector(".left-sidebar-card");
    const rightSidebar = document.querySelector(".right-sidebar-card");
    if (!leftSidebar || !rightSidebar) return;
    this.leftSidebarBtn = leftBtn;
    this.rightSidebarBtn = rightBtn;
    this.leftSidebar = leftSidebar;
    this.rightSidebar = rightSidebar;
    this.sidebarOverlay = overlay;
    this.setupSidebarToggleListeners();
  }
  setupSidebarToggleListeners() {
    this.leftSidebarBtn.addEventListener("click", () => {
      const isActive = this.leftSidebar.classList.contains("active");
      this.rightSidebar.classList.remove("active");
      this.rightSidebarBtn.classList.remove("active");
      this.leftSidebar.classList.toggle("active");
      this.leftSidebarBtn.classList.toggle("active");
      if (!isActive) {
        this.sidebarOverlay.classList.add("active");
      } else {
        this.sidebarOverlay.classList.remove("active");
      }
    });
    this.rightSidebarBtn.addEventListener("click", () => {
      const isActive = this.rightSidebar.classList.contains("active");
      this.leftSidebar.classList.remove("active");
      this.leftSidebarBtn.classList.remove("active");
      this.rightSidebar.classList.toggle("active");
      this.rightSidebarBtn.classList.toggle("active");
      if (!isActive) {
        this.sidebarOverlay.classList.add("active");
      } else {
        this.sidebarOverlay.classList.remove("active");
      }
    });
    this.sidebarOverlay.addEventListener("click", () => {
      this.leftSidebar.classList.remove("active");
      this.rightSidebar.classList.remove("active");
      this.leftSidebarBtn.classList.remove("active");
      this.rightSidebarBtn.classList.remove("active");
      this.sidebarOverlay.classList.remove("active");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.leftSidebar.classList.remove("active");
        this.rightSidebar.classList.remove("active");
        this.leftSidebarBtn.classList.remove("active");
        this.rightSidebarBtn.classList.remove("active");
        this.sidebarOverlay.classList.remove("active");
      }
    });
  }
  moveNetworkDropdownToStatusBar() {
    if (window.innerWidth > 768) return;
    const navContainer = document.querySelector(".nav-container");
    const networkSubmenu = navContainer?.querySelector("[data-submenu-item]");
    if (!networkSubmenu) return;
    const statusBar = document.querySelector(".page-container");
    if (!statusBar) return;
    statusBar.appendChild(networkSubmenu);
  }
  initScrollReveal() {
    const revealElements = document.querySelectorAll(".reveal");
    if (revealElements.length === 0) return;
    let lastScrollTop = 0;
    const isMobile = window.innerWidth <= 768;
    const config = {
      threshold: 0.1,
      rootMargin: "0px 0px 0px 0px",
    };
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        } else {
          entry.target.classList.remove("visible");
        }
      });
    };
    this.scrollRevealObserver = new IntersectionObserver(observerCallback, config);
    revealElements.forEach((element, index) => {
      this.scrollRevealObserver.observe(element);
    });
    if (revealElements[0]) {
      revealElements[0].classList.add("visible");
    }
  }
  setupHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    let lastScroll = 0;
    this.headerScrollHandler = () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll <= 0) {
        header.classList.remove("scroll-up");
        return;
      }
      if (currentScroll > lastScroll && !header.classList.contains("scroll-down")) {
        header.classList.remove("scroll-up");
        header.classList.add("scroll-down");
      } else if (currentScroll < lastScroll && header.classList.contains("scroll-down")) {
        header.classList.remove("scroll-down");
        header.classList.add("scroll-up");
      }
      lastScroll = currentScroll;
    };
    window.addEventListener("scroll", this.headerScrollHandler);
  }
  createSimpleButton(button, type) {
    const btn = this.createElement("a");
    btn.className = `btn btn-${button.style}`;
    if (button.url) {
      btn.href = button.url;
    } else if (button.rel) {
      btn.href = "#";
    }
    if (type === "icon" && button.icon) {
      const icon = this.createElement("i");
      icon.className = button.class || "fa";
      icon.innerHTML = button.icon;
      btn.appendChild(icon);
      btn.classList.add("btn-icon-only");
      btn.setAttribute("data-tooltip", button.text);
      btn.setAttribute("aria-label", button.text);
    } else {
      if (button.icon) {
        const icon = this.createElement("i");
        icon.className = button.class || "fa";
        icon.innerHTML = button.icon;
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(" "));
      }
      btn.appendChild(document.createTextNode(button.text));
    }
    return btn;
  }
  createDropdownButton(button, type) {
    const dropdownWrapper = this.createElement("div", "btn-dropdown");
    const defaultChild = button.child.find((child) => child.default) || button.child[0];
    let selectedChild = defaultChild;
    const mainBtn = this.createElement("a", `btn btn-${button.style} btn-dropdown-main`);
    mainBtn.href = "#";
    mainBtn.setAttribute("data-selected-value", selectedChild.text);
    const contentWrapper = this.createElement("span", "btn-content");
    if (type === "icon" && button.icon) {
      this.updateButtonContent(contentWrapper, button.icon, selectedChild.text, type);
      mainBtn.classList.add("btn-icon-with-text");
      mainBtn.setAttribute("data-tooltip", button.text);
      mainBtn.setAttribute("aria-label", button.text);
    } else {
      this.updateButtonContent(contentWrapper, selectedChild.icon, selectedChild.text, type);
    }
    mainBtn.appendChild(contentWrapper);
    const toggleBtn = this.createElement("button", `btn btn-${button.style} btn-dropdown-toggle`);
    toggleBtn.innerHTML = '<i class="fa">&#xf078;</i>';
    toggleBtn.setAttribute("aria-label", "Toggle dropdown");
    const dropdownMenu = this.createElement("div", "dropdown-menu");
    button.child.forEach((childBtn) => {
      const childLink = this.createElement("a", "dropdown-item");
      childLink.href = "#";
      if (childBtn === selectedChild) {
        childLink.classList.add("selected");
      }
      if (childBtn.icon) {
        const icon = this.createElement("i", "fa");
        icon.innerHTML = childBtn.icon;
        childLink.appendChild(icon);
        childLink.appendChild(document.createTextNode(" "));
      }
      childLink.appendChild(document.createTextNode(childBtn.text));
      const checkmark = this.createElement("i", "fa checkmark");
      checkmark.innerHTML = "&#xf00c;";
      childLink.appendChild(checkmark);
      const clickHandler = (e) => {
        e.preventDefault();
        selectedChild = childBtn;
        contentWrapper.innerHTML = "";
        if (type === "icon" && button.icon) {
          this.updateButtonContent(contentWrapper, button.icon, selectedChild.text, type);
        } else {
          this.updateButtonContent(contentWrapper, selectedChild.icon, selectedChild.text, type);
        }
        mainBtn.setAttribute("data-selected-value", selectedChild.text);
        dropdownMenu.querySelectorAll(".dropdown-item").forEach((item) => {
          item.classList.remove("selected");
        });
        childLink.classList.add("selected");
        dropdownWrapper.classList.remove("open");
      };
      childLink.addEventListener("click", clickHandler);
      dropdownMenu.appendChild(childLink);
    });
    const toggleHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdownWrapper.classList.toggle("open");
    };
    toggleBtn.addEventListener("click", toggleHandler);
    const outsideClickHandler = (e) => {
      if (!dropdownWrapper.contains(e.target)) {
        dropdownWrapper.classList.remove("open");
      }
    };
    document.addEventListener("click", outsideClickHandler);
    this.dropdownEventListeners.push({
      element: document,
      type: "click",
      handler: outsideClickHandler,
    });
    dropdownWrapper.appendChild(mainBtn);
    dropdownWrapper.appendChild(toggleBtn);
    dropdownWrapper.appendChild(dropdownMenu);
    return dropdownWrapper;
  }
  updateButtonContent(container, button, text, type) {
    if (button?.icon && type == "icon") {
      const iconElement = this.createElement("i", button.class || "fa");
      iconElement.innerHTML = icon;
      container.appendChild(iconElement);
      container.appendChild(document.createTextNode(" "));
    }
    container.appendChild(document.createTextNode(text));
  }
  async closeDialog(e, type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.removeProperty("overflow");
      return true;
    }
    return false;
  }
  async openDialog(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      return true;
    }
    return false;
  }
  share(title) {
    const preferences = {
      t: localStorage.getItem("theme") || "charcoal",
      l: localStorage.getItem("layout") || "nexa",
      s: localStorage.getItem("sysTheme") ?? true,
    };
    const json = JSON.stringify(preferences);
    const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode("0x" + p1)));
    const urlSafeBase64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = new URL(window.location.href);
    url.searchParams.set("b", urlSafeBase64);
    if (navigator.share) {
      navigator.share({
        title: title,
        url: url,
      });
    }
  }
  cleanup() {
    this.dropdownEventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.dropdownEventListeners = [];
    if (this.mobileMenuToggle && this.mobileMenuClickHandler) {
      this.mobileMenuToggle.removeEventListener("click", this.mobileMenuClickHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener("click", this.documentClickHandler);
    }
    const mobileControls = document.querySelector(".mobile-sidebar-controls");
    const overlay = document.querySelector(".sidebar-overlay");
    if (mobileControls) mobileControls.remove();
    if (overlay) overlay.remove();
    if (this.scrollRevealObserver) {
      this.scrollRevealObserver.disconnect();
    }
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler);
    }
    if (this.headerScrollHandler) {
      window.removeEventListener("scroll", this.headerScrollHandler);
    }
    if (this.scrollTimeout) {
      window.cancelAnimationFrame(this.scrollTimeout);
    }
    this.mobileMenuToggle = null;
    this.siteNav = null;
    this.scrollRevealObserver = null;
    this.scrollTimeout = null;
  }
}
function initCommon() {
  if (window.App?.modules?.util) {
    window.App.modules.util.cleanup?.();
  }
  const utilModule = new CommonUtilities();
  window.App.register("util", utilModule, "initCommon");
  utilModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCommon);
} else {
  initCommon();
}
export { CommonUtilities, initCommon };
