import { createObservable } from "../observable.js";
const onNavigation = createObservable('onNavigation');
class Universe {
  constructor() {
    this.listeners = [];
    this.filteredItems = [];
    this.backButtonListeners = [];
    this.currentSection = null;
    this.subscription = null;
  }
  async init() {
    await this.loadServiceCard();
    this.setupNavigationListener();
  }
  setupNavigationListener() {
    this.subscription = onNavigation.subscribe({
      next: (data) => {
        if (!data) return;
        if (data.type === "universe" && data.section) {
          this.currentSection = data.section;
        } else if (data.type === "universe-main") {
          this.currentSection = null;
        }
      },
      error: (err) => console.error("Universe navigation error:", err),
      complete: () => console.log(""),
    });
  }
  addListener(target, event, handler) {
    this.listeners.push({ target, event, handler });
    target.addEventListener(event, handler);
  }
  async loadServiceCard() {
    const data = await window.App.modules.apiClient.loadJSON("/data/navigation.json"),
      container = document.querySelector("[data-service-card]");
    if (!data || !container) return;
    this.filteredItems = data.items.filter((item) => item?.full_title && item?.desc);
    const serviceCard = window.App.modules.util.createElement("div", "services-section"),
      mainTitle = window.App.modules.util.createElement("h1", "section-heading", data.title),
      mainDesc = window.App.modules.util.createElement("p", "section-subtitle", data.desc),
      grid = window.App.modules.util.createElement("div", "services-grid");
    this.filteredItems.forEach((item) => {
      const card = window.App.modules.util.createElement("div", "service-card"),
        icon = window.App.modules.util.createElement("div", `service-icon ${item?.class || ""}`),
        title = window.App.modules.util.createElement("h3", "service-title", item?.full_title),
        desc = window.App.modules.util.createElement("p", "service-description", item?.desc);
      icon.innerHTML = item?.icon;
      card.setAttribute("data-service-card-event", "");
      const clickHandler = (e) => {
        e.preventDefault();
        this.navigateToSection(item);
      };
      this.addListener(card, "click", clickHandler);
      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(desc);
      grid.appendChild(card);
    });
    serviceCard.appendChild(mainTitle);
    serviceCard.appendChild(mainDesc);
    serviceCard.appendChild(grid);
    container.appendChild(serviceCard);
  }
  navigateToSection(item) {
    const sectionId = item.url.replace(/^\/#/, "").replace(/^\//, "");
    if (window.App?.modules?.nav) {
      window.App.modules.nav.navigateToSection(sectionId);
    } else {
      this.fallbackNavigate(sectionId);
    }
  }
  fallbackNavigate(sectionId) {
    const targetSection = document.getElementById(sectionId);
    const track = document.querySelector("[data-universe-track]");
    if (!targetSection || !track) return;
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "0";
      mainSection.style.visibility = "hidden";
      mainSection.style.height = "0";
      mainSection.style.overflow = "hidden";
      mainSection.style.zIndex = "-1";
    }
    track.classList.add("universe-track-shifted");
    const allSections = document.querySelectorAll(".universe-sections .section[id]");
    allSections.forEach((section) => {
      section.classList.remove("active");
    });
    targetSection.classList.add("active");
    this.currentSection = sectionId;
    this.setupBackButtons(targetSection);
    history.pushState(null, null, `#${sectionId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      track.style.height = `${targetSection.offsetHeight}px`;
    });
  }
  setupBackButtons(section) {
    this.removeBackButtonListeners();
    const backButtons = section.querySelectorAll("[data-return-to-universe]");
    backButtons.forEach((btn) => {
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.returnToUniverse();
      };
      this.backButtonListeners.push({ target: btn, event: "click", handler });
      btn.addEventListener("click", handler);
    });
  }
  returnToUniverse() {
    if (window.App?.modules?.nav) {
      window.App.modules.nav.returnToUniverse();
    } else {
      this.fallbackReturn();
    }
  }
  fallbackReturn() {
    const track = document.querySelector("[data-universe-track]");
    if (!track) return;
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "1";
      mainSection.style.visibility = "visible";
      mainSection.style.height = "";
      mainSection.style.overflow = "";
      mainSection.style.position = "relative";
      mainSection.style.zIndex = "1";
    }
    track.classList.remove("universe-track-shifted");
    track.style.removeProperty("height");
    const allSections = document.querySelectorAll(".universe-sections .section[id]");
    allSections.forEach((section) => {
      section.classList.remove("active");
    });
    this.currentSection = null;
    this.removeBackButtonListeners();
    history.replaceState(null, null, window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  removeBackButtonListeners() {
    this.backButtonListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.backButtonListeners = [];
  }
  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners = [];
    this.removeBackButtonListeners();
    const track = document.querySelector("[data-universe-track]");
    if (track) {
      track.classList.remove("universe-track-shifted");
      track.style.removeProperty("height");
    }
    const mainSection = document.querySelector("section[data-service-card]");
    if (mainSection) {
      mainSection.style.opacity = "";
      mainSection.style.visibility = "";
      mainSection.style.height = "";
      mainSection.style.overflow = "";
      mainSection.style.position = "";
      mainSection.style.zIndex = "";
    }
    const allSections = document.querySelectorAll(".universe-sections .section[id]");
    allSections.forEach((section) => {
      section.classList.remove("active");
    });
    const container = document.querySelector("[data-service-card]");
    if (container) {
      container.innerHTML = "";
    }
    this.filteredItems = [];
    this.currentSection = null;
  }
}
function initUniverse() {
  if (window.App?.modules?.universe) {
    window.App.modules.universe.cleanup?.();
  }
  const universeModule = new Universe();
  window.App.register("universe", universeModule, "initUniverse");
  universeModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUniverse);
} else {
  initUniverse();
}
export { Universe, initUniverse };
