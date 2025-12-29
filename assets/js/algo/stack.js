import { HideComponent } from "../hide-component.js";
class Stack extends HideComponent {
  constructor() {
    super({ currentPath: "/stack" });
  }
  async init() {
    await this.loadSkills();
  }
  async loadSkills() {
    const data = await window.App.modules.apiClient.loadJSON("/data/skills.json");
    if (!data) return;
    const container = document.querySelector("[data-skills]");
    if (container) {
      container.innerHTML = "";
      data.forEach((skillsData) => {
        const categoryCard = window.App.modules.util.createElement("div", "skill-category");
        const categoryName = window.App.modules.util.createElement("h3", "skill-category-name", skillsData.category);
        categoryCard.appendChild(categoryName);
        const skillList = window.App.modules.util.createElement("ul", "skill-list");
        skillsData.skills.forEach((skill) => {
          const skillItem = window.App.modules.util.createElement("li", "skill-item");
          const skillName = window.App.modules.util.createElement("span", "skill-name", skill.name);
          const skillLevel = window.App.modules.util.createElement(
            "span",
            `skill-level ${skill.level}`,
            skill.level?.replace(/\b\w/g, (char) => char.toUpperCase())
          );
          skillLevel.setAttribute("data-enable-current", "");
          skillItem.appendChild(skillName);
          skillItem.appendChild(skillLevel);
          skillList.appendChild(skillItem);
        });
        categoryCard.appendChild(skillList);
        container.appendChild(categoryCard);
      });
    }
    this.manageDOM();
  }
  cleanup() {
    const container = document.querySelector("[data-skills]");
    if (container) container.innerHTML = "";
  }
}
function initStack() {
  if (window.App?.modules?.stack) {
    window.App.modules.stack.cleanup?.();
  }
  const stackModule = new Stack();
  window.App.register("stack", stackModule, 'initStack');
  stackModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStack);
} else {
  initStack();
}
export { Stack, initStack };
