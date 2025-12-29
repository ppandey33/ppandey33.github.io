class Device {
  constructor() {
    this.state = {
      network: {
        isOnline: navigator.onLine,
        effectiveType: "unknown",
        downlink: null,
        rtt: null,
        saveData: false,
        type: "unknown",
      },
      battery: {
        isSupported: false,
        level: null,
        charging: null,
        chargingTime: null,
        dischargingTime: null,
      },
    };
    this.batteryManager = null;
    this.listeners = [];
    this.updateCallbacks = [];
    this.networkHandlers = {
      online: null,
      offline: null,
      change: null
    };
    this.batteryHandlers = {};
    this.init();
  }
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }
  notifyUpdate() {
    this.updateCallbacks.forEach((cb) => cb(this.state));
  }
  async init() {
    await this.initNetworkMonitoring();
    await this.initBatteryMonitoring();
    this.notifyUpdate();
  }
  async initNetworkMonitoring() {
    this.networkHandlers.online = () => {
      this.state.network.isOnline = true;
      this.notifyUpdate();
    };
    this.networkHandlers.offline = () => {
      this.state.network.isOnline = false;
      this.notifyUpdate();
    };
    window.addEventListener("online", this.networkHandlers.online);
    window.addEventListener("offline", this.networkHandlers.offline);
    this.listeners.push(
      { target: window, event: "online", handler: this.networkHandlers.online },
      { target: window, event: "offline", handler: this.networkHandlers.offline }
    );
    if ("connection" in navigator || "mozConnection" in navigator || "webkitConnection" in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      this.updateNetworkInfo(connection);
      this.networkHandlers.change = () => {
        this.updateNetworkInfo(connection);
      };
      connection.addEventListener("change", this.networkHandlers.change);
      this.listeners.push({
        target: connection,
        event: "change",
        handler: this.networkHandlers.change,
      });
    }
  }
  updateNetworkInfo(connection) {
    this.state.network = {
      isOnline: navigator.onLine,
      effectiveType: connection.effectiveType || "unknown",
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
      saveData: connection.saveData || false,
      type: connection.type || "unknown",
    };
    this.notifyUpdate();
  }
  async initBatteryMonitoring() {
    if ("getBattery" in navigator) {
      try {
        this.batteryManager = await navigator.getBattery();
        this.state.battery.isSupported = true;
        this.updateBatteryInfo();
        const events = ["chargingchange", "levelchange", "chargingtimechange", "dischargingtimechange"];
        events.forEach((event) => {
          const handler = () => this.updateBatteryInfo();
          this.batteryHandlers[event] = handler;
          this.batteryManager.addEventListener(event, handler);
          this.listeners.push({
            target: this.batteryManager,
            event: event,
            handler: handler,
          });
        });
      } catch (error) {
        console.warn("Battery API not available");
      }
    }
  }
  updateBatteryInfo() {
    if (!this.batteryManager) return;
    this.state.battery = {
      isSupported: true,
      level: Math.round(this.batteryManager.level * 100),
      charging: this.batteryManager.charging,
      chargingTime: this.batteryManager.chargingTime === Infinity ? null : this.batteryManager.chargingTime,
      dischargingTime: this.batteryManager.dischargingTime === Infinity ? null : this.batteryManager.dischargingTime,
    };
    this.notifyUpdate();
  }
  getNetworkQuality() {
    const { effectiveType, downlink, isOnline } = this.state.network;
    if (!isOnline) return "offline";
    if (effectiveType === "4g" || (downlink && downlink > 10)) return "excellent";
    if (effectiveType === "3g" || (downlink && downlink > 1.5)) return "good";
    if (effectiveType === "2g" || (downlink && downlink > 0.4)) return "poor";
    return "unknown";
  }
  getBatteryQuality() {
    const { level, charging, isSupported } = this.state.battery;
    if (!isSupported) return "not-supported";
    if (level === null) return "unknown";
    if (charging) return "charging";
    if (level > 80) return "excellent";
    if (level > 50) return "good";
    if (level > 20) return "poor";
    return "critical";
  }
  cleanup() {
    this.listeners.forEach(({ target, event, handler }) => {
      if (target && handler) {
        target.removeEventListener(event, handler);
      }
    });
    this.listeners = [];
    this.networkHandlers = {
      online: null,
      offline: null,
      change: null
    };
    this.batteryHandlers = {};
    this.updateCallbacks = [];
    this.batteryManager = null;
    this.state = {
      network: {
        isOnline: navigator.onLine,
        effectiveType: "unknown",
        downlink: null,
        rtt: null,
        saveData: false,
        type: "unknown",
      },
      battery: {
        isSupported: false,
        level: null,
        charging: null,
        chargingTime: null,
        dischargingTime: null,
      },
    };
  }
}
function initDevice() {
  if (window.App?.modules?.device) {
    window.App.modules.device.cleanup?.();
  }
  const deviceModule = new Device();
  window.App.register("device", deviceModule, "initDevice");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDevice);
} else {
  initDevice();
}
export { Device, initDevice };
