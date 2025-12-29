class About {
  constructor() {
    this.config = null;
  }
  async init() {
    await this.loadAboutContent();
  }
  async loadAboutContent() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config?.about) return;
    const container = document.querySelector("[data-about]");
    if (!container) return;
    const aboutData = this.config.about;
    container.innerHTML = "";
    const titleEl = window.App.modules.util.createElement("h2", "about-title", aboutData.title);
    container.appendChild(titleEl);
    const descriptionEl = window.App.modules.util.createElement("div", "about-text");
    aboutData.description.forEach((para) => {
      const p = window.App.modules.util.createElement("p", "about-paragraph", para);
      descriptionEl.appendChild(p);
    });
    container.appendChild(descriptionEl);
  }
  cleanup() {
    const container = document.querySelector("[data-about]");
    if (container) {
      container.innerHTML = "";
    }
    this.config = null;
  }
}
function initAbout() {
  if (window.App?.modules?.about) {
    window.App.modules.about.cleanup?.();
  }
  const aboutModule = new About();
  window.App.register("about", aboutModule, 'initAbout');
  aboutModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAbout());
} else {
  initAbout();
}
export { About, initAbout };
