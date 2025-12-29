import { HideComponent } from "../hide-component.js";
class Learning extends HideComponent {
  constructor() {
    super({ currentPath: "/learning" });
  }
  async init() {
    await this.loadEducation();
  }
  async loadEducation() {
    const data = await window.App.modules.apiClient.loadJSON("/data/education.json");
    if (!data) return;
    const container = document.querySelector("[data-education]");
    if (container) {
      container.innerHTML = "";
      data.forEach((edu, index) => {
        const item = window.App.modules.util.createElement("div", `education-item ${index === 0 || index % 2 === 0 ? "fade-left" : "fade-right"}`);
        const degree = window.App.modules.util.createElement("h3", "education-degree glass-card", edu.degree);
        item.appendChild(degree);
        const info = window.App.modules.util.createElement("div", "education-info");
        const institution = window.App.modules.util.createElement("div", "education-institution");
        institution.appendChild(this.getSpan(edu.institution));
        info.appendChild(institution);
        const meta = window.App.modules.util.createElement("div", "education-meta"),
          period = window.App.modules.util.createElement("span", "education-period"),
          score = window.App.modules.util.createElement("span", "education-score"),
          location = window.App.modules.util.createElement("span", "education-location");
        period.appendChild(this.getSpan(edu.period)), score.appendChild(this.getSpan(edu.score)), location.appendChild(this.getSpan(edu.location));
        meta.appendChild(period), meta.appendChild(score), info.appendChild(location);
        info.appendChild(meta), item.appendChild(info);
        container.appendChild(item);
      });
    }
    this.manageDOM();
  }
  getSpan(content) {
    return window.App.modules.util.createElement("div", "", content);
  }
  cleanup() {
    const container = document.querySelector("[data-education]");
    if (container) container.innerHTML = "";
  }
}
function initLearning() {
  if (window.App?.modules?.learning) {
    window.App.modules.learning.cleanup?.();
  }
  const learningModule = new Learning();
  window.App.register("learning", learningModule, "initLearning");
  learningModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLearning);
} else {
  initLearning();
}
export { Learning, initLearning };
