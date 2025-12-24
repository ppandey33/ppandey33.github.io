class Info {
  constructor() {
    this.config = null;
  }

  async init() {
    await this.loadSkills();
    await this.updateSiteInfo();
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

  async updateSiteInfo() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config) return;

    document.querySelectorAll("[data-social]").forEach((el) => {
      el.innerHTML = "";
      this.config.social
        ?.filter((s) => s.url && s.url !== "")
        .forEach((socialData) => {
          const aEl = window.App.modules.util.createElement("a", `contact-social  ${(socialData?.class || '')}`);
          aEl.target = "_blank";
          aEl.href = socialData?.url;
          aEl.innerHTML = socialData.icon;
          el.appendChild(aEl);
        });
    });
  }

  cleanup() {
    const container = document.querySelector("[data-skills-info]");
    if (container) container.innerHTML = "";
    document.querySelectorAll("[data-social]").forEach((el) => {
      el.innerHTML = "";
    });
    this.config = null;
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
