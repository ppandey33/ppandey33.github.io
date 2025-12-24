import { createObservable } from "./observable.js";

const onNavigation = createObservable('onNavigation');

class Navigation {
  constructor() {
    this.navData = null;
    this.currentSection = null;
    this.isNavigating = false;
    this.universeTrack = null;
    this.universeVisible = true;
  }

  async init() {
    await this.loadNavigation();
    this.renderNavigation();
    this.renderSectionNav();
    this.setupScrollSpy();
    this.setupSmoothScroll();
    this.setupHashNavigation();
    this.setupUniverseNavigation();
    this.updateSiteInfo();
    this.handleInitialHash();
  }

  async loadNavigation() {
    const navDetails = await window.App.modules.apiClient.loadJSON("/data/navigation.json");
    this.navData = navDetails?.items;
  }

  resolvePath(path) {
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) {
      const depth = (window.location.pathname.match(/\//g) || []).length - 1;
      if (depth > 0 && !path.startsWith("/#")) {
        return "../".repeat(depth) + path.substring(1);
      }
      return path;
    }
    return path;
  }

  closeMobileSidebars() {
    const leftSidebar = document.querySelector(".left-sidebar-card"),
      rightSidebar = document.querySelector(".right-sidebar-card"),
      leftBtn = document.querySelector('[data-sidebar-toggle="left"]'),
      rightBtn = document.querySelector('[data-sidebar-toggle="right"]'),
      overlay = document.querySelector(".sidebar-overlay"),
      hamburger = document.querySelector(".mobile-menu-toggle");
    if (leftSidebar) leftSidebar.classList.remove("active");
    if (rightSidebar) rightSidebar.classList.remove("active");
    if (leftBtn) leftBtn.classList.remove("active");
    if (rightBtn) rightBtn.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    if (hamburger) hamburger.classList.remove("active");
  }

  renderNavigation() {
    const navList = document.querySelector("[data-nav-items]");
    if (navList && this.navData) {
      navList.innerHTML = "";
      this.navData.forEach((item) => {
        const li = window.App.modules.util.createElement("li", "nav-item");
        const a = window.App.modules.util.createElement("a", "nav-link");
        a.href = this.resolvePath(item.url);
        a.setAttribute("data-section", item.section);
        a.addEventListener("click", () => {
          this.closeMobileSidebars();
        });
        const txtSpan = window.App.modules.util.createElement("span", "nav-link-text", item.title),
          iconSpan = window.App.modules.util.createElement("span", `nav-link-icon ${item?.class || ""}`);
        iconSpan.innerHTML = item.icon;
        a.appendChild(iconSpan), a.appendChild(txtSpan), li.appendChild(a), navList.appendChild(li);
      });
    }
  }

  renderSectionNav() {
    const sectionNavList = document.querySelector("[data-section-nav-items]");
    if (sectionNavList && this.navData) {
      sectionNavList.innerHTML = "";
      this.navData.sections.forEach((section) => {
        const li = window.App.modules.util.createElement("li", "section-nav-item");
        const a = window.App.modules.util.createElement("a", "section-nav-link", section.replace(/-/g, " "));
        a.href = `#${section}`;
        a.setAttribute("data-section", section);
        a.addEventListener("click", () => {
          this.closeMobileSidebars();
        });

        li.appendChild(a);
        sectionNavList.appendChild(li);
      });
    }
  }

  setupScrollSpy() {
    const sections = document.querySelectorAll(".section[id]");
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const sectionNavLinks = document.querySelectorAll(".section-nav-link[data-section]");

    this.observer = new IntersectionObserver(
      (entries) => {
        if (this.isNavigating || !this.universeVisible) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            const sectionId = entry.target.id;

            let maxRatio = entry.intersectionRatio;
            let mostVisibleSection = sectionId;

            sections.forEach((section) => {
              const rect = section.getBoundingClientRect();
              const viewportHeight = window.innerHeight;
              const sectionTop = rect.top;
              const sectionBottom = rect.bottom;

              const visibleTop = Math.max(0, Math.min(viewportHeight, sectionBottom));
              const visibleBottom = Math.max(0, Math.min(viewportHeight, viewportHeight - sectionTop));
              const visibleHeight = Math.max(0, Math.min(visibleTop, visibleBottom));
              const ratio = visibleHeight / viewportHeight;

              if (ratio > maxRatio) {
                maxRatio = ratio;
                mostVisibleSection = section.id;
              }
            });

            if (mostVisibleSection === sectionId) {
              this.updateActiveSection(sectionId, navLinks, sectionNavLinks);
            }
          }
        });
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: "-80px 0px -20% 0px",
      }
    );

    sections.forEach((section) => this.observer.observe(section));
  }

  updateActiveSection(sectionId, navLinks, sectionNavLinks) {
    this.currentSection = sectionId;
    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
      history.replaceState(null, null, `#${sectionId}`);
    }
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
  }

  updateActiveNavForUniverseSection(sectionId) {
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const sectionNavLinks = document.querySelectorAll(".section-nav-link[data-section]");

    this.currentSection = sectionId;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
  }

  setupSmoothScroll() {
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest('a[href^="#"], a[href^="/#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const hash = href.startsWith("/#") ? href.substring(2) : href.substring(1);
      const targetSection = document.getElementById(hash);

      if (targetSection) {
        e.preventDefault();
        this.navigateToSection(hash);
        this.closeMobileSidebars();
        document.querySelector("[data-nav]")?.classList.remove("active");
      }
    });
  }

  setupHashNavigation() {
    window.addEventListener("hashchange", (e) => {
      e.preventDefault();
      const hash = window.location.hash.substring(1);
      if (hash) {
        this.navigateToSection(hash);
      } else {
        if (!this.universeVisible) {
          this.returnToUniverse();
        }
      }
      this.closeMobileSidebars();
    });
    window.addEventListener("click", (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor && anchor.getAttribute("href") !== "#") {
        e.preventDefault();
      }
    });
  }

  handleInitialHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      setTimeout(() => {
        this.navigateToSection(hash, false);
      }, 100);
    }
  }

  setupUniverseNavigation() {
    this.universeTrack = document.querySelector("[data-universe-track]");
    this.setupUniverseBackButtons();
  }

  setupUniverseBackButtons() {
    document.querySelectorAll("[data-return-to-universe]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToUniverse();
        this.closeMobileSidebars();
      });
    });
  }

  getSectionIdFromTitle(title) {
    const sectionMap = {
      "Tech DNA": "stack",
      "Growth As An Engineer": "journey",
      "Academic Timeline": "learning",
      "Where I Made an Impact": "kudos",
      "Dev Lab Projects": "dev",
      "Insight Hub": "blogs",
      "The Mind Behind This Universe": "about",
    };
    return sectionMap[title] || null;
  }

  showUniverseSection(sectionId) {
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "0";
      mainSection.style.visibility = "hidden";
      mainSection.style.overflow = "hidden";
      mainSection.style.zIndex = "-1";
    }
    if (this.universeTrack) {
      this.universeTrack.classList.add("universe-track-shifted");
    }
    const targetSection = document.getElementById(sectionId);
    if (targetSection && targetSection.classList.contains("universe-section")) {
      document.querySelectorAll(".universe-section").forEach((section) => {
        section.classList.remove("active");
      });
      targetSection.classList.add("active");
      this.universeVisible = false;
      this.currentSection = sectionId;
      this.updateActiveNavForUniverseSection(sectionId);
      history.pushState(null, null, `#${sectionId}`);
      this.setupSectionBackButtons(targetSection);
      this.closeMobileSidebars();
      setTimeout(() => {
        const universeEl = document.querySelector("[data-universe]");
        window.scrollTo({ top: universeEl?.offsetTop || 0, behavior: "smooth" });
      }, 50);
      requestAnimationFrame(() => {
        if (this.universeTrack) {
          this.universeTrack.style.height = `${targetSection.offsetHeight}px`;
        }
      });
      onNavigation.next({ section: sectionId, type: "universe" });
    }
  }

  setupSectionBackButtons(section) {
    const backButtons = section.querySelectorAll("[data-return-to-universe]");
    backButtons.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode?.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToUniverse();
        this.closeMobileSidebars();
      });
    });
  }

  returnToUniverse() {
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "1";
      mainSection.style.visibility = "visible";
      mainSection.style.overflow = "";
      mainSection.style.position = "relative";
      mainSection.style.zIndex = "1";
    }
    if (this.universeTrack) {
      this.universeTrack.classList.remove("universe-track-shifted");
      this.universeTrack.style.removeProperty("height");
    }
    document.querySelectorAll(".universe-section").forEach((section) => {
      section.classList.remove("active");
    });

    this.universeVisible = true;
    this.currentSection = null;
    document.querySelectorAll(".nav-link[data-section]").forEach((link) => {
      link.classList.remove("active");
    });
    document.querySelectorAll(".section-nav-link[data-section]").forEach((link) => {
      link.classList.remove("active");
    });
    history.replaceState(null, null, window.location.pathname);
    this.closeMobileSidebars();
    const universeEl = document.querySelector("[data-universe]");
    window.scrollTo({ top: universeEl?.offsetTop || 0, behavior: "smooth" });
    onNavigation.next({ section: null, type: "universe-main" });
  }

  navigateToSection(sectionId, animate = true) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;
    const isUniverseSection = targetSection.classList.contains("universe-section");

    if (isUniverseSection) {
      this.showUniverseSection(sectionId);
    } else {
      if (!this.universeVisible) {
        this.returnToUniverse();
        setTimeout(() => {
          this.performRegularNavigation(sectionId, animate);
        }, 300);
      } else {
        this.performRegularNavigation(sectionId, animate);
      }
    }
    this.closeMobileSidebars();
  }

  performRegularNavigation(sectionId, animate = true) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;
    this.isNavigating = true;
    if (window.location.hash !== `#${sectionId}`) {
      history.pushState(null, null, `#${sectionId}`);
    }
    if (animate) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      targetSection.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    }
    setTimeout(
      () => {
        this.isNavigating = false;
      },
      animate ? 1000 : 100
    );
    onNavigation.next({ section: sectionId, type: "regular" });
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.universeTrack) {
      this.universeTrack.classList.remove("universe-track-shifted");
      this.universeTrack.style.removeProperty("height");
    }
    this.closeMobileSidebars();

    const navList = document.querySelector("[data-nav-items]");
    if (navList) navList.innerHTML = "";
    const sectionNavList = document.querySelector("[data-section-nav-items]");
    if (sectionNavList) sectionNavList.innerHTML = "";
    document.querySelectorAll("[data-footer-links]").forEach((el) => {
      el.innerHTML = "";
    });
  }

  async updateSiteInfo() {
    const siteConfig = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (siteConfig) {
      document.querySelectorAll("[data-site-name]").forEach((el) => {
        el.textContent = siteConfig.short_title;
      });

      document.querySelectorAll("[data-footer-site-name]").forEach((el) => {
        el.textContent = siteConfig.title;
      });

      document.querySelectorAll("[data-tagline]").forEach((el) => {
        el.textContent = siteConfig.description;
      });

      document.querySelectorAll("[data-footer-links]").forEach((el) => {
        siteConfig?.social
          ?.filter((s) => s.url && s.url !== "")
          .forEach((socialData) => {
            const aEl = window.App.modules.util.createElement("a", `contact-social zoom ${socialData?.class || ""}`);
            aEl.target = "_blank";
            aEl.href = socialData?.url;
            aEl.innerHTML = socialData.icon;
            el.appendChild(aEl);
          });
      });

      document.querySelectorAll("[data-copyright-year]").forEach((el) => {
        el.textContent = `© ${new Date().getFullYear()} `;
        el.nextElementSibling.textContent = siteConfig.title;
      });
    }
  }
}

function initNavigation() {
  if (window.App?.modules?.nav) {
    window.App.modules.nav.cleanup?.();
  }
  const navigationModule = new Navigation();
  window.App.register("nav", navigationModule, "initNavigation");
  navigationModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavigation);
} else {
  initNavigation();
}

export { Navigation, initNavigation };
