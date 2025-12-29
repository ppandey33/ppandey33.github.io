import { HideComponent } from "../hide-component.js";
class About extends HideComponent {
  constructor() {
    super({ currentPath: "/about" });
  }
  async init() {
    await this.loadAboutContent();
  }
  async loadAboutContent() {
    const config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!config?.about) return;
    const container = document.querySelector("[data-about]");
    if (container) {
      const aboutData = config.about;
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
    this.manageDOM();
  }
  cleanup() {
    const container = document.querySelector("[data-about]");
    if (container) {
      container.innerHTML = "";
    }
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
