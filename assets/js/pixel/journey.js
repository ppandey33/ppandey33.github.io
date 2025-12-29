class Journey {
  constructor() {
    this.experience = null;
  }
  async init() {
    await this.loadExperience();
  }
  async loadExperience() {
    this.experience = await window.App.modules.apiClient.loadJSON("/data/experience.json");
    if (!this.experience) return;
    const container = document.querySelector("[data-experience]");
    if (!container) return;
    container.innerHTML = "";
    this.experience.forEach((exp) => {
      const item = this.createExperienceItem(exp);
      container.appendChild(item);
    });
  }
  createExperienceItem(exp) {
    const item = window.App.modules.util.createElement("div", "experience-item");
    const headerContainer = window.App.modules.util.createElement("div", "experience-header-container");
    const header = window.App.modules.util.createElement("div", "experience-header");
    const title = window.App.modules.util.createElement("h4", "experience-title", exp.position);
    const company = window.App.modules.util.createElement("div", "experience-company", exp.company);
    header.appendChild(title);
    header.appendChild(company);
    headerContainer.appendChild(header);
    const meta = window.App.modules.util.createElement("div", "experience-meta");
    const period = window.App.modules.util.createElement("span", "experience-period", exp.period);
    const location = window.App.modules.util.createElement("span", "experience-location", exp.location);
    meta.appendChild(period);
    meta.appendChild(location);
    headerContainer.appendChild(meta);
    item.appendChild(headerContainer);
    const description = window.App.modules.util.createElement("ul", "experience-description");
    exp.achievements.forEach((achievement) => {
      const li = window.App.modules.util.createElement("li", "experience-description-list", achievement);
      description.appendChild(li);
    });
    item.appendChild(description);
    if (exp.technologies && exp.technologies.length > 0) {
      const tech = window.App.modules.util.createElement("div", "experience-tech");
      exp.technologies.forEach((t) => {
        const badge = window.App.modules.util.createElement("span", "tech-badge", t);
        tech.appendChild(badge);
      });
      item.appendChild(tech);
    }
    return item;
  }
  cleanup() {
    const container = document.querySelector("[data-experience]");
    if (container) container.innerHTML = "";
    this.experience = null;
  }
}
function initJourney() {
  if (window.App?.modules?.journey) {
    window.App.modules.journey.cleanup?.();
  }
  const journeyModule = new Journey();
  window.App.register("journey", journeyModule, 'initJourney');
  journeyModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJourney);
} else {
  initJourney();
}
export { Journey, initJourney };
