export class Reader {
  constructor(articleId, options = {}) {
    this.articleId = articleId;
    this.db = null;
    this.readingTimer = null;
    this.timeSpent = 0;
    this.storageType = null; // 'indexedDB', 'localStorage', or 'memory'
    this.isMinimized = false;
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
      selection: typeof window.getSelection === 'function'
    };
  }
  
  checkIndexedDB() {
    try {
      return !!(window.indexedDB || 
                window.mozIndexedDB || 
                window.webkitIndexedDB || 
                window.msIndexedDB);
    } catch (e) {
      return false;
    }
  }

  checkLocalStorage() {
    try {
      const test = '__storage_test__';
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
        this.storageType = 'indexedDB';

      } catch (e) {
        console.warn('IndexedDB failed, falling back to localStorage:', e);
        this.initLocalStorage();
      }
    } 
    else if (this.features.localStorage) {
      this.initLocalStorage();
    } 
    else {
      this.initMemoryStorage();
      console.warn('⚠️ Using memory storage - data will be lost on page refresh');
    }

    await this.loadReadingState();
    
    if (this.features.selection) {
      this.setupHighlighting();
    } else {
      console.warn('⚠️ Text selection not supported');
    }
    
    this.setupReadingProgress();
    this.setupUI();
    this.startReadingTimer();
  }
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const indexedDB = window.indexedDB || 
                       window.mozIndexedDB || 
                       window.webkitIndexedDB || 
                       window.msIndexedDB;
                       
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
    this.storageType = 'localStorage';
    this.db = {
      highlights: this.getFromLocalStorage('highlights') || [],
      progress: this.getFromLocalStorage('progress') || {},
      stats: this.getFromLocalStorage('stats') || {}
    };

  }

  getFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(`blog_reading_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('localStorage read error:', e);
      return null;
    }
  }

  setToLocalStorage(key, value) {
    try {
      localStorage.setItem(`blog_reading_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage write error:', e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Some features may not work.');
      }
    }
  }
  
  initMemoryStorage() {
    this.storageType = 'memory';
    this.db = {
      highlights: [],
      progress: {},
      stats: {}
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

    if (this.storageType === 'indexedDB') {
      return this.saveToIndexedDB('highlights', highlight);
    } else if (this.storageType === 'localStorage') {
      this.db.highlights.push(highlight);
      this.setToLocalStorage('highlights', this.db.highlights);
    } else {
      this.db.highlights.push(highlight);
    }
    
    return highlight;
  }

  serializeRange(range) {
    const container = range.commonAncestorContainer;
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startPath: this.getNodePath(startContainer),
      endPath: this.getNodePath(endContainer),
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
    span.style.backgroundColor = this.highlightColors[color];
    span.style.cursor = "pointer";
    span.setAttribute("data-highlight-color", color);

    try {
      range.surroundContents(span);
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showConfirmDialog(
          "Remove Highlight",
          "Are you sure you want to remove this highlight?",
          () => {
            const parent = span.parentNode;
            while (span.firstChild) {
              parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
          }
        );
      });
    } catch (e) {
      console.warn("Could not apply highlight:", e);
    }
  }

  async loadHighlights() {
    let highlights = [];
    
    if (this.storageType === 'indexedDB') {
      highlights = await this.loadFromIndexedDB('highlights', this.articleId);
    } else if (this.storageType === 'localStorage') {
      const allHighlights = this.getFromLocalStorage('highlights') || [];
      highlights = allHighlights.filter(h => h.articleId === this.articleId);
    } else {
      highlights = this.db.highlights.filter(h => h.articleId === this.articleId);
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
      }, 500);
    });
    window.addEventListener("beforeunload", () => {
      this.saveProgress();
      this.saveStats();
    });
  }

  async saveProgress() {
    const progress = {
      articleId: this.articleId,
      scrollPosition: window.scrollY,
      percentage: this.getReadingPercentage(),
      lastRead: Date.now(),
    };

    if (this.storageType === 'indexedDB') {
      return this.saveToIndexedDB('progress', progress);
    } else if (this.storageType === 'localStorage') {
      this.db.progress[this.articleId] = progress;
      this.setToLocalStorage('progress', this.db.progress);
    } else {
      this.db.progress[this.articleId] = progress;
    }
  }

  async loadReadingState() {
    const progress = await this.getProgress();

    if (progress && progress.scrollPosition > 100) {
      const dontAskAgain = this.getPreference('dontAskResume');
      
      if (dontAskAgain) {
        window.scrollTo({ top: progress.scrollPosition, behavior: "smooth" });
      } else {
        this.showResumeDialog(progress);
      }
    }
    await this.loadHighlights();
  }

  async getProgress() {
    if (this.storageType === 'indexedDB') {
      return this.getFromIndexedDB('progress', this.articleId);
    } else if (this.storageType === 'localStorage') {
      const allProgress = this.getFromLocalStorage('progress') || {};
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
    if (progressBar) {
      const percentage = this.getReadingPercentage();
      progressBar.style.width = `${percentage}%`;
    }
  }
  startReadingTimer() {
    this.readingTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        this.timeSpent++;
        this.updateTimeDisplay();
      }
    }, 1000);
  }

  async saveStats() {
    const stats = {
      articleId: this.articleId,
      totalTimeSpent: this.timeSpent,
      percentage: this.getReadingPercentage(),
      lastVisit: Date.now(),
      completed: this.getReadingPercentage() >= 90,
    };

    if (this.storageType === 'indexedDB') {
      return this.saveToIndexedDB('stats', stats);
    } else if (this.storageType === 'localStorage') {
      this.db.stats[this.articleId] = stats;
      this.setToLocalStorage('stats', this.db.stats);
    } else {
      this.db.stats[this.articleId] = stats;
    }
  }

  updateTimeDisplay() {
    const display = document.getElementById("reading-time-display");
    if (display) {
      const minutes = Math.floor(this.timeSpent / 60);
      const seconds = this.timeSpent % 60;
      display.textContent = `${minutes}m ${seconds}s`;
    }
  }
  setupUI() {
    this.createToolbar();
    this.updateProgressBar();
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
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      `;
      toggleBtn.setAttribute("title", "Maximize Reading Tools");
    } else {
      toolbar.classList.remove("minimized");
      content.style.display = "flex";
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      `;
      toggleBtn.setAttribute("title", "Minimize Reading Tools");
    }
  }

  createToolbar() {
    if (document.getElementById("reading-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "reading-toolbar";
    toolbar.classList.add("glass-card");
    toolbar.innerHTML = `
      <div id="toolbar-header">
        <span id="toolbar-title"><i class="fa-solid fa-paintbrush"></i> Reading Tools</span>
        <button id="toolbar-toggle-btn" class="btn exp-btn" title="Minimize Reading Tools"><i class="fa-solid fa-caret-down"></i></button>
      </div>
      
      <div id="toolbar-content">
        <div id="reading-progress-container">
          <span id="progress-percentage">0%</span>
          <div id="reading-progress-bar"></div>
        </div>
      
        <div class="toolbar-section">
          <div class="stats-display">
            <span class="toolbar-label">Highlight Color</span>
            <div class="color-picker">
              <button class="color-btn active" data-color="yellow" style="background: #fff59d" title="Yellow"></button>
              <button class="color-btn" data-color="green" style="background: #a5d6a7" title="Green"></button>
              <button class="color-btn" data-color="pink" style="background: #f48fb1" title="Pink"></button>
              <button class="color-btn" data-color="blue" style="background: #81d4fa" title="Blue"></button>
            </div>
          </div>
          <span class="reader-btn-container">
            <span><i class="fa-regular fa-alarm-clock"></i> <span id="reading-time-display">0m 0s</span></span>
            <button class="btn" id="export-data-btn" title="Export all your highlights as JSON"><i class="fa-solid fa-file-export"></i> Export</button>
          </span>
        </div>
      </div>
    `;

    document.body.appendChild(toolbar);
    document.getElementById("toolbar-toggle-btn").addEventListener("click", () => {
      this.toggleMinimize();
    });
    toolbar.querySelectorAll(".color-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        toolbar.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentColor = btn.getAttribute("data-color");
      });
    });
    document.getElementById("export-data-btn").addEventListener("click", () => {
      this.exportHighlights();
    });
    setInterval(() => {
      const percentageEl = document.getElementById("progress-percentage");
      if (percentageEl) {
        percentageEl.textContent = `${Math.round(this.getReadingPercentage())}%`;
      }
    }, 1000);
  }

  async exportHighlights() {
    let highlights = [];
    
    if (this.storageType === 'indexedDB') {
      highlights = await this.loadFromIndexedDB('highlights', this.articleId);
    } else if (this.storageType === 'localStorage') {
      const allHighlights = this.getFromLocalStorage('highlights') || [];
      highlights = allHighlights.filter(h => h.articleId === this.articleId);
    } else {
      highlights = this.db.highlights.filter(h => h.articleId === this.articleId);
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

    this.showNotification(`Exported ${highlights.length} highlights!`, 'success');
    return exportData;
  }
  
  saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
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
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        if (storeName === 'highlights') {
          const index = store.index('articleId');
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
        const transaction = this.db.transaction([storeName], 'readonly');
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
  }
  
  showResumeDialog(progress) {
    const overlay = document.createElement('div');
    overlay.className = 'reader-dialog-overlay glass-card';
    overlay.innerHTML = `
      <div class="reader-dialog">
        <div class="reader-dialog-header">
          <span class="reader-dialog-icon"><i class="fa-solid fa-book"></i></span>
          <h3 class="reader-dialog-title">Resume Reading?</h3>
        </div>
        <div class="reader-dialog-body">
          You were reading this article earlier. Would you like to continue where you left off?
          <div class="reader-dialog-progress">
            <i class="fa-solid fa-list-check"></i> Progress: <strong>${Math.round(progress.percentage)}%</strong> complete
          </div>
        </div>
        <div class="reader-dialog-checkbox">
          <input type="checkbox" id="dont-ask-resume">
          <label for="dont-ask-resume">Don't ask me again, always resume</label>
        </div>
        <div class="reader-dialog-actions">
          <button class="reader-dialog-btn btn reader-dialog-btn-secondary" id="resume-cancel">Start Over</button>
          <button class="reader-dialog-btn btn reader-dialog-btn-primary" id="resume-confirm">Resume Reading</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.querySelector('#resume-confirm').addEventListener('click', () => {
      const dontAsk = overlay.querySelector('#dont-ask-resume').checked;
      if (dontAsk) {
        this.setPreference('dontAskResume', true);
      }
      window.scrollTo({ top: progress.scrollPosition, behavior: "smooth" });
      document.body.removeChild(overlay);
    });
    overlay.querySelector('#resume-cancel').addEventListener('click', () => {
      const dontAsk = overlay.querySelector('#dont-ask-resume').checked;
      if (dontAsk) {
        this.setPreference('dontAskResume', true);
      }
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }
  
  showConfirmDialog(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'reader-dialog-overlay';
    overlay.innerHTML = `
      <div class="reader-dialog">
        <div class="reader-dialog-header">
          <span class="reader-dialog-icon">⚠️</span>
          <h3 class="reader-dialog-title">${title}</h3>
        </div>
        <div class="reader-dialog-body">
          ${message}
        </div>
        <div class="reader-dialog-actions">
          <button class="reader-dialog-btn reader-dialog-btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="reader-dialog-btn reader-dialog-btn-primary" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      onConfirm();
      document.body.removeChild(overlay);
    });
    
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'reader-notification';
    
    const icons = {
      success: '<i class="fa-solid fa-check-double"></i>',
      error: '<i class="fa-solid fa-bug"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
      info: '<i class="fa-solid fa-exclamation"></i>'
    };
    
    notification.innerHTML = `
      <span class="reader-notification-icon">${icons[type] || icons.info}</span>
      <span class="reader-notification-message">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }
  getPreference(key) {
    try {
      const prefs = localStorage.getItem('blog_reader_preferences');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        return parsed[key];
      }
    } catch (e) {
      console.error('Error reading preferences:', e);
    }
    return null;
  }
  
  setPreference(key, value) {
    try {
      let prefs = {};
      const existing = localStorage.getItem('blog_reader_preferences');
      if (existing) {
        prefs = JSON.parse(existing);
      }
      prefs[key] = value;
      localStorage.setItem('blog_reader_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving preferences:', e);
    }
  }
}
