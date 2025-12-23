class Iam {
  constructor() {
    this.decorativeShapes = null;
    this.shapes = [];
    this.mouseMoveHandler = null;
    this.mouseLeaveHandler = null;
  }

  async init() {
    await this.loadSiteConfig();
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
