class Blog {
  constructor() {
    this.prefix = this.getDataPathPrefix();
    this.BLOGS_PATH = `${this.prefix}data/blogs.json`;
    this.SHARE_PATH = `${this.prefix}data/share.json`;
    this.eventListeners = [];
  }

  getDataPathPrefix() {
    const path = window.location.pathname;
    const depth = path.split("/").filter((p) => p && p !== "index.html").length;
    return depth === 0 || path === "/" || path === "/index.html" ? "" : "../".repeat(depth);
  }

  getCurrentBlogInfo() {
    const segments = window.location.pathname.split("/").filter((s) => s && s !== "index.html");
    const postsIndex = segments.indexOf("blogs");
    return postsIndex !== -1 && segments.length > postsIndex + 2 ? { categorySlug: segments[postsIndex + 1], slug: segments[postsIndex + 2] } : null;
  }

  async initBlogPostPage() {
    try {
      const blogs = await window.App.modules.apiClient.loadJSON(this.BLOGS_PATH);
      if (!blogs) throw new Error("Failed to load blogs");

      const blogInfo = this.getCurrentBlogInfo();
      if (!blogInfo) return console.error("Could not determine blog info from URL");

      const currentBlog = blogs.find((b) => b.slug === blogInfo.slug && b.categorySlug === blogInfo.categorySlug);
      if (!currentBlog) return console.error("Blog not found");

      this.populateMetadata(currentBlog);
      this.populateTags(currentBlog.tags);
      this.setupNavigation(blogs, currentBlog, blogInfo.categorySlug);
      await this.setupShareButtons(currentBlog);
    } catch (error) {
      console.error("Error loading blog post:", error);
    }
  }

  async getGoatCount(page) {
    try {
      const res = await window.App.modules.apiClient.loadJSON(page);
      if (res.ok) {
        const data = await res.json();
        console.log(`${JSON.stringify(data)}`);
        return data.count;
      }
    } catch (error) {
      console.error("Error fetching GoatCounter data:", error);
      return null;
    }
  }

  populateMetadata(blog) {
    document.querySelectorAll("[data-blog-meta]").forEach((el) => {
      const field = el.getAttribute("data-blog-meta");
      const value = blog[field];

      if (el.getAttribute("data-blog-meta-text") && field === "originalUrl") {
        const date = new Date(blog.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        el.href = value || "#";
        el.textContent = value ? `${date}, Published on C# Corner` : date;
        if (value) {
          el.target = "_blank";
          el.rel = "noopener noreferrer";
        } else {
          Object.assign(el.style, { pointerEvents: "none", cursor: "default", textDecoration: "none" });
        }
      } else {
        el.textContent = value;
      }
    });
    document.title = `${blog.title} | Pawan Pandey`;
  }

  populateTags(tags) {
    const container = document.querySelector("blog-tags");
    if (container && tags?.length) {
      container.innerHTML = tags.map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join("");
    }
  }

  setupNavigation(blogs, currentBlog, categorySlug) {
    const categoryBlogs = blogs.filter((b) => b.categorySlug === categorySlug);
    const idx = categoryBlogs.findIndex((b) => b.slug === currentBlog.slug);
    if (idx === -1) return console.error("Current blog not found in category!");

    const nav = { prev: document.getElementById("prev-post"), next: document.getElementById("next-post") };
    Object.values(nav).forEach((btn) => btn && ((btn.style.display = "none"), (btn.onclick = null)));

    if (idx > 0 && nav.prev) this.setNavButton(nav.prev, categoryBlogs[idx - 1]);
    if (idx < categoryBlogs.length - 1 && nav.next) this.setNavButton(nav.next, categoryBlogs[idx + 1]);
  }

  setNavButton(btn, post) {
    btn.style.display = "inline-flex";
    btn.title = post.title;
    const handler = (e) => {
      e.preventDefault();
      window.location.href = `/blogs/${post.categorySlug}/${post.slug}/`;
    };
    btn.onclick = handler;
    this.eventListeners.push({ el: btn, type: "click", handler });
  }

  async setupShareButtons(blog) {
    try {
      const buttons = await window.App.modules.apiClient.loadJSON(this.SHARE_PATH);
      if (!Array.isArray(buttons)) return console.error("Invalid share platforms data");

      const container = document.querySelector("[data-blog-share]");
      if (!container) return console.error("Share buttons container not found");

      container.innerHTML = "";
      const indices = (container.getAttribute("data-blog-share") || [...Array(buttons.length).keys()].join(",")).split(",").map(Number);
      const type = container.getAttribute("type") || "icon";

      indices.forEach(async (i) => {
        const button = buttons[i];
        if (!button) return;

        if (button.child?.length) {
          const dropdown = window.App.modules.util.createDropdownButton(button, type);
          const mainBtn = dropdown?.querySelector("[data-selected-value]");
          if (mainBtn) {
            const handler = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const val = e.target.getAttribute("data-selected-value");
              if (val) this.handleButtonAction(button.rel, button.data, val);
            };
            mainBtn.addEventListener("click", handler);
            this.eventListeners.push({ el: mainBtn, type: "click", handler });
            container.appendChild(dropdown);
          }
        } else {
          const btn = window.App.modules.util.createSimpleButton(button, type);
          const handler = (e) => {
            e.preventDefault();
            this.handleButtonAction(button.rel, button.data);
          };
          btn.addEventListener("click", handler);
          this.eventListeners.push({ el: btn, type: "click", handler });
          container.appendChild(btn);
          if (button?.data?.goat) {
            await this.getGoatCount(`${button?.data?.goat}${encodeURIComponent(window.location.pathname)}.json`);
          }
        }
      });
    } catch (error) {
      console.error("Error loading share platforms:", error);
    }
  }

