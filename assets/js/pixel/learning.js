class Learning {
  constructor() {
    this.education = null;
  }
  async init() {
    await this.loadEducation();
  }
  async loadEducation() {
    this.education = await window.App.modules.apiClient.loadJSON("/data/education.json");
    if (!this.education) return;
    const container = document.querySelector("[data-education]");
    if (!container) return;
    container.innerHTML = "";
    this.education.forEach((edu) => {
      const item = this.createEducationItem(edu);
      container.appendChild(item);
    });
  }
  createEducationItem(edu) {
    const item = window.App.modules.util.createElement("div", "education-item");
    const shimEl = window.App.modules.util.createElement("div", "shimmer-overlay");
    const iconEl = window.App.modules.util.createElement("div", "education-watermark");
    item.appendChild(shimEl);
    item.appendChild(iconEl);
    const info = window.App.modules.util.createElement("div", "education-info");
    const degree = window.App.modules.util.createElement("h4", "education-degree", edu.degree);
    info.appendChild(degree);
    const institution = window.App.modules.util.createElement("div", "education-institution");
    institution.appendChild(this.getSpan(edu.institution))
    info.appendChild(institution);
    const meta = window.App.modules.util.createElement("div", "education-meta"),
      period = window.App.modules.util.createElement("span", "education-period"),
      score = window.App.modules.util.createElement("span", "education-score"),
      location = window.App.modules.util.createElement("span", "education-location");
    period.appendChild(this.getSpan(edu.period)), score.appendChild(this.getSpan(edu.score)), location.appendChild(this.getSpan(edu.location));
    meta.appendChild(period), meta.appendChild(score), info.appendChild(location);
    info.appendChild(meta), item.appendChild(info);
    return item;
  }
  getSpan(content) {
    return window.App.modules.util.createElement("div", "", content);
  }
  cleanup() {
    const container = document.querySelector("[data-education]");
    if (container) container.innerHTML = "";
    this.education = null;
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
