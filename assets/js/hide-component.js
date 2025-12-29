class HideComponent {
  constructor(options = {}) {
    this.options = options;
  }
  get isHome() {
    return !window.location.pathname.includes(this.options?.currentPath || "");
  }
  get currentBlock() {
    const currentBlockEl = document.querySelector(`section[id="${(this.options?.currentPath || "").replace(/^\//, "")}"]`);
    return (currentBlockEl || document.documentElement);
  }
  async manageDOM(options) {
    if (this.isHome) {
      await this.disableNonCurrent();
      await this.applyClassNonCurrent();
      await this.removeClassNonCurrent();
      await this.applyStyleNonCurrent();
      await this.removeStyleNonCurrent();
    } else {
      await this.disableCurrent();
      await this.applyClassCurrent();
      await this.removeClassCurrent();
      await this.applyStyleCurrent();
      await this.removeStyleCurrent();
    }
  }
  async disableCurrent() {
    if (this.isHome) return;
    const disableLinks = this.currentBlock.querySelectorAll("[data-disable-current]");
    disableLinks.forEach((link) => link.remove());
  }
  async disableNonCurrent() {
    if (!this.isHome) return;
    const enableLinks = this.currentBlock.querySelectorAll("[data-enable-current]");
    enableLinks.forEach((link) => link.remove());
  }
  async applyClassCurrent() {
    if (this.isHome) return;
    const cEl = this.currentBlock.querySelectorAll("[data-apply-current-class]");
    cEl.forEach((el) => {
      const value = el.getAttribute("data-apply-current-class");
      value && el.classList.add(...value.split(" "));
    });
  }
  async applyClassNonCurrent() {
    if (!this.isHome) return;
    const cEl = this.currentBlock.querySelectorAll("[data-apply-noncurrent-class]");
    cEl.forEach((el) => {
      const value = el.getAttribute("data-apply-noncurrent-class");
      value && el.classList.add(...value.split(" "));
    });
  }
  async removeClassCurrent() {
    if (this.isHome) return;
    const rCel = this.currentBlock.querySelectorAll("[data-remove-current-class]");
    rCel.forEach((el) => {
      const value = el.getAttribute("data-remove-current-class");
      value && el.classList.remove(...value.split(" "));
    });
  }
  async removeClassNonCurrent() {
    if (!this.isHome) return;
    const rCel = this.currentBlock.querySelectorAll("[data-remove-noncurrent-class]");
    rCel.forEach((el) => {
      const value = el.getAttribute("data-remove-noncurrent-class");
      value && el.classList.remove(...value.split(" "));
    });
  }
  async applyStyleCurrent() {
    if (this.isHome) return;
    const elements = this.currentBlock.querySelectorAll("[data-apply-current-style]");
    elements.forEach((el) => {
      const styleString = el.getAttribute("data-apply-current-style");
      if (!styleString) return;
      styleString.split(";").forEach((rule) => {
        const [property, value] = rule.split(":").map((s) => s?.trim());
        if (property && value) {
          el.style[property] = value;
        }
      });
    });
  }
  async applyStyleNonCurrent() {
    if (!this.isHome) return;
    const elements = this.currentBlock.querySelectorAll("[data-apply-noncurrent-style]");
    elements.forEach((el) => {
      const styleString = el.getAttribute("data-apply-noncurrent-style");
      if (!styleString) return;
      styleString.split(";").forEach((rule) => {
        const [property, value] = rule.split(":").map((s) => s?.trim());
        if (property && value) {
          el.style[property] = value;
        }
      });
    });
  }
  async removeStyleCurrent() {
    if (this.isHome) return;
    const elements = this.currentBlock.querySelectorAll("[data-remove-current-style]");
    elements.forEach((el) => {
      const props = el.getAttribute("data-remove-current-style");
      if (!props) return;
      props.split(";").forEach((property) => {
        property = property.trim();
        if (property) {
          el.style[property] = "";
        }
      });
    });
  }
  async removeStyleNonCurrent() {
    if (!this.isHome) return;
    const elements = this.currentBlock.querySelectorAll("[data-remove-noncurrent-style]");
    elements.forEach((el) => {
      const props = el.getAttribute("data-remove-current-style");
      if (!props) return;
      props.split(";").forEach((property) => {
        property = property.trim();
        if (property) {
          el.style[property] = "";
        }
      });
    });
  }
  cleanup() {
  }
}
function initHideComponent(options = {}) {
  if (window.App?.modules?.hideComp) {
    window.App.modules.hideComp.cleanup?.();
  }
  const hideCompModule = new HideComponent(options);
  window.App.register("hideComp", hideCompModule, "initHideComponent");
  return hideCompModule;
}
export { HideComponent, initHideComponent };
