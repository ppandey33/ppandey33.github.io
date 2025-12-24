class Observable {
  constructor() {
    this.subscribers = [];
    this.isCompleted = false;
    this.cleanupFn = null;
    this.lastValue = undefined;
  }

  subscribe(callbacks) {
    if (typeof callbacks === "function") {
      callbacks = { next: callbacks };
    }

    const subscriber = {
      next: callbacks.next || (() => {}),
      error: callbacks.error || (() => {}),
      complete: callbacks.complete || (() => {}),
    };

    this.subscribers.push(subscriber);
    if (this.lastValue !== undefined) {
      subscriber.next(this.lastValue);
    }
    return {
      unsubscribe: () => {
        this.subscribers = this.subscribers.filter((s) => s !== subscriber);
      },
    };
  }

  once(callback) {
    const tempSub = this.subscribe({
      next: (value) => {
        callback(value);
        tempSub.unsubscribe();
      },
    });
  }

  next(value) {
    if (this.isCompleted) return;
    this.lastValue = value;
    this.subscribers.forEach((s) => s.next(value));
  }

  error(err) {
    if (this.isCompleted) return;
    this.subscribers.forEach((s) => s.error(err));
    this.subscribers = [];
    this.isCompleted = true;
  }

  complete() {
    if (this.isCompleted) return;
    this.subscribers.forEach((s) => s.complete());
    this.subscribers = [];
    this.isCompleted = true;
  }

  static fromEvent(element, eventName) {
    const obs = new Observable();
    const handler = (event) => obs.next(event);
    element.addEventListener(eventName, handler);
    obs.cleanupFn = () => element.removeEventListener(eventName, handler);
    return obs;
  }

  static interval(ms) {
    const obs = new Observable();
    let i = 0;
    const id = setInterval(() => obs.next(i++), ms);
    obs.cleanupFn = () => clearInterval(id);
    return obs;
  }

  cleanup() {
    if (this.cleanupFn) {
      this.cleanupFn();
    }
    this.subscribers = [];
    this.isCompleted = true;
  }
}

function initObservable() {
  if (window.App?.modules?.observer) {
    window.App.modules.observer.cleanup?.();
  }
  const observableModule = new Observable();
  window.App.register("observer", observableModule, "initObservable");
}

const instances = {};

function createObservable(name) {
  if (!instances[name]) {
    instances[name] = new Observable();
  }
  return instances[name];
}

export { Observable, initObservable, createObservable };
