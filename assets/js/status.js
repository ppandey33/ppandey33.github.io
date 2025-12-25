import { Device } from "./device.js";

class Status extends Device {
  constructor() {
    super();
    this.activeDropdown = null;
    this.networkContainer = document.querySelector("[data-status-network]");
    this.batteryContainer = document.querySelector("[data-status-battery]");
    this.eventHandlers = {
      networkClick: null,
      batteryClick: null,
      documentClick: null,
    };
    this.updateInterval = null;
    this.submenuPlaceholder = null;
    this.networkOriginalParent = null;
    this.batteryOriginalParent = null;
    this.resizeHandler = null;
    this.scrollHandler = null;
  }

  initComponents() {
    this.batteryFill = this.batteryContainer.querySelector(".battery-fill");
    this.networkBars = this.networkContainer.querySelectorAll(".network-bar");
    this.networkDropdown = this.networkContainer.querySelector(".dropdown");
    this.batteryDropdown = this.batteryContainer.querySelector(".dropdown");

    this.networkOriginalParent = this.networkDropdown.parentElement;
    this.batteryOriginalParent = this.batteryDropdown.parentElement;

    this.submenuPlaceholder = document.querySelector("[data-submenu-item]");

    if (this.submenuPlaceholder) {
      this.resizeHandler = () => this.positionActiveSubmenu();
      this.scrollHandler = () => this.positionActiveSubmenu();
      window.addEventListener("resize", this.resizeHandler);
      window.addEventListener("scroll", this.scrollHandler, true);
    }
  }

  positionSubmenu(trigger, submenu) {
    if (!this.submenuPlaceholder || !submenu.classList.contains("show")) return;

    const triggerRect = trigger.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const triggerStyle = window.getComputedStyle(trigger);
    const submenuStyle = window.getComputedStyle(submenu);

    const triggerMargin = {
      top: parseFloat(triggerStyle.marginTop) || 0,
      right: parseFloat(triggerStyle.marginRight) || 0,
      bottom: parseFloat(triggerStyle.marginBottom) || 0,
      left: parseFloat(triggerStyle.marginLeft) || 0,
    };

    const submenuMargin = {
      top: parseFloat(submenuStyle.marginTop) || 0,
      right: parseFloat(submenuStyle.marginRight) || 0,
      bottom: parseFloat(submenuStyle.marginBottom) || 0,
      left: parseFloat(submenuStyle.marginLeft) || 0,
    };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const viewportMargin = 16;
    if (submenu.parentElement !== this.submenuPlaceholder) {
      this.submenuPlaceholder.appendChild(submenu);
    }

    submenu.style.position = "fixed";
    submenu.style.zIndex = "9999";
    let left = triggerRect.right + triggerMargin.right + gap - submenuMargin.left;
    if (left + submenuRect.width + submenuMargin.right > viewportWidth - viewportMargin) {
      left = triggerRect.left - triggerMargin.left - gap - submenuRect.width - submenuMargin.right;
      if (left < viewportMargin) {
        left = viewportWidth - submenuRect.width - submenuMargin.right - viewportMargin;
      }
    }
    let top = triggerRect.top - triggerMargin.top - submenuMargin.top;
    if (top + submenuRect.height + submenuMargin.bottom > viewportHeight - viewportMargin) {
      top = triggerRect.bottom + triggerMargin.bottom - submenuRect.height + submenuMargin.top;
      if (top < viewportMargin) {
        top = viewportHeight - submenuRect.height - submenuMargin.bottom - viewportMargin;
      }
    }
    left = Math.max(viewportMargin, Math.min(left, viewportWidth - submenuRect.width - submenuMargin.right - viewportMargin));
    top = Math.max(viewportMargin, Math.min(top, viewportHeight - submenuRect.height - submenuMargin.bottom - viewportMargin));

    submenu.style.left = `${left}px`;
    submenu.style.top = `${top}px`;
  }

