class Redirect {
  constructor() {
    this.abortController = null;
    this.eventListeners = [];
    this.timeoutIds = [];
    this.isActive = true;
  }

  async init() {
    const theme = localStorage.getItem("layout") || "nexa";
    await this.applyTemplate(`${window.location.origin}/blogs/${theme}.html`);
  }

  async fallBack() {
    this.abortController = new AbortController();
    
    fetch(`${window.location.origin}/404.html`, {
      signal: this.abortController.signal
    })
      .then((response) => {
        if (!this.isActive) return;
        if (!response.ok) throw new Error("Page not found");
        return response.text();
      })
      .then((html) => {
        if (!this.isActive) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        doc.documentElement.querySelectorAll("head script").forEach((s) => s.remove());
        const root404 = doc.documentElement.querySelector("[data-error-page]");
        if (root404) root404.style.display = "flex";
        html = doc.documentElement.outerHTML;
        document.open();
        document.write(html);
        document.close();
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error("Error loading theme:", error);
        if (this.isActive) {
          document.body.innerHTML = "<h1>Page not found</h1>";
        }
      });
  }

  async applyTemplate(templateFile) {
    this.abortController = new AbortController();
    
    fetch(templateFile, {
      signal: this.abortController.signal
    })
      .then((response) => {
        if (!this.isActive) return;
        if (!response.ok) this.fallBack();
        return response.text();
      })
      .then((html) => {
        if (!this.isActive) return;
        const parser = new DOMParser();
        const mainHTML = parser.parseFromString(html, "text/html");
        const placeholder = mainHTML.querySelector("[data-main-content]");
        const currentContent = document.querySelector("[data-layout-content]");
        if (!placeholder && !currentContent) throw new Error("Cannot find page");
        placeholder.innerHTML = currentContent.innerHTML;
        if (mainHTML?.body) {
          mainHTML.body.style.opacity = "0";
        }
        
        const sourceElements = this.getElementsBetweenComments(document.head, "replaceable start", "replaceable end");
        const currentElements = this.getElementsBetweenComments(mainHTML.head, "replaceable start", "replaceable end");
        currentElements.forEach((el) => el.remove());
        const startComment = this.findComment(mainHTML.head, "replaceable start");
        if (startComment) {
          let insertAfter = startComment;
          sourceElements.forEach((el) => {
            const cloned = el.cloneNode(true);
            insertAfter.parentNode.insertBefore(cloned, insertAfter.nextSibling);
            insertAfter = cloned;
          });
        } else {
          console.warn("Start comment not found in current document");
        }
        html = mainHTML.documentElement.outerHTML;
        document.open();
        document.write(html);
        document.close();
        
        const timeoutId = setTimeout(() => {
          if (this.isActive && document?.body) {
            document.body.removeAttribute("style");
          }
        }, 1000);
        this.timeoutIds.push(timeoutId);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        this.fallBack();
      });
  }

  findComment(parent, commentText) {
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_COMMENT, null, false);

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim() === commentText) {
        return node;
      }
    }
    return null;
  }

  getElementsBetweenComments(parent, startText, endText) {
    const elements = [];
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_ALL, null, false);

    let node;
    let collecting = false;

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.COMMENT_NODE) {
        if (node.nodeValue.trim() === startText) {
          collecting = true;
          continue;
        }
        if (node.nodeValue.trim() === endText) {
          break;
        }
      }

      if (collecting && node.nodeType === Node.ELEMENT_NODE) {
        elements.push(node);
      }
    }

    return elements;
  }

  cleanup() {
    // Mark as inactive to prevent further operations
    this.isActive = false;

    // Abort any ongoing fetch requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear all timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];

    // Remove any event listeners that were added
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    console.log("Redirect module cleaned up");
  }
}

function initRedirect() {
  if (window.App?.modules?.redirect) {
    window.App.modules.redirect.cleanup?.();
  }
  const redirectModule = new Redirect();
  window.App.register("redirect", redirectModule, "initRedirect");
  redirectModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRedirect);
} else {
  initRedirect();
}

export { Redirect, initRedirect };