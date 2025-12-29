class Social {
  constructor() {
    this.config = null;
  }
  async init() {
    await this.updateSiteInfo();
  }
  async updateSiteInfo() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config) return;
    document.querySelectorAll("[data-footer-links]").forEach((el) => {
      el.innerHTML = "";
      this.config.social
        ?.filter((s) => s.url && s.url !== "")
        .forEach((socialData) => {
          const aEl = window.App.modules.util.createElement("a", `contact-social zoom ${(socialData?.class || '')}`);
          aEl.target = "_blank";
          aEl.href = socialData?.url;
          aEl.innerHTML = socialData.icon;
          el.appendChild(aEl);
        });
    });
  }
  cleanup() {
    document.querySelectorAll("[data-footer-links]").forEach((el) => {
      el.innerHTML = "";
    });
    this.config = null;
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