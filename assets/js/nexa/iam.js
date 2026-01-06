import { PrepDoc } from "../prep-doc.js";
class Iam {
  constructor() {
    this.docGenerator = new PrepDoc();
  }
  async init() {
    await this.loadSiteConfig();
    await this.renderButtons();
  }
  async loadSiteConfig() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    const iamElements = document.querySelectorAll("[data-iam]");
    if (!iamElements.length || !this.config?.hero) return;
    iamElements.forEach((el) => {
      const prop = el.getAttribute("data-iam");
      if (prop && this.config.hero[prop]) {
        el.textContent = this.config.hero[prop];
      }
    });
  }
  async renderButtons() {
    const placeholders = document.querySelectorAll("[data-btn-placeholder]");
    placeholders.forEach((placeholder) => {
      const buttons = this.config?.hero?.buttons || [];
      const btnIndices = (placeholder.getAttribute("data-blog-share") || [...Array(buttons.length).keys()].join(",")).split(",").map(Number);
      const type = placeholder.getAttribute("type") || "icon";
      const btnContainer = window.App.modules.util.createElement("div");
      btnContainer.className = "btn-container";
      btnIndices.forEach((index) => {
        if (buttons[index]) {
          const button = buttons[index];
          if (button.child && button.child.length > 0) {
            const dropdownWrapper = window.App.modules.util.createDropdownButton(button, type);
            const mainBtn = dropdownWrapper && dropdownWrapper.querySelector("[data-selected-value]");
            if (mainBtn) {
              const mainBtnHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const selectedValue = e.target.getAttribute("data-selected-value");
                if (selectedValue) {
                  this.handleButtonAction(button.rel, selectedValue);
                }
              };
              mainBtn.addEventListener("click", mainBtnHandler);
              btnContainer.appendChild(dropdownWrapper);
            }
          } else {
            const btn = window.App.modules.util.createSimpleButton(button, type);
            if (!btn?.url) {
              btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleButtonAction(button.rel);
              });
            }
            btnContainer.appendChild(btn);
          }
        }
      });
      placeholder.parentNode.replaceChild(btnContainer, placeholder);
    });
  }
  async handleButtonAction(rel, childText) {
    switch (rel) {
      case "portfolio":
        window.App.modules.util.share("Share Portfolio");
        break;
      case "resume":
        await this.downloadResume(childText);
        break;
      default:
    }
  }
  async downloadResume(format) {
    try {
      const resumeData = await window.App.modules.apiClient.loadJSON("/data/resume-data.json");
      this.docGenerator.generate(resumeData, format);
    } catch (error) {
      console.error("Error loading resume data:", error);
      alert("Failed to generate resume. Please try again.");
    }
  }
  cleanup() {
    const btnContainers = document.querySelectorAll(".btn-container");
    btnContainers.forEach((container) => {
      container.remove();
    });
    this.config = null;
    const iamElements = document.querySelectorAll("[data-iam]");
    iamElements.forEach((el) => (el.textContent = ""));
  }
}
function initIam() {
  if (window.App?.modules?.iam) {
    window.App.modules.iam.cleanup?.();
  }
  const iamModule = new Iam();
  window.App.register("iam", iamModule, "initIam");
  iamModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIam);
} else {
  initIam();
}
export { Iam, initIam };
