class Iam {
  constructor() {
    this.config = null;
  }
  async init() {
    await this.loadSiteConfig();
  }
  async loadSiteConfig() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    const iamElements = document.querySelectorAll("[data-iam]");
    if (!iamElements.length || !this.config?.hero) return;
    iamElements.forEach((el) => {
      const prop = el.getAttribute("data-iam");
      if (prop && this.config.hero[prop]) {
        el.textContent = this.config.hero[prop];
      }
    });
  }
  cleanup() {
    this.config = null;
    const iamElements = document.querySelectorAll("[data-iam]");
    iamElements.forEach((el) => (el.textContent = ""));
  }
}
function initIam() {
  if (window.App?.modules?.iam) {
    window.App.modules.iam.cleanup?.();
  }
  const iamModule = new Iam();
  window.App.register("iam", iamModule, 'initIam');
  iamModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIam);
} else {
  initIam();
}
export { Iam, initIam };