  handleButtonAction(rel, data, childText) {
    const actions = {
      share: () => window.App.modules.util.share("Pawan Portfolio"),
      coffee: () => this.openModal("support", data),
      comments: () => this.openModal("comments", data),
    };
    actions[rel]?.();
  }

  openModal(type, data) {
    let opened = false;
    window.App.modules.util.openDialog(type).then((res) => {
      if (res && !opened) {
        opened = true;
        type === "support" ? this.generateCoffee(data) : this.loadGiscus(data);
      }
    });
  }

  async loadGiscus(data) {
    const container = document.querySelector("[data-giscus-content]");
    if (!container || !data) return;

    //window.App.modules.loader.show();
    container.innerHTML = "";

    const theme = this.getThemeUrl(data["data-theme"]);
    const script = document.createElement("script");
    script.src = data.src;

    Object.entries(data).forEach(([key, val]) => {
      if (key !== "src" && !key.startsWith("script.")) {
        script.setAttribute(key, key === "data-theme" ? theme : val);
      }
    });

    script.async = data["script.async"] || true;
    const loadHandler = () => {
      setTimeout(() => {
        //window.App.modules.loader.hide();
      }, 500);
    };
    const errorHandler = () => {
      //window.App.modules.loader.hide();
      console.error("Failed to load Giscus");
    };
    script.addEventListener("load", loadHandler);
    script.addEventListener("error", errorHandler);
    this.eventListeners.push({ el: script, type: "load", handler: loadHandler }, { el: script, type: "error", handler: errorHandler });
    setTimeout(() => {
      setTimeout(() => {
        try {
          iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: "preferred_color_scheme" } } }, "https://giscus.app");
        } catch (error) {
          console.log("Cannot communicate with Giscus iframe (cross-origin)");
        }
      }, 1000);
    }, 5000);

    container.appendChild(script);
  }

  getThemeUrl(baseUrl) {
    const dataset = document.querySelector("body")?.dataset || {};
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const selectedTheme = dataset.theme || localStorage.getItem("theme") || "charcoal";
    const sysTheme = dataset.sysTheme === "true";

    const suffix = sysTheme && this.needsThemeSuffix(selectedTheme, isDark) ? "-on" : "";

    return `${baseUrl}${selectedTheme}${suffix}.css`;
  }

  needsThemeSuffix(theme, isDark) {
    const lightThemes = ["lavender", "charcoal"];
    const darkThemes = ["pearl"];

    return (lightThemes.includes(theme) && !isDark) || (darkThemes.includes(theme) && isDark);
  }

  async generateCoffee(data) {
    const container = document.querySelector("[data-support-content]");
    if (!container || !data) return;

    //window.App.modules.loader.show();
    container.innerHTML = "";

    const introPara = window.App.modules.util.createElement("p", "modal-msg", data.msg);
    container.appendChild(introPara);

    const color = getComputedStyle(document.body).getPropertyValue("--primary").trim() || getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#00ffcc";
    const url = `${data.url}?${new URLSearchParams({ color }).toString()}`;

    await this.generateCoffeePage(url);

    const footerText = window.App.modules.util.createElement("p", "footer-text", data.footer);
    container.appendChild(footerText);
  }

  async generateCoffeePage(url) {
    const container = document.querySelector("[data-support-content]");
    if (!container) return;

    const wrapper = window.App.modules.util.createElement("div", "coffee-iframe-wrapper");
    const iframe = window.App.modules.util.createElement("iframe");

    Object.assign(iframe, { id: "coffee-support-iframe", src: url });
    iframe.style.display = "none";
    iframe.setAttribute("class", "support-frame");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "auto");
    iframe.setAttribute("allowtransparency", "true");

    const loadHandler = () => this.onIframeLoad(iframe);
    const errorHandler = () => this.onIframeError(iframe);

    iframe.addEventListener("load", loadHandler);
    iframe.addEventListener("error", errorHandler);
    this.eventListeners.push({ el: iframe, type: "load", handler: loadHandler }, { el: iframe, type: "error", handler: errorHandler });

    setTimeout(() => window.App.modules.loader.isLoaderOn && this.onIframeLoad(iframe), 5000);

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);
  }

  onIframeLoad(iframe) {
    setTimeout(() => {
      //window.App.modules.loader.hide();
      Object.assign(iframe.style, { display: "block", opacity: "0", transition: "opacity 0.3s ease" });
      setTimeout(() => (iframe.style.opacity = "1"), 10);
    }, 300);
  }

  onIframeError(iframe) {
    //window.App.modules.loader.hide();
  }

  escapeHtml(text) {
    const div = window.App.modules.util.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  init() {
    this.initBlogPostPage();
  }

  cleanup() {
    this.eventListeners.forEach(({ el, type, handler }) => {
      el?.removeEventListener(type, handler);
    });
    this.eventListeners = [];
    const shareContainer = document.querySelector("[data-blog-share]");
    if (shareContainer) shareContainer.innerHTML = "";

    const tagsContainer = document.querySelector("blog-tags");
    if (tagsContainer) tagsContainer.innerHTML = "";

    const giscusContainer = document.querySelector("[data-giscus-content]");
    if (giscusContainer) giscusContainer.innerHTML = "";

    const supportContainer = document.querySelector("[data-support-content]");
    if (supportContainer) supportContainer.innerHTML = "";
    const prevBtn = document.getElementById("prev-post");
    const nextBtn = document.getElementById("next-post");
    if (prevBtn) {
      prevBtn.style.display = "none";
      prevBtn.onclick = null;
    }
    if (nextBtn) {
      nextBtn.style.display = "none";
      nextBtn.onclick = null;
    }
  }
}

function initBlog() {
  if (window.App?.modules?.blog) {
    window.App.modules.blog.cleanup?.();
  }
  const blogModule = new Blog();
  window.App.register("blog", blogModule, "initBlog");
  blogModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBlog);
} else {
  initBlog();
}

export { Blog, initBlog };
