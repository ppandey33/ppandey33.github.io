class Social {
  constructor() {
    this.visibilityTimeout = null;
  }
  async init() {
    await this.renderSocial();
  }
  async renderSocial() {
    const config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!config?.social) return;
    const topContainer = document.querySelector("[data-social-container]");
    const container = document.querySelector("[data-social]");
    if (container && config?.social) {
      container.innerHTML = "";
      config.social
        .filter((s) => s.url && s.url !== "")
        .forEach((socialData) => {
          const aEl = window.App.modules.util.createElement("a", `contact-social glass-card zoom  ${(socialData?.class || '')}`);
          aEl.target = "_blank";
          aEl.href = socialData.url;
          aEl.innerHTML = socialData.icon;
          container.appendChild(aEl);
        });
      if (topContainer && config.social.filter((s) => s.url && s.url !== "").length > 0) {
        this.visibilityTimeout = setTimeout(() => {
          topContainer.classList.add("visible");
        }, 1000);
      }
    }
  }
  cleanup() {
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }
    const container = document.querySelector("[data-social]");
    if (container) container.innerHTML = "";
  }
}
function initSocial() {
  if (window.App?.modules?.social) {
    window.App.modules.social.cleanup?.();
  }
  const socialModule = new Social();
  window.App.register("social", socialModule, 'initSocial');
  socialModule.init();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSocial);
  } else {
    initSocial();
  }
export { Social, initSocial };
