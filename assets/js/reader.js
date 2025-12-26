export class Reader {
  constructor(articleId, options = {}) {
    this.articleId = articleId;
    this.db = null;
    this.readingTimer = null;
    this.timeSpent = 0;
    this.storageType = null;
    this.isMinimized = false;
    this.isPaused = false;
    this.highlightColors = {
      yellow: "#fff59d",
      green: "#a5d6a7",
      pink: "#f48fb1",
      blue: "#81d4fa",
    };
    this.currentColor = "yellow";
    this.features = {
      indexedDB: this.checkIndexedDB(),
      localStorage: this.checkLocalStorage(),
      selection: typeof window.getSelection === "function",
    };
  }

  checkIndexedDB() {
    try {
      return !!(window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB);
    } catch (e) {
      return false;
    }
  }

  checkLocalStorage() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  async loadReaders() {
    if (this.features.indexedDB) {
      try {
        await this.initIndexedDB();
        this.storageType = "indexedDB";
      } catch (e) {
        console.warn("IndexedDB failed, falling back to localStorage:", e);
        this.initLocalStorage();
      }
    } else if (this.features.localStorage) {
      this.initLocalStorage();
    } else {
      this.initMemoryStorage();
      console.warn("⚠️ Using memory storage - data will be lost on page refresh");
    }

    await this.loadReadingState();

    if (this.features.selection) {
      this.setupHighlighting();
    } else {
      console.warn("⚠️ Text selection not supported");
    }

    this.setupReadingProgress();
    this.setupUI();
    this.startReadingTimer();
  }

  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

      const request = indexedDB.open("BlogReadingDB", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("highlights")) {
          const highlightStore = db.createObjectStore("highlights", {
            keyPath: "id",
            autoIncrement: true,
          });
          highlightStore.createIndex("articleId", "articleId", { unique: false });
        }
        if (!db.objectStoreNames.contains("progress")) {
          db.createObjectStore("progress", { keyPath: "articleId" });
        }
        if (!db.objectStoreNames.contains("stats")) {
          db.createObjectStore("stats", { keyPath: "articleId" });
        }
      };
    });
  }

  initLocalStorage() {
    this.storageType = "localStorage";
    this.db = {
      highlights: this.getFromLocalStorage("highlights") || [],
      progress: this.getFromLocalStorage("progress") || {},
      stats: this.getFromLocalStorage("stats") || {},
    };
  }

  getFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(`blog_reading_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("localStorage read error:", e);
      return null;
    }
  }

  setToLocalStorage(key, value) {
    try {
      localStorage.setItem(`blog_reading_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("localStorage write error:", e);
      if (e.name === "QuotaExceededError") {
        this.showNotification("Storage quota exceeded. Some features may not work.", "error");
      }
    }
  }

  initMemoryStorage() {
    this.storageType = "memory";
    this.db = {
      highlights: [],
      progress: {},
      stats: {},
    };
  }

  setupHighlighting() {
    const contentArea = document.querySelector(".blog-content, article, main");
    if (!contentArea) return;

    contentArea.addEventListener("mouseup", async (e) => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 3 && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!contentArea.contains(range.commonAncestorContainer)) return;

        await this.saveHighlight(text, range);
        this.applyHighlight(range, this.currentColor);
        selection.removeAllRanges();
      }
    });
  }

  async saveHighlight(text, range) {
    const position = this.serializeRange(range);

    const highlight = {
      id: Date.now() + Math.random(),
      articleId: this.articleId,
      text: text,
      color: this.currentColor,
      position: position,
      createdAt: Date.now(),
    };

    if (this.storageType === "indexedDB") {
      return this.saveToIndexedDB("highlights", highlight);
    } else if (this.storageType === "localStorage") {
      this.db.highlights.push(highlight);
      this.setToLocalStorage("highlights", this.db.highlights);
    } else {
      this.db.highlights.push(highlight);
    }

    return highlight;
  }

  serializeRange(range) {
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startPath: this.getNodePath(range.startContainer),
      endPath: this.getNodePath(range.endContainer),
      text: range.toString(),
    };
  }

  getNodePath(node) {
    const path = [];
    let current = node;

    while (current && current !== document.body) {
      const parent = current.parentNode;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current);
        path.unshift(index);
      }
      current = parent;
    }

    return path;
  }

  applyHighlight(range, color) {
    const span = document.createElement("span");
    span.className = "blog-highlight";
    span.setAttribute('title', "Remove Highlights.");
    span.style.backgroundColor = this.highlightColors[color];
    span.style.cursor = "pointer";
    span.setAttribute("data-highlight-color", color);

    try {
      range.surroundContents(span);
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showDialog(
          "Remove Highlight",
          "Are you sure you want to remove this highlight?",
          [
            { text: "Cancel", className: "reader-dialog-btn-secondary", callback: null },
            {
              text: "Confirm",
              className: "reader-dialog-btn-primary",
              callback: () => {
                const parent = span.parentNode;
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
              },
            },
          ],
          '<i class="fa-solid fa-text-slash"></i>'
        );
      });
    } catch (e) {
      console.warn("Could not apply highlight:", e);
    }
  }

  async loadHighlights() {
    let highlights = [];

    if (this.storageType === "indexedDB") {
      highlights = await this.loadFromIndexedDB("highlights", this.articleId);
    } else if (this.storageType === "localStorage") {
      const allHighlights = this.getFromLocalStorage("highlights") || [];
      highlights = allHighlights.filter((h) => h.articleId === this.articleId);
    } else {
      highlights = this.db.highlights.filter((h) => h.articleId === this.articleId);
    }

    highlights.forEach((highlight) => {
      try {
        const range = this.deserializeRange(highlight.position);
        if (range) {
          this.applyHighlight(range, highlight.color);
        }
      } catch (e) {
        console.warn("Could not restore highlight:", e);
      }
    });

    return highlights;
  }

  deserializeRange(position) {
    try {
      const startNode = this.getNodeByPath(position.startPath);
      const endNode = this.getNodeByPath(position.endPath);

      if (!startNode || !endNode) return null;

      const range = document.createRange();
      range.setStart(startNode, position.startOffset);
      range.setEnd(endNode, position.endOffset);

      return range;
    } catch (e) {
      return null;
    }
  }

  getNodeByPath(path) {
    let node = document.body;

    for (const index of path) {
      if (node.childNodes[index]) {
        node = node.childNodes[index];
      } else {
        return null;
      }
    }

    return node;
  }

  setupReadingProgress() {
    let scrollTimeout;

    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.saveProgress();
        this.updateProgressBar();
        this.checkReadingCompletion();
      }, 500);
    });

    window.addEventListener("beforeunload", () => {
      this.saveProgress();
      this.saveStats();
    });
  }

  checkReadingCompletion() {
    const percentage = this.getReadingPercentage();
    if (percentage >= 99 && !this.isPaused) {
      this.pauseTimer();
      this.showCompletionDialog();
    }
  }

  showCompletionDialog() {
    const minutes = Math.floor(this.timeSpent / 60);
    const seconds = this.timeSpent % 60;

    this.showDialog(
      "Reading Completed!",
      `Congratulations! You've completed this article.<br><br>
       <strong>Total Reading Time:</strong> ${minutes}m ${seconds}s`,
      [
        {
          text: "Revise",
          className: "reader-dialog-btn-secondary",
          callback: () => {
            this.timeSpent = 0;
            this.updateTimeDisplay();
            this.resumeTimer();
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
        },
        {
          text: "Continue",
          className: "reader-dialog-btn-primary",
          callback: () => {
            this.resumeTimer();
          },
        },
      ],
      '<i class="fa-solid fa-flag-checkered"></i>'
    );
  }

  async saveProgress() {
    const progress = {
      articleId: this.articleId,
      scrollPosition: window.scrollY,
      percentage: this.getReadingPercentage(),
      lastRead: Date.now(),
    };

    if (this.storageType === "indexedDB") {
      return this.saveToIndexedDB("progress", progress);
    } else if (this.storageType === "localStorage") {
      this.db.progress[this.articleId] = progress;
      this.setToLocalStorage("progress", this.db.progress);
    } else {
      this.db.progress[this.articleId] = progress;
    }
  }

  async loadReadingState() {
    const progress = await this.getProgress();

    if (progress && progress.scrollPosition > 100) {
      const dontAskAgain = this.getPreference("dontAskResume");

      if (dontAskAgain) {
        window.scrollTo({ top: progress.scrollPosition, behavior: "smooth" });
      } else {
        this.showResumeDialog(progress);
      }
    }
    await this.loadHighlights();
  }

  showResumeDialog(progress) {
    const checkboxId = "dont-ask-resume-" + Date.now();

    this.showDialog(
      "Resume Reading?",
      `You were reading this article earlier. Would you like to continue where you left off?
       <div class="reader-dialog-progress">
         <i class="fa-solid fa-list-check"></i> Progress: <strong>${Math.round(progress.percentage)}%</strong> complete
       </div>
       <div class="reader-dialog-checkbox">
         <input type="checkbox" id="${checkboxId}">
         <label for="${checkboxId}">Don't ask me again, always resume</label>
       </div>`,
      [
        {
          text: "Start Over",
          className: "reader-dialog-btn-secondary",
          callback: () => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox && checkbox.checked) {
              this.setPreference("dontAskResume", true);
            }
          },
        },
        {
          text: "Resume Reading",
          className: "reader-dialog-btn-primary",
          callback: () => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox && checkbox.checked) {
              this.setPreference("dontAskResume", true);
            }
            window.scrollTo({ top: progress.scrollPosition, behavior: "smooth" });
          },
        },
      ],
      '<i class="fa-solid fa-book"></i>'
    );
  }

  async getProgress() {
    if (this.storageType === "indexedDB") {
      return this.getFromIndexedDB("progress", this.articleId);
    } else if (this.storageType === "localStorage") {
      const allProgress = this.getFromLocalStorage("progress") || {};
      return allProgress[this.articleId];
    } else {
      return this.db.progress[this.articleId];
    }
  }

  getReadingPercentage() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;

    const percentage = (scrollTop / (documentHeight - windowHeight)) * 100;
    return Math.min(100, Math.max(0, percentage));
  }

  updateProgressBar() {
    const progressBar = document.getElementById("reading-progress-bar");
    const headerProgressBar = document.getElementById("header-reading-progress-bar");
    const percentage = this.getReadingPercentage();

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    if (headerProgressBar) {
      headerProgressBar.style.width = `${percentage}%`;
    }
  }

  startReadingTimer() {
    this.readingTimer = setInterval(() => {
      if (document.visibilityState === "visible" && !this.isPaused) {
        this.timeSpent++;
        this.updateTimeDisplay();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isPaused = true;
    const pauseBtn = document.getElementById("header-timer-toggle");
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      pauseBtn.setAttribute("title", "Resume Timer");
    }
  }

  resumeTimer() {
    this.isPaused = false;
    const pauseBtn = document.getElementById("header-timer-toggle");
    if (pauseBtn) {
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      pauseBtn.setAttribute("title", "Pause Timer");
    }
  }

  toggleTimer() {
    if (this.isPaused) {
      this.resumeTimer();
    } else {
      this.pauseTimer();
    }
  }

  async saveStats() {
    const stats = {
      articleId: this.articleId,
      totalTimeSpent: this.timeSpent,
      percentage: this.getReadingPercentage(),
      lastVisit: Date.now(),
      completed: this.getReadingPercentage() >= 90,
    };

    if (this.storageType === "indexedDB") {
      return this.saveToIndexedDB("stats", stats);
    } else if (this.storageType === "localStorage") {
      this.db.stats[this.articleId] = stats;
      this.setToLocalStorage("stats", this.db.stats);
    } else {
      this.db.stats[this.articleId] = stats;
    }
  }

  updateTimeDisplay() {
    const minutes = Math.floor(this.timeSpent / 60);
    const seconds = this.timeSpent % 60;
    const timeStr = `${minutes}m ${seconds}s`;

    const toolbarDisplay = document.getElementById("reading-time-display");
    const headerDisplay = document.getElementById("header-reading-time");

    if (toolbarDisplay) {
      toolbarDisplay.textContent = timeStr;
    }
    if (headerDisplay) {
      headerDisplay.textContent = timeStr;
    }
  }

  setupUI() {
    this.createToolbar();
    this.updateProgressBar();
  }

  createHeaderProgressBar() {
    const header = document.querySelector("[data-header-progress]");
    const render = document.querySelectorAll("[data-move-to-header]");
    if (!header || !render) return;
    render.forEach((el) => {
      header.appendChild(el);
    });
  }

  clearHeaderProgressBar() {
    const content = document.querySelector("#toolbar-content");
    const reader = document.querySelector("#reader-btn-container");
    const renderBlock = document.querySelectorAll("[data-move-to-header]");
    content && reader && renderBlock.forEach((el) => {
      if (el.getAttribute("data-move-to-header") == "timer") {
       reader.insertBefore(el, reader.firstChild);
      }
      if (el.getAttribute("data-move-to-header") == "progress") {
        content.insertBefore(el, content.firstChild);
      }
    });
  }

  toggleMinimize() {
    const toolbar = document.getElementById("reading-toolbar");
    const content = document.getElementById("toolbar-content");
    const toggleBtn = document.getElementById("toolbar-toggle-btn");

    if (!toolbar || !content || !toggleBtn) return;

    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      toolbar.classList.add("minimized");
      content.style.display = "none";
      toggleBtn.innerHTML = '<i class="fa-solid fa-caret-up"></i>';
      toggleBtn.setAttribute("title", "Maximize Reading Tools");
      this.createHeaderProgressBar();
    } else {
      toolbar.classList.remove("minimized");
      content.style.display = "flex";
      toggleBtn.innerHTML = '<i class="fa-solid fa-caret-down"></i>';
      toggleBtn.setAttribute("title", "Minimize Reading Tools");
      this.clearHeaderProgressBar();
    }
  }

  createToolbar() {
    if (document.getElementById("reading-toolbar")) return;

    const toolbar = window.App.modules.util.createElement("div", "glass-card");
    toolbar.id = "reading-toolbar";
    const header = window.App.modules.util.createElement("div", "");
    header.id = "toolbar-header";
    const title = window.App.modules.util.createElement("span", "");
    title.id = "toolbar-title";
    title.innerHTML = '<i class="fa-solid fa-paintbrush"></i> Reading Tools';
    const toggleBtn = window.App.modules.util.createElement("button", "btn exp-btn");
    toggleBtn.id = "toolbar-toggle-btn";
    toggleBtn.innerHTML = '<i class="fa-solid fa-caret-down"></i>';
    toggleBtn.setAttribute("title", "Minimize Reading Tools");
    toggleBtn.addEventListener("click", () => this.toggleMinimize());
    const progressHeaderPlaceholder = window.App.modules.util.createElement("div", "");
    progressHeaderPlaceholder.setAttribute("data-header-progress", "");
    header.appendChild(title);
    header.appendChild(progressHeaderPlaceholder);
    header.appendChild(toggleBtn);
    const content = window.App.modules.util.createElement("div", "");
    content.id = "toolbar-content";
    const progressContainer = window.App.modules.util.createElement("div", "");
    progressContainer.id = "reading-progress-container";
    progressContainer.setAttribute("data-move-to-header", "progress");
    const progressPercentage = window.App.modules.util.createElement("span", "", "0%");
    progressPercentage.id = "progress-percentage";
    const progressBar = window.App.modules.util.createElement("div", "");
    progressBar.id = "reading-progress-bar";
    progressContainer.appendChild(progressPercentage);
    progressContainer.appendChild(progressBar);
    const toolbarSection = window.App.modules.util.createElement("div", "toolbar-section");
    const statsDisplay = window.App.modules.util.createElement("div", "stats-display");
    const label = window.App.modules.util.createElement("span", "toolbar-label", "Highlight Color");
    const colorPicker = window.App.modules.util.createElement("div", "color-picker");
    const colors = [
      { name: "yellow", color: "#fff59d" },
      { name: "green", color: "#a5d6a7" },
      { name: "pink", color: "#f48fb1" },
      { name: "blue", color: "#81d4fa" },
    ];
    colors.forEach((colorInfo, index) => {
      const colorBtn = window.App.modules.util.createElement("button", index === 0 ? "color-btn active" : "color-btn");
      colorBtn.setAttribute("data-color", colorInfo.name);
      colorBtn.style.background = colorInfo.color;
      colorBtn.setAttribute("title", colorInfo.name.charAt(0).toUpperCase() + colorInfo.name.slice(1));
      colorBtn.addEventListener("click", () => {
        document.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
        colorBtn.classList.add("active");
        this.currentColor = colorInfo.name;
      });
      colorPicker.appendChild(colorBtn);
    });
    statsDisplay.appendChild(label);
    statsDisplay.appendChild(colorPicker);
    const btnContainer = window.App.modules.util.createElement("span", "reader-btn-container");
    btnContainer.id = "reader-btn-container";
    const timeInfo = window.App.modules.util.createElement("span", "timer-info");
    timeInfo.setAttribute("data-move-to-header", "timer");
    const timerToogleBtn = window.App.modules.util.createElement("button", "btn exp-btn");
    timerToogleBtn.id = "header-timer-toggle";
    timerToogleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    timerToogleBtn.setAttribute("title", "Pause Timer");
    timerToogleBtn.addEventListener("click", () => this.toggleTimer());
    const exportBtn = window.App.modules.util.createElement("button", "btn");
    exportBtn.id = "export-data-btn";
    exportBtn.innerHTML = '<i class="fa-solid fa-file-export"></i> Export';
    exportBtn.setAttribute("title", "Export all your highlights as JSON");
    exportBtn.addEventListener("click", () => this.exportHighlights());
    timeInfo.innerHTML = '<i class="fa-regular fa-alarm-clock"></i> <span id="reading-time-display">0m 0s</span>';
    timeInfo.appendChild(timerToogleBtn);
    btnContainer.appendChild(timeInfo);
    btnContainer.appendChild(exportBtn);
    toolbarSection.appendChild(statsDisplay);
    toolbarSection.appendChild(btnContainer);
    content.appendChild(progressContainer);
    content.appendChild(toolbarSection);
    toolbar.appendChild(header);
    toolbar.appendChild(content);
    document.body.appendChild(toolbar);
    setInterval(() => {
      const percentageEl = document.getElementById("progress-percentage");
      if (percentageEl) {
        percentageEl.textContent = `${Math.round(this.getReadingPercentage())}%`;
      }
    }, 1000);
  }

  async exportHighlights() {
    let highlights = [];

    if (this.storageType === "indexedDB") {
      highlights = await this.loadFromIndexedDB("highlights", this.articleId);
    } else if (this.storageType === "localStorage") {
      const allHighlights = this.getFromLocalStorage("highlights") || [];
      highlights = allHighlights.filter((h) => h.articleId === this.articleId);
    } else {
      highlights = this.db.highlights.filter((h) => h.articleId === this.articleId);
    }

    const exportData = {
      article: this.articleId,
      exportDate: new Date().toISOString(),
      storageType: this.storageType,
      highlights: highlights.map((h) => ({
        text: h.text,
        color: h.color,
        createdAt: new Date(h.createdAt).toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `highlights-${this.articleId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification(`Exported ${highlights.length} highlights!`, "success");
    return exportData;
  }

  saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  loadFromIndexedDB(storeName, articleId) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);

        if (storeName === "highlights") {
          const index = store.index("articleId");
          const request = index.getAll(articleId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          const request = store.get(articleId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  getFromIndexedDB(storeName, articleId) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(articleId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  destroy() {
    if (this.readingTimer) {
      clearInterval(this.readingTimer);
    }
    this.saveProgress();
    this.saveStats();

    const headerContainer = document.querySelector(".header-reading-container");
    if (headerContainer) {
      headerContainer.remove();
    }
  }

  showDialog(title, message, buttons = [], icon = "⚠️") {
    let overlay = document.getElementById("reader-dialog-overlay");

    if (!overlay) {
      overlay = window.App.modules.util.createElement("div", "reader-dialog-overlay");
      overlay.id = "reader-dialog-overlay";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = "";

    const dialog = window.App.modules.util.createElement("div", "reader-dialog");

    const header = window.App.modules.util.createElement("div", "reader-dialog-header");
    const dialogIcon = window.App.modules.util.createElement("span", "reader-dialog-icon");
    dialogIcon.innerHTML = icon;
    const dialogTitle = window.App.modules.util.createElement("h3", "reader-dialog-title", title);
    header.appendChild(dialogIcon);
    header.appendChild(dialogTitle);

    const body = window.App.modules.util.createElement("div", "reader-dialog-body");
    body.innerHTML = message;

    const actions = window.App.modules.util.createElement("div", "reader-dialog-actions");

    buttons.forEach((btn) => {
      const button = window.App.modules.util.createElement("button", `reader-dialog-btn btn ${btn.className}`, btn.text);
      button.addEventListener("click", () => {
        if (btn.callback) {
          btn.callback();
        }
        overlay.style.display = "none";
      });
      actions.appendChild(button);
    });

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    overlay.style.display = "flex";

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.style.display = "none";
      }
    });
  }

  showNotification(message, type = "info") {
    const notification = window.App.modules.util.createElement("div", "reader-notification");

    const icons = {
      success: '<i class="fa-solid fa-check-double"></i>',
      error: '<i class="fa-solid fa-bug"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
      info: '<i class="fa-solid fa-exclamation"></i>',
    };

    const icon = window.App.modules.util.createElement("span", "reader-notification-icon");
    icon.innerHTML = icons[type] || icons.info;

    const msg = window.App.modules.util.createElement("span", "reader-notification-message", message);

    notification.appendChild(icon);
    notification.appendChild(msg);

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }

  getPreference(key) {
    try {
      const prefs = localStorage.getItem("blog_reader_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        return parsed[key];
      }
    } catch (e) {
      console.error("Error reading preferences:", e);
    }
    return null;
  }

  setPreference(key, value) {
    try {
      let prefs = {};
      const existing = localStorage.getItem("blog_reader_preferences");
      if (existing) {
        prefs = JSON.parse(existing);
      }
      prefs[key] = value;
      localStorage.setItem("blog_reader_preferences", JSON.stringify(prefs));
    } catch (e) {
      console.error("Error saving preferences:", e);
    }
  }
}
