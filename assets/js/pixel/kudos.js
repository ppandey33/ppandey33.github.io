class Kudos {
  constructor() {
    this.achievements = null;
  }
  async init() {
    await this.loadAchievements();
  }
  async loadAchievements() {
    this.achievements = await window.App.modules.apiClient.loadJSON("/data/achievements.json");
    if (!this.achievements) return;
    const container = document.querySelector("[data-achievements]");
    if (!container) return;
    container.innerHTML = "";
    this.achievements.forEach((achievement) => {
      const card = this.createAchievementCard(achievement);
      container.appendChild(card);
    });
  }
  createAchievementCard(achievement) {
    const card = window.App.modules.util.createElement("div", "achievement-item"),
      icon = window.App.modules.util.createElement("span", `achievement-icon ${achievement?.class || ""}`),
      title = window.App.modules.util.createElement("h3", "achievement-title", achievement.title),
      description = window.App.modules.util.createElement("p", "achievement-description", achievement.description);
    icon.innerHTML = achievement.icon;
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(description);
    return card;
  }
  cleanup() {
    const container = document.querySelector("[data-achievements]");
    if (container) container.innerHTML = "";
    this.achievements = null;
  }
}
function initKudos() {
  if (window.App?.modules?.kudos) {
    window.App.modules.kudos.cleanup?.();
  }
  const kudosModule = new Kudos();
  window.App.register("kudos", kudosModule, "initKudos");
  kudosModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initKudos);
} else {
  initKudos();
}
export { Kudos, initKudos };
