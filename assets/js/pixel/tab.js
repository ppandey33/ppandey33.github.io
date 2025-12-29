class Tab {
  constructor() {
    this.currentSlide = 0;
    this.tabsData = [];
    this.activeTab = null;
    this.track = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.resizeTimeout = null;
  }
  async init() {
    await this.loadNavigation();
    this.setupResizeHandler();
  }
  async loadNavigation() {
    try {
      const navDetails = await window.App.modules.apiClient.loadJSON("/data/navigation.json");
      this.tabsData = navDetails?.items;
      if (this.tabsData?.length > 0) {
        this.activeTab = this.tabsData[0]?.id;
        await this.renderTabs();
        this.initializeSlider();
      }
    } catch (error) {
      console.error("Error loading navigation:", error);
    }
  }
  async renderTabs() {
    const tabsContainer = document.querySelector("[data-tabs-container]");
    if (!tabsContainer || !this.tabsData) return;
    tabsContainer.innerHTML = "";
    const validTabs = [];
    this.tabsData.forEach((item) => {
      const sectionExists = this.findSection(item.id);
      if (!sectionExists) {
        console.warn(`Section not found for tab: ${item.id}`);
        return;
      }
      validTabs.push(item);
      const newIndex = validTabs.length - 1;
      const button = window.App.modules.util.createElement("button", "tab", item.title);
      button.setAttribute("data-tab", item.id);
      button.setAttribute("data-section", item.section);
      button.setAttribute("data-index", newIndex);
      if (item.id === this.activeTab) {
        button.classList.add("active");
      }
      button.addEventListener("click", () => this.handleTabClick(item.id, newIndex));
      tabsContainer.appendChild(button);
    });
    this.tabsData = validTabs;
  }
  findSection(tabId) {
    const possibleIds = [`${tabId}-content`, `${tabId}-section`, tabId];
    for (const id of possibleIds) {
      const section = document.getElementById(id);
      if (section) return section;
    }
    const allSections = document.querySelectorAll("[data-tab-section]");
    return Array.from(allSections).find((section) => section.id.includes(tabId));
  }
  initializeSlider() {
    this.track = document.querySelector("[data-main-track]");
    this.prevBtn = document.querySelector("[data-prev-btn]");
    this.nextBtn = document.querySelector("[data-next-btn]");
    if (!this.track) {
      console.error("Track element not found");
      return;
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.goToPrev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.goToNext());
    }
    this.updateNavigationButtons();
    setTimeout(() => this.updateSlider(), 100);
  }
  async handleTabClick(tabId, index) {
    const targetSection = this.findSection(tabId);
    if (!targetSection) {
      console.error(`Section not found for: ${tabId}`);
      return;
    }
    this.activeTab = tabId;
    this.currentSlide = index;
    const allTabs = document.querySelectorAll(".tab");
    allTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });
    this.updateSlider();
    this.updateNavigationButtons();
  }
  async updateSlider() {
    if (!this.track) return;
    const slides = document.querySelectorAll("[data-tab-section]");
    if (!slides || slides.length === 0) return;
    if (this.currentSlide >= slides.length) {
      this.currentSlide = 0;
    }
    const trackStyles = window.getComputedStyle(this.track);
    const gap = parseFloat(trackStyles.gap) || 0;
    let offset = 0;
    for (let i = 0; i < this.currentSlide; i++) {
      if (slides[i]) {
        offset += slides[i].offsetWidth + gap;
      }
    }
    this.track.style.transform = `translateX(-${offset}px)`;
    const currentSlide = slides[this.currentSlide];
    const container = document.querySelector(".main-content");
    if (currentSlide && container) {
      requestAnimationFrame(() => {
        container.style.height = `${currentSlide.offsetHeight}px`;
      });
    }
  }
  goToNext() {
    if (!this.tabsData || this.tabsData.length === 0) return;
    if (this.currentSlide < this.tabsData.length - 1) {
      const nextTab = this.tabsData[this.currentSlide + 1];
      if (nextTab) {
        this.handleTabClick(nextTab.id, this.currentSlide + 1);
      }
    }
  }
  goToPrev() {
    if (!this.tabsData || this.tabsData.length === 0) return;
    if (this.currentSlide > 0) {
      const prevTab = this.tabsData[this.currentSlide - 1];
      if (prevTab) {
        this.handleTabClick(prevTab.id, this.currentSlide - 1);
      }
    }
  }
  updateNavigationButtons() {
    if (!this.tabsData || this.tabsData.length === 0) return;
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentSlide === 0;
      this.prevBtn.style.opacity = this.currentSlide === 0 ? "0.5" : "1";
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentSlide === this.tabsData.length - 1;
      this.nextBtn.style.opacity = this.currentSlide === this.tabsData.length - 1 ? "0.5" : "1";
    }
  }
  setupResizeHandler() {
    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (this.track) {
          this.updateSlider();
        }
      }, 150);
    });
  }
  cleanup() {
    if (this.prevBtn) this.prevBtn.replaceWith(this.prevBtn.cloneNode(true));
    if (this.nextBtn) this.nextBtn.replaceWith(this.nextBtn.cloneNode(true));
    const tabsContainer = document.querySelector("[data-tabs-container]");
    if (tabsContainer) tabsContainer.innerHTML = "";
    this.currentSlide = 0;
    this.tabsData = [];
    this.activeTab = null;
    this.track = null;
    this.prevBtn = null;
    this.nextBtn = null;
  }
}
function initTab() {
  if (window.App?.modules?.tab) {
    window.App.modules.tab.cleanup?.();
  }
  const tabModule = new Tab();
  window.App.register("tab", tabModule, "initTab");
  tabModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTab);
} else {
  initTab();
}
export { Tab, initTab };
