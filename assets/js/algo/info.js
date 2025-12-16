class Info {
  constructor() {
  }

  async init() {
    await this.loadSkills();
  }

  async loadSkills() {
    const data = await window.App.modules.apiClient.loadJSON("/data/skills.json");
    if (!data) return;
    const container = document.querySelector("[data-skills-info]");

    if (container) {
      container.innerHTML = "";
      data.forEach((skillsData) => {
        const categoryCard = window.App.modules.util.createElement("div", "skill-info-category"),
        cardHeader = window.App.modules.util.createElement("div", "skill-info-header"),
        categoryName = window.App.modules.util.createElement("h3", "skill-info-category-name", skillsData.category),
        catIcon = window.App.modules.util.createElement("span", `skill-info-category-icon ${(skillsData.class || '')}`);
        catIcon.innerHTML = skillsData.icon;
        cardHeader.appendChild(catIcon), cardHeader.appendChild(categoryName), categoryCard.appendChild(cardHeader);
        const skillList = window.App.modules.util.createElement("ul", "skill-info-list");
        skillsData.skills.forEach((skill) => {
          const skillItem = window.App.modules.util.createElement("li", "skill-info-item");
          const skillName = window.App.modules.util.createElement("span", "skill-info-name", skill.name);
          const skillLevel = window.App.modules.util.createElement(
            "span",
            `skill-info-level ${skill.level}`,
            skill.level?.replace(/\b\w/g, (char) => char.toUpperCase())
          );
          skillItem.appendChild(skillName);
          skillItem.appendChild(skillLevel);
          skillList.appendChild(skillItem);
        });

        categoryCard.appendChild(skillList);
        container.appendChild(categoryCard);
      });
    }
  }

  cleanup() {
    const container = document.querySelector("[data-skills-info]");
    if (container) container.innerHTML = "";
  }
}

function initInfo() {
  if (window.App?.modules?.info) {
    window.App.modules.info.cleanup?.();
  }
  const infoModule = new Info();
  window.App.register("info", infoModule, 'initInfo');
  infoModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInfo);
} else {
  initInfo();
}

export { Info, initInfo };
