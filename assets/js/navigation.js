import { Observable } from "./observable.js";
const onNavigation = new Observable();

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

    // Handle initial hash on page load
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

        // ADD: Close mobile sidebar on click
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
        // Skip updates if we're manually navigating or in universe view
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

    // Update URL hash without triggering scroll
    if (window.location.pathname === "/" || window.location.pathname.endsWith("/index.html")) {
      history.replaceState(null, null, `#${sectionId}`);
    }

    // Update main nav links
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });

    // Update section nav links
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
  }

  updateActiveNavForUniverseSection(sectionId) {
    // Manually update nav links for universe sections
    const navLinks = document.querySelectorAll(".nav-link[data-section]");
    const sectionNavLinks = document.querySelectorAll(".section-nav-link[data-section]");

    this.currentSection = sectionId;

    // Update main nav links
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });

    // Update section nav links
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-section") === sectionId);
    });
  }

  setupSmoothScroll() {
    // Handle all hash links with manual navigation
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest('a[href^="#"], a[href^="/#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      // Extract hash from href
      const hash = href.startsWith("/#") ? href.substring(2) : href.substring(1);
      const targetSection = document.getElementById(hash);

      if (targetSection) {
        e.preventDefault();
        this.navigateToSection(hash);

        // Close mobile sidebars - UPDATED
        this.closeMobileSidebars();

        // Close mobile menu if open (legacy support)
        document.querySelector("[data-nav]")?.classList.remove("active");
      }
    });
  }

  setupHashNavigation() {
    // Listen for hash changes (back/forward buttons)
    window.addEventListener("hashchange", (e) => {
      e.preventDefault();
      const hash = window.location.hash.substring(1);
      if (hash) {
        this.navigateToSection(hash);
      } else {
        // No hash means return to universe main view
        if (!this.universeVisible) {
          this.returnToUniverse();
        }
      }

      // Close mobile sidebars on hash change
      this.closeMobileSidebars();
    });

    // Prevent default hash behavior
    window.addEventListener("click", (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor && anchor.getAttribute("href") !== "#") {
        e.preventDefault();
      }
    });
  }

  handleInitialHash() {
    // Handle hash present on page load
    const hash = window.location.hash.substring(1);
    if (hash) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        this.navigateToSection(hash, false);
      }, 100);
    }
  }

  setupUniverseNavigation() {
    this.universeTrack = document.querySelector("[data-universe-track]");

    // Service card clicks are handled by Universe module
    // Just setup back buttons here for initially rendered sections
    this.setupUniverseBackButtons();
  }

  setupUniverseBackButtons() {
    // Setup back buttons for any pre-rendered universe sections
    document.querySelectorAll("[data-return-to-universe]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToUniverse();
        // Close mobile sidebars when returning to universe
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
    // Hide the main universe view
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "0";
      mainSection.style.visibility = "hidden";
      mainSection.style.overflow = "hidden";
      mainSection.style.zIndex = "-1";
    }

    // Shift the universe track
    if (this.universeTrack) {
      this.universeTrack.classList.add("universe-track-shifted");
    }

    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection && targetSection.classList.contains("universe-section")) {
      // Hide all universe sections first
      document.querySelectorAll(".universe-section").forEach((section) => {
        section.classList.remove("active");
      });

      // Show target section
      targetSection.classList.add("active");
      this.universeVisible = false;
      this.currentSection = sectionId;

      // Update active navigation
      this.updateActiveNavForUniverseSection(sectionId);

      // Update URL
      history.pushState(null, null, `#${sectionId}`);

      // Setup back buttons for this section
      this.setupSectionBackButtons(targetSection);

      // Close mobile sidebars
      this.closeMobileSidebars();

      // Scroll to top with smooth behavior
      setTimeout(() => {
        const universeEl = document.querySelector("[data-universe]");
        window.scrollTo({ top: universeEl?.offsetTop || 0, behavior: "smooth" });
      }, 50);

      // Adjust track height
      requestAnimationFrame(() => {
        if (this.universeTrack) {
          this.universeTrack.style.height = `${targetSection.offsetHeight}px`;
        }
      });

      // Emit navigation event
      onNavigation.next({ section: sectionId, type: "universe" });
    }
  }

  setupSectionBackButtons(section) {
    // Setup back buttons for the active universe section
    const backButtons = section.querySelectorAll("[data-return-to-universe]");
    backButtons.forEach((btn) => {
      // Remove existing listeners by cloning
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
    // Show the main universe view
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "1";
      mainSection.style.visibility = "visible";
      mainSection.style.overflow = "";
      mainSection.style.position = "relative";
      mainSection.style.zIndex = "1";
    }

    // Reset universe track
    if (this.universeTrack) {
      this.universeTrack.classList.remove("universe-track-shifted");
      this.universeTrack.style.removeProperty("height");
    }

    // Hide all universe sections
    document.querySelectorAll(".universe-section").forEach((section) => {
      section.classList.remove("active");
    });

    this.universeVisible = true;
    this.currentSection = null;

    // Clear active navigation
    document.querySelectorAll(".nav-link[data-section]").forEach((link) => {
      link.classList.remove("active");
    });
    document.querySelectorAll(".section-nav-link[data-section]").forEach((link) => {
      link.classList.remove("active");
    });

    // Update URL - use replaceState to avoid adding to history
    history.replaceState(null, null, window.location.pathname);

    // Close mobile sidebars
    this.closeMobileSidebars();

    // Scroll to top
    const universeEl = document.querySelector("[data-universe]");
    window.scrollTo({ top: universeEl?.offsetTop || 0, behavior: "smooth" });

    // Emit navigation event
    onNavigation.next({ section: null, type: "universe-main" });
  }

  navigateToSection(sectionId, animate = true) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    // Check if this is a universe section (hidden section)
    const isUniverseSection = targetSection.classList.contains("universe-section");

    if (isUniverseSection) {
      // Show the universe section
      this.showUniverseSection(sectionId);
    } else {
      // Check if we need to return to universe first
      if (!this.universeVisible) {
        this.returnToUniverse();
        // Wait for transition then navigate
        setTimeout(() => {
          this.performRegularNavigation(sectionId, animate);
        }, 300);
      } else {
        this.performRegularNavigation(sectionId, animate);
      }
    }

    // Close mobile sidebars after navigation
    this.closeMobileSidebars();
  }

  performRegularNavigation(sectionId, animate = true) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    // Set navigating flag to prevent scroll spy updates
    this.isNavigating = true;

    // Update hash in URL
    if (window.location.hash !== `#${sectionId}`) {
      history.pushState(null, null, `#${sectionId}`);
    }

    // Scroll to section
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

    // Reset navigating flag after scroll completes
    setTimeout(
      () => {
        this.isNavigating = false;
      },
      animate ? 1000 : 100
    );

    // Emit navigation event
    onNavigation.next({ section: sectionId, type: "regular" });
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Clean up universe track
    if (this.universeTrack) {
      this.universeTrack.classList.remove("universe-track-shifted");
      this.universeTrack.style.removeProperty("height");
    }

    // Close mobile sidebars on cleanup
    this.closeMobileSidebars();

    const navList = document.querySelector("[data-nav-items]");
    if (navList) navList.innerHTML = "";
    const sectionNavList = document.querySelector("[data-section-nav-items]");
    if (sectionNavList) sectionNavList.innerHTML = "";
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

export { Navigation, initNavigation, onNavigation };
