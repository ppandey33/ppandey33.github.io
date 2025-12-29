class Stack {
  constructor() {
    this.skills = null;
  }
  async init() {
    await this.loadSkills();
  }
  async loadSkills() {
    this.skills = await window.App.modules.apiClient.loadJSON("/data/skills.json");
    if (!this.skills) return;
    const container = document.querySelector("[data-skills]");
    if (!container) return;
    this.skills.sort((a, b) => a.skills.length - b.skills.length);
    container.innerHTML = "";
    this.skills.forEach((skillsData) => {
      const skillCard = this.createSkillCard(skillsData);
      container.appendChild(skillCard);
    });
  }
  createSkillCard(skillsData) {
    const skillCard = window.App.modules.util.createElement("div", "skill-card"),
      icon = window.App.modules.util.createElement("div", `skill-cat-icon ${(skillsData?.class || '')}`);
    icon.innerHTML = skillsData.icon;
    skillCard.appendChild(icon);
    const categoryCard = window.App.modules.util.createElement("div", "skill-category zoom");
    const categoryName = window.App.modules.util.createElement("h4", "skill-category-name", skillsData.category);
    categoryCard.appendChild(categoryName);
    const skillList = window.App.modules.util.createElement("ul", "skill-list");
    skillsData.skills.sort((a, b) => b.name.localeCompare(a.name));
    skillsData.skills.forEach((skill) => {
      const skillItem = window.App.modules.util.createElement("li", "skill-item");
      const skillName = window.App.modules.util.createElement("span", "skill-name", skill.name);
      const skillLevel = window.App.modules.util.createElement(
        "span",
        `skill-level ${skill.level}`,
        skill.level?.replace(/\b\w/g, (char) => char.toUpperCase())
      );
      skillItem.appendChild(skillName);
      skillItem.appendChild(skillLevel);
      skillList.appendChild(skillItem);
    });
    categoryCard.appendChild(skillList);
    skillCard.appendChild(categoryCard);
    return skillCard;
  }
  cleanup() {
    const container = document.querySelector("[data-skills]");
    if (container) container.innerHTML = "";
    this.skills = null;
  }
}
function initStack() {
  if (window.App?.modules?.stack) {
    window.App.modules.stack.cleanup?.();
  }
  const stackModule = new Stack();
  window.App.register("stack", stackModule, "initStack");
  stackModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStack);
} else {
  initStack();
}
export { Stack, initStack };
