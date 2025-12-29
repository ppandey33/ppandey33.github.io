class Blog {
    constructor() {
      this.prefix = this.getDataPathPrefix();
      this.BLOGS_PATH = `${this.prefix}data/blogs.json`;
      this.currentBlog = null;
    }
    getDataPathPrefix() {
      const path = window.location.pathname;
      const depth = path.split("/").filter((p) => p && p !== "index.html").length;
      if (depth === 0 || path === "/" || path === "/index.html") {
        return "";
      }
      return "../".repeat(depth);
    }
    getCurrentBlogInfo() {
      const path = window.location.pathname;
      const segments = path.split("/").filter((s) => s && s !== "index.html");
      const postsIndex = segments.indexOf("blogs");
      if (postsIndex !== -1 && segments.length > postsIndex + 2) {
        return {
          categorySlug: segments[postsIndex + 1],
          slug: segments[postsIndex + 2],
        };
      }
      return null;
    }
    async init() {
      await this.initBlogPostPage();
    }
    async initBlogPostPage() {
      try {
        const data = await window.App.modules.apiClient.loadJSON(this.BLOGS_PATH);
        if (!data?.blogs) {
          throw new Error("Failed to load blogs");
        }
        const blogInfo = this.getCurrentBlogInfo();
        if (!blogInfo) {
          console.error("Could not determine blog info from URL");
          return;
        }
        this.currentBlog = data?.blogs.find((blog) => 
          blog.slug === blogInfo.slug && blog.categorySlug === blogInfo.categorySlug
        );
        if (!this.currentBlog) {
          console.error("Blog not found");
          return;
        }
        this.populateMetadata(this.currentBlog);
        this.populateTags(this.currentBlog.tags);
        this.setupNavigation(data?.blogs, this.currentBlog, blogInfo.categorySlug);
        await this.setupShareButtons(this.currentBlog);
      } catch (error) {
        console.error("Error loading blog post:", error);
      }
    }
    populateMetadata(blog) {
      document.querySelectorAll("[data-blog-meta]").forEach((element) => {
        const field = element.getAttribute("data-blog-meta");
        let value = blog[field];
        const textField = element.getAttribute("data-blog-meta-text");
        if (textField) {
          if (field === "originalUrl") {
            const date = new Date(blog.date);
            const formattedDate = date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            if (value) {
              element.href = value;
              element.textContent = `${formattedDate}, Published on C# Corner`;
              element.target = "_blank";
              element.rel = "noopener noreferrer";
            } else {
              element.href = "#";
              element.textContent = `${formattedDate}`;
              element.style.pointerEvents = "none";
              element.style.cursor = "default";
              element.style.textDecoration = "none";
            }
          }
        } else {
          element.textContent = value;
        }
      });
      document.title = `${blog.title} | Pawan Pandey`;
    }
    populateTags(tags) {
      const tagsContainer = document.querySelector("#blog-tags");
      if (!tagsContainer || !tags || tags.length === 0) return;
      tagsContainer.innerHTML = tags.map((tag) => 
        `<span class="tag">${this.escapeHtml(tag)}</span>`
      ).join("");
    }
    setupNavigation(blogs, currentBlog, categorySlug) {
      const categoryBlogs = blogs.filter((b) => b.categorySlug === categorySlug);
      const currentIndex = categoryBlogs.findIndex((b) => b.slug === currentBlog.slug);
      if (currentIndex === -1) {
        console.error("Current blog not found in category!");
        return;
      }
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
      if (currentIndex > 0) {
        const prevPost = categoryBlogs[currentIndex - 1];
        if (prevBtn) {
          prevBtn.style.display = "inline-flex";
          prevBtn.title = prevPost.title;
          prevBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = `/blogs/${prevPost.categorySlug}/${prevPost.slug}/`;
          };
        }
      }
      if (currentIndex < categoryBlogs.length - 1) {
        const nextPost = categoryBlogs[currentIndex + 1];
        if (nextBtn) {
          nextBtn.style.display = "inline-flex";
          nextBtn.title = nextPost.title;
          nextBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = `/blogs/${nextPost.categorySlug}/${nextPost.slug}/`;
          };
        }
      }
    }
    async setupShareButtons(blog) {
      const currentUrl = window.location.href;
      const title = encodeURIComponent(blog.title);
      const url = encodeURIComponent(currentUrl);
      try {
        const sharePlatforms = await window.App.modules.apiClient.loadJSON(`${this.prefix}data/share.json`);
        if (!sharePlatforms || !Array.isArray(sharePlatforms)) {
          console.error('Invalid share platforms data');
          return;
        }
        const shareContainer = document.querySelector('[data-blog-share]');
        if (!shareContainer) {
          console.error('Share buttons container not found');
          return;
        }
        shareContainer.innerHTML = '';
        sharePlatforms.forEach(platform => {
          let shareLink = platform.link
            .replace('{url}', url)
            .replace('{title}', title);
          const button = window.App.modules.util.createElement('a', `share-btn ${platform.id} contact-social glass-card ${(platform?.class || '')}`);
          button.href = shareLink;
          button.id = `share-${platform.id}`;
          button.title = platform.title;
          button.target = '_blank';
          button.rel = 'noopener noreferrer';
          button.setAttribute('aria-label', platform.title);
          button.innerHTML = platform.icon;
          shareContainer.appendChild(button);
        });
      } catch (error) {
        console.error('Error loading share platforms:', error);
      }
    }
    escapeHtml(text) {
      const div = window.App.modules.util.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    cleanup() {
      const prevBtn = document.getElementById("prev-post");
      const nextBtn = document.getElementById("next-post");
      const shareContainer = document.querySelector('[data-blog-share]');
      if (prevBtn) prevBtn.onclick = null;
      if (nextBtn) nextBtn.onclick = null;
      if (shareContainer) shareContainer.innerHTML = '';
      this.currentBlog = null;
    }
  }
function initBlog() {
  if (window.App?.modules?.blog) {
    window.App.modules.blog.cleanup?.();
  }
  const blogModule = new Blog();
  window.App.register("blog", blogModule, 'initBlog');
  blogModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBlog);
} else {
  initBlog();
}
export { Blog, initBlog };