  positionActiveSubmenu() {
    if (this.activeDropdown === "network") {
      this.positionSubmenu(this.networkContainer, this.networkDropdown);
    } else if (this.activeDropdown === "battery") {
      this.positionSubmenu(this.batteryContainer, this.batteryDropdown);
    }
  }

  generateNetworkUI() {
    const icon = this.createNetworkIcon();
    const spanEl = window.App.modules.util.createElement("span", "toggle");
    spanEl.appendChild(icon);
    this.networkContainer.appendChild(spanEl);
    const dropdown = this.createDropdown("network", {
      icon: "&#xf012;",
      class: 'fa',
      title: "Network Status",
      subtitle: "Checking...",
    });
    this.networkContainer.appendChild(dropdown);
    const body = dropdown.querySelector('[data-dropdown-body="network"]');
    body.appendChild(this.createStatRow("Status", "--", "networkStatus"));
    body.appendChild(this.createStatRow("Connection Type", "--", "networkType"));
    body.appendChild(this.createStatRow("Speed", "--", "networkSpeed"));
    body.appendChild(this.createStatRow("Latency", "--", "networkLatency"));
    const qualityRow = window.App.modules.util.createElement("div", "stat-row"),
      childSpan = window.App.modules.util.createElement("span", "stat-label", "Quality");
    qualityRow.appendChild(childSpan);
    qualityRow.appendChild(this.createQualityBadge("networkQuality"));
    body.appendChild(qualityRow);
  }

  generateBatteryUI() {
    const icon = this.createBatteryIcon();
    const spanEl = window.App.modules.util.createElement("span", "toggle");
    spanEl.appendChild(icon);
    this.batteryContainer.appendChild(spanEl);
    const dropdown = this.createDropdown("battery", {
      icon: "&#xf240;",
      class: "fa",
      title: "Battery Status",
      subtitle: "Checking...",
    });
    this.batteryContainer.appendChild(dropdown);
    const body = dropdown.querySelector('[data-dropdown-body="battery"]');
    body.appendChild(this.createStatRow("Level", "--", "batteryLevel"));
    body.appendChild(this.createProgressBar("batteryProgress"));
    body.appendChild(this.createStatRow("Status", "--", "batteryChargingStatus"));
    body.appendChild(this.createStatRow("Time Remaining", "--", "batteryTime"));
    const qualityRow = window.App.modules.util.createElement("div", "stat-row"),
      healthLabel = window.App.modules.util.createElement("span", "stat-label", "Health");
    qualityRow.appendChild(healthLabel);
    qualityRow.appendChild(this.createQualityBadge("batteryQuality"));
    body.appendChild(qualityRow);
  }

  initEventListeners() {
    this.eventHandlers.networkClick = (e) => {
      this.toggleDropdown("network");
    };
    this.eventHandlers.batteryClick = (e) => {
      this.toggleDropdown("battery");
    };
    this.eventHandlers.documentClick = (e) => {
      if (!this.networkContainer.contains(e.target) && !this.batteryContainer.contains(e.target) && !this.networkDropdown.contains(e.target) && !this.batteryDropdown.contains(e.target)) {
        this.closeAllDropdowns();
      }
    };
    this.networkContainer.addEventListener("click", this.eventHandlers.networkClick);
    this.batteryContainer.addEventListener("click", this.eventHandlers.batteryClick);
    document.addEventListener("click", this.eventHandlers.documentClick);
  }

  toggleDropdown(type) {
    if (this.activeDropdown === type) {
      this.closeAllDropdowns();
      return;
    }
    if (this.networkDropdown) {
      this.networkDropdown.classList.remove("show");
      this.networkContainer.classList.remove("active");
      if (this.submenuPlaceholder && this.networkDropdown.parentElement === this.submenuPlaceholder) {
        this.networkOriginalParent.appendChild(this.networkDropdown);
      }
    }
    if (this.batteryDropdown) {
      this.batteryDropdown.classList.remove("show");
      this.batteryContainer.classList.remove("active");
      if (this.submenuPlaceholder && this.batteryDropdown.parentElement === this.submenuPlaceholder) {
        this.batteryOriginalParent.appendChild(this.batteryDropdown);
      }
    }
    this.activeDropdown = type;
    if (type === "network") {
      this.networkDropdown.classList.add("show");
      this.networkContainer.classList.add("active");
      if (this.submenuPlaceholder) {
        this.positionSubmenu(this.networkContainer, this.networkDropdown);
      }
    } else if (type === "battery") {
      this.batteryDropdown.classList.add("show");
      this.batteryContainer.classList.add("active");
      if (this.submenuPlaceholder) {
        this.positionSubmenu(this.batteryContainer, this.batteryDropdown);
      }
    }
  }

