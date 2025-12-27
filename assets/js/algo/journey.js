import { HideComponent } from "../hide-component.js";
import { onComponentLoaded, initPaginator } from "../paginator.js";

class Journey extends HideComponent {
  constructor() {
    super({ currentPath: "/journey" });
  }

  async init() {
    initPaginator('experience');
    await this.loadExperience();
  }

  async loadExperience() {
    const data = await window.App.modules.apiClient.loadJSON("/data/experience.json");
    if (!data) return;
    const container = document.querySelector("[data-experience]");

    if (container) {
      container.innerHTML = "";
      data.forEach((exp) => {
        const item = window.App.modules.util.createElement("div", "experience-item");
        const headerContainer = window.App.modules.util.createElement("div", "experience-header-container glass-card");
        const header = window.App.modules.util.createElement("div", "experience-header");
        const title = window.App.modules.util.createElement("h3", "experience-title", exp.position);
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
          description.appendChild(window.App.modules.util.createElement("li", "experience-description-list", achievement));
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

        container.appendChild(item);
      });
    }

    onComponentLoaded.next({
      id: "experience",
      onPageChange: (page) => {
      }
    });
    this.manageDOM();
  }

  cleanup() {
    const container = document.querySelector("[data-experience]");
    if (container) container.innerHTML = "";
  }
}

function initJourney() {
  if (window.App?.modules?.journey) {
    window.App.modules.journey.cleanup?.();
  }
  const journeyModule = new Journey();
  window.App.register("journey", journeyModule, "initJourney");
  journeyModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJourney);
} else {
  initJourney();
}

export { Journey, initJourney };
