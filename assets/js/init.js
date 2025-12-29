(function () {
  "use strict";
  function getInitFunctionName(filename) {
    const nameWithoutExt = filename.replace(".js", "");
    const camelCase = nameWithoutExt
      .split(/[-_]/)
      .map((word, index) => {
        if (index === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");
    return "init" + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }
  window.App = {
    modules: {},
    initializedModules: new Set(),
    register(name, module, moduleInitializer = "") {
      if (this.modules[name]) {
        console.warn(`Module ${name} already exists, replacing...`);
        if (this.modules[name].cleanup) {
          this.modules[name].cleanup();
        }
      }
      this.modules[name] = module;
      if (moduleInitializer != "") this.initializedModules.add(moduleInitializer);
    },
    get(name) {
      if (!this.modules[name]) {
        console.warn(`Module ${name} not found`);
      }
      return this.modules[name];
    },
    clear() {
      this.reset();
      this.modules = {};
    },
    reset() {
      Object.keys(this.modules).forEach((name) => {
        if (this.modules[name].cleanup) {
          this.modules[name].cleanup();
        }
      });
      this.modules = {};
      this.initializedModules.clear();
    },
    async initModuleFile() {
      const moduleScripts = document.querySelectorAll('script[type="module"]');
      const results = { initialized: 0, skipped: 0, failed: 0 };
      for (const script of moduleScripts) {
        if (!script.src) continue;
        try {
          const url = new URL(script.src, window.location.href);
          const pathname = url.pathname;
          const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
          const module = await import(url.toString());
          const exports = Object.keys(module);
          const initFunctionName = getInitFunctionName(filename);
          if (this.initializedModules.has(initFunctionName)) {
            results.skipped++;
            continue;
          }
          const initFunction = module[initFunctionName];
          if (initFunction) {
            if (typeof initFunction === "function") {
              await initFunction();
              this.initializedModules.add(initFunctionName);
              results.initialized++;
            } else {
              console.error(`   ❌ ${initFunctionName} exists but is not a function (type: ${typeof initFunction})`);
              results.failed++;
            }
          } else {
            console.error(`   ❌ ${initFunctionName} No init function found`);
            results.failed++;
          }
        } catch (error) {
          console.error(`❌ Error loading ${script.src}:`, error);
          results.failed++;
        }
      }
    },
  };
})();