  closeAllDropdowns() {
    if (this.networkDropdown) {
      this.networkDropdown.classList.remove("show");
      this.networkContainer.classList.remove("active");
      if (this.submenuPlaceholder && this.networkDropdown.parentElement === this.submenuPlaceholder) {
        this.networkOriginalParent.appendChild(this.networkDropdown);
      }
    }
    if (this.batteryDropdown) {
      this.batteryDropdown.classList.remove("show");
      this.batteryContainer.classList.remove("active");
      if (this.submenuPlaceholder && this.batteryDropdown.parentElement === this.submenuPlaceholder) {
        this.batteryOriginalParent.appendChild(this.batteryDropdown);
      }
    }
    this.activeDropdown = null;
  }

  updateNetworkIcon(state) {
    const quality = this.getNetworkQuality();
    const bars = {
      excellent: 5,
      good: 4,
      poor: 2,
      offline: 0,
      unknown: 3,
    };

    const activeBars = bars[quality] || 3;

    this.networkBars.forEach((bar, index) => {
      if (index < activeBars) {
        bar.style.fill = "var(--textTertiary, #d0d0d0)";
        bar.style.opacity = "1";
      } else {
        bar.style.fill = "var(--textMuted, #888888)";
        bar.style.opacity = "0.6";
      }
    });
    if (state.network.isOnline && activeBars > 0) {
      this.networkBars[activeBars - 1].classList.add("signal-active");
    } else {
      this.networkBars.forEach((bar) => bar.classList.remove("signal-active"));
    }
  }

  updateBatteryIcon(state) {
    if (!state.battery.isSupported || state.battery.level === null) {
      this.batteryFill.setAttribute("width", "18");
      return;
    }

    const level = state.battery.level;
    const width = (level / 100) * 18;
    this.batteryFill.setAttribute("width", width);
    let color = "var(--textPrimary, #ffffff)";
    if (state.battery.charging) {
      color = "var(--success, #00ff1596)";
      this.batteryFill.classList.add("charging-pulse");
    } else {
      this.batteryFill.classList.remove("charging-pulse");
      if (level < 20) color = "var(--danger, #ed0808b0)";
      else if (level < 50) color = "var(--warning, #ffef1091)";
      else color = "var(--dimond, #b0b0b0)";
    }
    this.batteryFill.style.fill = color;
  }

  updateNetworkDropdown(state) {
    const quality = this.getNetworkQuality();

    const header = this.networkDropdown.querySelector(".dropdown-header-text");
    header.querySelector("h3").textContent = state.network.isOnline ? "Connected" : "Offline";
    header.querySelector("p").textContent = state.network.isOnline ? "Internet connection active" : "No internet connection";

    document.getElementById("networkStatus").textContent = state.network.isOnline ? "✓ Online" : "✗ Offline";
    document.getElementById("networkType").textContent = state.network.effectiveType.toUpperCase();
    document.getElementById("networkSpeed").textContent = state.network.downlink ? `${state.network.downlink.toFixed(2)} Mbps` : "Unknown";
    document.getElementById("networkLatency").textContent = state.network.rtt ? `${state.network.rtt}ms` : "Unknown";

    const qualityBadge = document.getElementById("networkQuality");
    qualityBadge.textContent = quality;
    qualityBadge.className = `quality-badge quality-${quality}`;
  }

