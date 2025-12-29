import { Observable } from "./observable.js";
const onComponentLoaded = new Observable();
class Paginator {
  constructor() {
    this.instances = new Map();
    this.subscription = null;
  }
  create(config) {
    if (!config.id) {
      console.error("Paginator config must include an id");
      return false;
    }
    const id = config.id;
    if (this.instances.has(id)) {
      this.cleanupInstance(id);
    }
    const instance = {
      type: config.type || "slider",
      id: id,
      mode: config.mode || "client",
      containerSelector: config.containerSelector || `.${id}-track`,
      itemSelector: config.itemSelector || `.${id}-item`,
      paginationSelector: config.paginationSelector || `[data-${id}-pager]`,
      itemsPerPage: config.itemsPerPage || 1,
      currentPage: config.currentPage || 1,
      totalItems: config.totalItems || 0,
      cssClasses: {
        prevBtn: config.cssClasses?.prevBtn || "pager-btn",
        nextBtn: config.cssClasses?.nextBtn || "pager-btn",
        indicator: config.cssClasses?.indicator || "pager-indicator",
        pageInfo: config.cssClasses?.pageInfo || "pager-info",
        disabled: config.cssClasses?.disabled || "disabled",
        active: config.cssClasses?.active || "active",
        ...config.cssClasses,
      },
      onPageChange: config.onPageChange || (() => {}),
      onInit: config.onInit || (() => {}),
      container: null,
      items: [],
      totalPages: 0,
      initialized: false,
      handlers: {
        resize: null,
        prevBtns: [],
        nextBtns: [],
        indicators: [],
      },
      paginationContainers: [],
    };
    this.instances.set(id, instance);
    return this.initInstance(id);
  }
  initInstance(id) {
    const instance = this.instances.get(id);
    if (!instance) return false;
    if (instance.mode === "server") {
      instance.totalPages = Math.ceil(instance.totalItems / instance.itemsPerPage);
      this.renderPaginationControls(id);
      instance.initialized = true;
      instance.onInit();
      return true;
    }
    instance.container = document.querySelector(instance.containerSelector);
    if (!instance.container) {
      console.warn(`Container not found: ${instance.containerSelector}`);
      return false;
    }
    instance.items = Array.from(document.querySelectorAll(instance.itemSelector));
    if (!instance.items.length) {
      console.warn(`No items found: ${instance.itemSelector}`);
      return false;
    }
    instance.totalItems = instance.items.length;
    instance.totalPages = Math.ceil(instance.totalItems / instance.itemsPerPage);
    if (instance.type === "slider") {
      this.initSlider(id);
    } else {
      this.initPagination(id);
    }
    instance.initialized = true;
    instance.onInit();
    return true;
  }
  initSlider(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.handlers.resize = () => this.updateSlider(id);
    window.addEventListener("resize", instance.handlers.resize);
    this.renderPaginationControls(id);
    this.updateSlider(id);
  }
  initPagination(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    this.renderPaginationControls(id);
    if (instance.mode === "client") {
      this.updatePagination(id);
    }
  }
  renderPaginationControls(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.paginationContainers = Array.from(document.querySelectorAll(instance.paginationSelector));
    if (!instance.paginationContainers.length) return;
    this.clearHandlers(id);
    instance.paginationContainers.forEach((paginationContainer) => {
      paginationContainer.innerHTML = "";
      if (instance.totalPages <= 1) return;
      const prevBtn = window.App.modules.util.createElement("button", `${instance.cssClasses.prevBtn} ${instance.currentPage === 1 ? instance.cssClasses.disabled : ""}`, "‹");
      prevBtn.setAttribute(`data-${id}-prev`, "");
      prevBtn.disabled = instance.currentPage === 1;
      prevBtn.setAttribute("aria-label", "Previous page");
      const prevHandler = () => this.goToPrevious(id);
      prevBtn.addEventListener("click", prevHandler);
      instance.handlers.prevBtns.push({ btn: prevBtn, handler: prevHandler });
      paginationContainer.appendChild(prevBtn);
      for (let i = 1; i <= instance.totalPages; i++) {
        const indicator = window.App.modules.util.createElement("button", `${instance.cssClasses.indicator} ${i === instance.currentPage ? instance.cssClasses.active : ""}`);
        indicator.setAttribute(`data-${id}-indi`, i);
        indicator.setAttribute("aria-label", `Page ${i}`);
        const indicatorHandler = () => this.goToPage(id, i);
        indicator.addEventListener("click", indicatorHandler);
        instance.handlers.indicators.push({ btn: indicator, handler: indicatorHandler });
        paginationContainer.appendChild(indicator);
      }
      const pageInfo = window.App.modules.util.createElement("div", instance.cssClasses.pageInfo);
      pageInfo.setAttribute(`data-${id}-info`, "");
      pageInfo.innerHTML = `<span>${instance.currentPage}</span> / <span>${instance.totalPages}</span>`;
      paginationContainer.appendChild(pageInfo);
      const nextBtn = window.App.modules.util.createElement("button", `${instance.cssClasses.nextBtn} ${instance.currentPage === instance.totalPages ? instance.cssClasses.disabled : ""}`, "›");
      nextBtn.setAttribute(`data-${id}-next`, "");
      nextBtn.disabled = instance.currentPage === instance.totalPages;
      nextBtn.setAttribute("aria-label", "Next page");
      const nextHandler = () => this.goToNext(id);
      nextBtn.addEventListener("click", nextHandler);
      instance.handlers.nextBtns.push({ btn: nextBtn, handler: nextHandler });
      paginationContainer.appendChild(nextBtn);
    });
  }
  updateSlider(id) {
    const instance = this.instances.get(id);
    if (!instance || !instance.container || !instance.initialized) return;
    const trackStyles = window.getComputedStyle(instance.container);
    const gap = parseFloat(trackStyles.gap) || 0;
    let offset = 0;
    for (let i = 0; i < instance.currentPage - 1; i++) {
      offset += instance.items[i].offsetWidth + gap;
    }
    instance.container.style.transform = `translateX(-${offset}px)`;
    this.updatePaginationState(id);
  }
  updatePagination(id) {
    const instance = this.instances.get(id);
    if (!instance || !instance.initialized) return;
    if (instance.mode === "client") {
      instance.items.forEach((item) => {
        item.style.display = "none";
      });
      const startIndex = (instance.currentPage - 1) * instance.itemsPerPage;
      const endIndex = Math.min(startIndex + instance.itemsPerPage, instance.items.length);
      for (let i = startIndex; i < endIndex; i++) {
        instance.items[i].style.display = "";
      }
    }
    this.updatePaginationState(id);
  }
  updatePaginationState(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.paginationContainers.forEach((container) => {
      const indicators = container.querySelectorAll(`[data-${id}-indi]`);
      indicators.forEach((indicator) => {
        const page = parseInt(indicator.getAttribute(`data-${id}-indi`));
        indicator.classList.toggle(instance.cssClasses.active, page === instance.currentPage);
      });
      const prevBtns = container.querySelectorAll(`[data-${id}-prev]`);
      prevBtns.forEach((btn) => {
        btn.disabled = instance.currentPage === 1;
        btn.classList.toggle(instance.cssClasses.disabled, instance.currentPage === 1);
      });
      const nextBtns = container.querySelectorAll(`[data-${id}-next]`);
      nextBtns.forEach((btn) => {
        btn.disabled = instance.currentPage === instance.totalPages;
        btn.classList.toggle(instance.cssClasses.disabled, instance.currentPage === instance.totalPages);
      });
      const pageInfos = container.querySelectorAll(`[data-${id}-info]`);
      pageInfos.forEach((info) => {
        info.innerHTML = `<span>${instance.currentPage}</span> / <span>${instance.totalPages}</span>`;
      });
    });
  }
  goToPage(id, pageNumber) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (pageNumber < 1 || pageNumber > instance.totalPages || pageNumber === instance.currentPage) return;
    instance.currentPage = pageNumber;
    if (instance.mode === "server") {
      this.updatePaginationState(id);
      instance.onPageChange(instance.currentPage);
      return;
    }
    if (instance.type === "slider") {
      this.updateSlider(id);
    } else {
      this.updatePagination(id);
    }
    instance.onPageChange(instance.currentPage);
  }
  goToNext(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (instance.currentPage < instance.totalPages) {
      this.goToPage(id, instance.currentPage + 1);
    }
  }
  goToPrevious(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (instance.currentPage > 1) {
      this.goToPage(id, instance.currentPage - 1);
    }
  }
  updateItems(id, newItems) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (instance.mode === "server") {
      console.warn("updateItems() is for client-side mode. Use updateTotalItems() for server-side.");
      return;
    }
    instance.items = newItems;
    instance.totalItems = newItems.length;
    instance.totalPages = Math.ceil(instance.totalItems / instance.itemsPerPage);
    instance.currentPage = Math.min(instance.currentPage, instance.totalPages || 1);
    this.renderPaginationControls(id);
    if (instance.type === "slider") {
      this.updateSlider(id);
    } else {
      this.updatePagination(id);
    }
  }
  updateTotalItems(id, newTotalItems) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (instance.mode === "client") {
      console.warn("updateTotalItems() is for server-side mode. Use updateItems() for client-side.");
      return;
    }
    instance.totalItems = newTotalItems;
    instance.totalPages = Math.ceil(instance.totalItems / instance.itemsPerPage);
    instance.currentPage = Math.min(instance.currentPage, instance.totalPages || 1);
    this.renderPaginationControls(id);
    this.updatePaginationState(id);
  }
  getPaginationInfo(id) {
    const instance = this.instances.get(id);
    if (!instance) return null;
    return {
      currentPage: instance.currentPage,
      itemsPerPage: instance.itemsPerPage,
      totalPages: instance.totalPages,
      totalItems: instance.totalItems,
      startIndex: (instance.currentPage - 1) * instance.itemsPerPage,
      endIndex: Math.min(instance.currentPage * instance.itemsPerPage, instance.totalItems),
    };
  }
  clearHandlers(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.handlers.prevBtns.forEach(({ btn, handler }) => {
      if (btn) btn.removeEventListener("click", handler);
    });
    instance.handlers.nextBtns.forEach(({ btn, handler }) => {
      if (btn) btn.removeEventListener("click", handler);
    });
    instance.handlers.indicators.forEach(({ btn, handler }) => {
      if (btn) btn.removeEventListener("click", handler);
    });
    instance.handlers.prevBtns = [];
    instance.handlers.nextBtns = [];
    instance.handlers.indicators = [];
  }
  cleanupInstance(id) {
    const instance = this.instances.get(id);
    if (!instance) return;
    if (instance.handlers.resize) {
      window.removeEventListener("resize", instance.handlers.resize);
      instance.handlers.resize = null;
    }
    this.clearHandlers(id);
    instance.paginationContainers.forEach((container) => {
      if (container) {
        container.innerHTML = "";
      }
    });
    if (instance.container && instance.type === "slider") {
      instance.container.style.transform = "";
    }
    if (instance.items && instance.type === "pagination" && instance.mode === "client") {
      instance.items.forEach((item) => {
        if (item) item.style.display = "";
      });
    }
    this.instances.delete(id);
  }
  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.instances.forEach((instance, id) => {
      this.cleanupInstance(id);
    });
    this.instances.clear();
  }
  subscribeLoad() {
    this.subscription = onComponentLoaded.subscribe({
      next: (value) => {
        if (value.id) {
          this.create(value);
        }
      },
      error: (err) => console.error("Pager initialization error:", err),
      complete: () => console.log(""),
    });
  }
}
function initPaginator(id = null) {
  if (id && window.App?.modules?.pager) {
    window.App?.modules?.pager.clearHandlers?.(id);
  } else if (window.App?.modules?.pager) {
    window.App.modules.pager.cleanup?.();
  }
  const pagerModule = new Paginator();
  window.App.register("pager", pagerModule, "initPaginator");
  pagerModule.subscribeLoad();
}
export { Paginator, initPaginator, onComponentLoaded };
