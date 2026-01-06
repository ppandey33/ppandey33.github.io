import { PrepDoc } from "../prep-doc.js";
class Iam {
  constructor() {
    this.decorativeShapes = null;
    this.shapes = [];
    this.mouseMoveHandler = null;
    this.mouseLeaveHandler = null;
    this.docGenerator = new PrepDoc();
  }
  async init() {
    await this.loadSiteConfig();
    await this.renderButtons();
    this.initDecorativeShapes();
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
  initDecorativeShapes() {
    this.decorativeShapes = document.querySelector("[data-bg-hover]");
    if (!this.decorativeShapes) return;
    this.shapes = Array.from(this.decorativeShapes.querySelectorAll(".shape"));
    this.shapes.forEach((shape) => {
      shape.style.opacity = "0.6";
      shape.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    });
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseLeaveHandler = this.handleMouseLeave.bind(this);
    this.decorativeShapes.addEventListener("mousemove", this.mouseMoveHandler);
    this.decorativeShapes.addEventListener("mouseleave", this.mouseLeaveHandler);
  }
  handleMouseMove(e) {
    if (!this.decorativeShapes || !this.shapes.length) return;
    const containerRect = this.decorativeShapes.getBoundingClientRect();
    const isInViewport = containerRect.top < window.innerHeight && containerRect.bottom > 0 && containerRect.left < window.innerWidth && containerRect.right > 0;
    if (!isInViewport) return;
    if (containerRect.width === 0 || containerRect.height === 0) return;
    const rect = this.decorativeShapes.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    this.shapes.forEach((shape, index) => {
      const deltaX = (mouseX - centerX) / centerX;
      const deltaY = (mouseY - centerY) / centerY;
      const intensity = (index + 1) * 5;
      const moveX = deltaX * intensity;
      const moveY = deltaY * intensity;
      shape.style.transform = `translate(${moveX}px, ${moveY}px) ${this.getShapeTransform(shape)}`;
      shape.style.opacity = "1";
    });
  }
  handleMouseLeave() {
    if (!this.shapes.length) return;
    this.shapes.forEach((shape) => {
      shape.style.transform = this.getShapeTransform(shape);
      shape.style.opacity = "0.6";
    });
  }
  getShapeTransform(shape) {
    if (shape.classList.contains("square")) return "rotate(30deg)";
    if (shape.classList.contains("parallelogram")) return "skew(130deg)";
    return "";
  }
  cleanup() {
    if (this.decorativeShapes) {
      if (this.mouseMoveHandler) {
        this.decorativeShapes.removeEventListener("mousemove", this.mouseMoveHandler);
      }
      if (this.mouseLeaveHandler) {
        this.decorativeShapes.removeEventListener("mouseleave", this.mouseLeaveHandler);
      }
    }
    this.shapes.forEach((shape) => {
      shape.style.transform = "";
      shape.style.opacity = "";
      shape.style.transition = "";
    });
    this.decorativeShapes = null;
    this.shapes = [];
    this.mouseMoveHandler = null;
    this.mouseLeaveHandler = null;
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