  updateBatteryDropdown(state) {
    const header = this.batteryDropdown.querySelector(".dropdown-header-text");
    const headerIcon = this.batteryDropdown.querySelector(".dropdown-header-icon");

    if (!state.battery.isSupported) {
      header.querySelector("h3").textContent = "Not Supported";
      header.querySelector("p").textContent = "Battery API unavailable";
      return;
    }

    const level = state.battery.level || 0;
    const charging = state.battery.charging;
    const quality = this.getBatteryQuality();

    headerIcon.textContent = charging ? "🔌︎" : "🔋︎";
    header.querySelector("h3").textContent = `${level}%`;
    header.querySelector("p").textContent = charging ? "Charging" : "On Battery";

    document.getElementById("batteryLevel").textContent = `${level}%`;
    document.getElementById("batteryChargingStatus").textContent = charging ? "⚡︎ Charging" : "🔌︎ Discharging";
    let timeText = "--";
    if (charging && state.battery.chargingTime) {
      timeText = `${Math.round(state.battery.chargingTime / 60)} min to full`;
    } else if (!charging && state.battery.dischargingTime) {
      timeText = `${Math.round(state.battery.dischargingTime / 60)} min remaining`;
    }
    document.getElementById("batteryTime").textContent = timeText;
    const progress = document.getElementById("batteryProgress");
    progress.style.width = `${level}%`;

    let progressColor = "var(--success, #00ff1596)";
    if (charging) progressColor = "var(--diamond, #38e471)";
    else if (level < 20) progressColor = "var(--danger, #ed0808b0)";
    else if (level < 50) progressColor = "var(--warning, #ffef1091)";
    progress.style.background = progressColor;
    const qualityBadge = document.getElementById("batteryQuality");
    qualityBadge.textContent = quality;
    qualityBadge.className = `quality-badge quality-${quality}`;
  }

  update(state) {
    this.updateNetworkIcon(state);
    this.updateBatteryIcon(state);
    this.updateNetworkDropdown(state);
    this.updateBatteryDropdown(state);
  }

  createNetworkIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "12");
    svg.setAttribute("viewBox", "0 0 18 12");

    for (let i = 0; i < 5; i++) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.classList.add("network-bar");
      rect.setAttribute("data-bar", i + 1);
      rect.setAttribute("width", "2");
      rect.setAttribute("rx", i < 3 ? "2" : "1");
      const heights = [4, 6, 8, 10, 12];
      const yPositions = [8, 6, 4, 2, 0];

      rect.setAttribute("height", heights[i]);
      rect.setAttribute("y", yPositions[i]);
      rect.setAttribute("x", i * 4);

      svg.appendChild(rect);
    }

    return svg;
  }

  createBatteryIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "27");
    svg.setAttribute("height", "13");
    svg.setAttribute("viewBox", "0 0 27 13");
    const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    outline.setAttribute("x", "0.5");
    outline.setAttribute("y", "0.5");
    outline.setAttribute("width", "22");
    outline.setAttribute("height", "11");
    outline.setAttribute("rx", "2.5");
    outline.style.stroke = "var(--textPrimary, #ffffff)";
    outline.setAttribute("stroke-opacity", "0.35");
    outline.setAttribute("fill", "none");
    svg.appendChild(outline);
    const terminal = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    terminal.setAttribute("x", "23");
    terminal.setAttribute("y", "3.5");
    terminal.setAttribute("width", "3");
    terminal.setAttribute("height", "5");
    terminal.setAttribute("rx", "1");
    terminal.style.fill = "var(--textPrimary, #ffffff)";
    terminal.setAttribute("fill-opacity", "0.4");
    svg.appendChild(terminal);
    const fill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    fill.classList.add("battery-fill");
    fill.setAttribute("x", "2");
    fill.setAttribute("y", "2");
    fill.setAttribute("width", "18");
    fill.setAttribute("height", "8");
    fill.setAttribute("rx", "1.5");
    fill.style.fill = "var(--textPrimary, #ffffff)";
    svg.appendChild(fill);

    return svg;
  }

  createDropdown(type, data) {
    const dropdown = window.App.modules.util.createElement("div", "dropdown");
    dropdown.setAttribute("data-dropdown", type);
    const header = window.App.modules.util.createElement("div", "dropdown-header"),
      ddHeader = window.App.modules.util.createElement("div", `dropdown-header-icon ${(data.class || '')}`),
      ddHeaderTxt = window.App.modules.util.createElement("div", "dropdown-header-text"),
      ddHeaderTitle = window.App.modules.util.createElement("h3", "", data.title),
      ddHeaderSub = window.App.modules.util.createElement("p", "", data.subtitle);
    ddHeader.innerHTML = data.icon;
    ddHeaderTxt.appendChild(ddHeaderTitle), ddHeaderTxt.appendChild(ddHeaderSub), header.appendChild(ddHeader), header.appendChild(ddHeaderTxt), dropdown.appendChild(header);
    const body = window.App.modules.util.createElement("div", "dropdown-body");
    body.setAttribute("data-dropdown-body", type);
    dropdown.appendChild(body);
    return dropdown;
  }

  createStatRow(label, value, valueId) {
    const row = window.App.modules.util.createElement("div", "stat-row"),
      rowLable = window.App.modules.util.createElement("span", "stat-label", label),
      rowValue = window.App.modules.util.createElement("div", "stat-value", value);
    if (valueId) rowValue.setAttribute("id", valueId);
    row.appendChild(rowLable), row.appendChild(rowValue);
    return row;
  }

  createProgressBar(id) {
    const container = window.App.modules.util.createElement("div", "progress-bar-container"),
      progressEl = window.App.modules.util.createElement("div", "progress-bar-fill");
    progressEl.setAttribute("id", id);
    container.appendChild(progressEl);
    return container;
  }

  createQualityBadge(id, text = "--") {
    const badge = window.App.modules.util.createElement("span", "quality-badge");
    badge.id = id;
    badge.textContent = text;
    return badge;
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener("scroll", this.scrollHandler, true);
      this.scrollHandler = null;
    }
    this.closeAllDropdowns();
    if (this.networkContainer && this.eventHandlers.networkClick) {
      this.networkContainer.removeEventListener("click", this.eventHandlers.networkClick);
    }

    if (this.batteryContainer && this.eventHandlers.batteryClick) {
      this.batteryContainer.removeEventListener("click", this.eventHandlers.batteryClick);
    }

    if (this.eventHandlers.documentClick) {
      document.removeEventListener("click", this.eventHandlers.documentClick);
    }
    this.eventHandlers = {
      networkClick: null,
      batteryClick: null,
      documentClick: null,
    };
    if (this.networkContainer) {
      while (this.networkContainer.firstChild) {
        this.networkContainer.removeChild(this.networkContainer.firstChild);
      }
    }

    if (this.batteryContainer) {
      while (this.batteryContainer.firstChild) {
        this.batteryContainer.removeChild(this.batteryContainer.firstChild);
      }
    }
    this.batteryFill = null;
    this.networkBars = null;
    this.networkDropdown = null;
    this.batteryDropdown = null;
    this.networkContainer = null;
    this.batteryContainer = null;
    this.activeDropdown = null;
    this.submenuPlaceholder = null;
    this.networkOriginalParent = null;
    this.batteryOriginalParent = null;
    super.cleanup();
  }
}

function initStatus() {
  if (window.App?.modules?.status) {
    window.App.modules.status.cleanup?.();
  }
  const statusModule = new Status();
  statusModule.generateNetworkUI();
  statusModule.generateBatteryUI();
  statusModule.initComponents();
  statusModule.initEventListeners();

  statusModule.onUpdate((state) => {
    statusModule.update(state);
  });
  statusModule.updateInterval = setInterval(() => {
    statusModule.update(statusModule.state);
  }, 30000);

  window.App.register("status", statusModule, "initStatus");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStatus);
} else {
  initStatus();
}

export { Status, initStatus };
