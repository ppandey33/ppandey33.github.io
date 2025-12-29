import { GenSvg } from "../gen-svg.js";
class Info extends GenSvg {
  constructor() {
    super({ currentPath: "/blogs" });
    this.config = null;
    this.filteredBlogs = [];
    this.currentPage = 1;
    this.itemsPerPage = 9;
    this.goat = "";
    this.allBlogs = [];
  }
  async init() {
    if (this.isHome) {
      await this.loadSkills();
      await this.updateSiteInfo();
      const info = document.querySelectorAll("[data-img]");
      info && info.forEach((e)=> e.remove());
    } else {
      const info = document.querySelectorAll("[data-clean-panel]");
      info && info.forEach((e)=> e.remove());
      await this.loadBlogs();
    }
  }
  async loadSkills() {
    const data = await window.App.modules.apiClient.loadJSON("/data/skills.json");
    if (!data) return;
    const container = document.querySelector("[data-skills-info]");
    if (container) {
      container.innerHTML = "";
      data.forEach((skillsData) => {
        const categoryCard = window.App.modules.util.createElement("div", "skill-info-category"),
          cardHeader = window.App.modules.util.createElement("div", "skill-info-header"),
          categoryName = window.App.modules.util.createElement("h3", "skill-info-category-name", skillsData.category),
          catIcon = window.App.modules.util.createElement("span", `skill-info-category-icon ${skillsData.class || ""}`);
        catIcon.innerHTML = skillsData.icon;
        cardHeader.appendChild(catIcon), cardHeader.appendChild(categoryName), categoryCard.appendChild(cardHeader);
        const skillList = window.App.modules.util.createElement("ul", "skill-info-list");
        skillsData.skills.forEach((skill) => {
          const skillItem = window.App.modules.util.createElement("li", "skill-info-item");
          const skillName = window.App.modules.util.createElement("span", "skill-info-name", skill.name);
          const skillLevel = window.App.modules.util.createElement(
            "span",
            `skill-info-level ${skill.level}`,
            skill.level?.replace(/\b\w/g, (char) => char.toUpperCase())
          );
          skillItem.appendChild(skillName);
          skillItem.appendChild(skillLevel);
          skillList.appendChild(skillItem);
        });
        categoryCard.appendChild(skillList);
        container.appendChild(categoryCard);
      });
    }
  }
  async updateSiteInfo() {
    this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
    if (!this.config) return;
    document.querySelectorAll("[data-social]").forEach((el) => {
      el.innerHTML = "";
      this.config.social
        ?.filter((s) => s.url && s.url !== "")
        .forEach((socialData) => {
          const aEl = window.App.modules.util.createElement("a", `contact-social  ${socialData?.class || ""}`);
          aEl.target = "_blank";
          aEl.href = socialData?.url;
          aEl.innerHTML = socialData.icon;
          el.appendChild(aEl);
        });
    });
  }
  async loadBlogs() {
    try {
      const data = await window.App.modules.apiClient.loadJSON("/data/blogs.json");
      this.goat = data?.goat;
      if (!data?.blogs) throw new Error("Failed to load blogs");
      this.allBlogs = data?.blogs.map((blog) => ({
        id: blog.id,
        title: blog.title,
        excerpt: blog.excerpt,
        category: blog.category,
        categoryIcon: blog.categoryIcon,
        categoryClass: blog.categoryClass,
        tags: blog.tags || [],
        author: blog.author,
        date: blog.date,
        dateObj: new Date(blog.date),
        readTime: blog.readTime,
        image: blog.image,
        slug: blog.slug,
        categorySlug: blog.categorySlug,
      }));
      this.allBlogs.sort((a, b) => b.dateObj - a.dateObj);
      this.filteredBlogs = [...this.allBlogs];
      const segments = window.location.pathname.split("/").filter(Boolean);
      if (segments.length > 1 && segments[0] == "blogs") {
        this.filteredBlogs = this.allBlogs.filter((blog) => blog.categorySlug.toLowerCase().includes(segments[1].toLowerCase()));
      }
      const tags = [...new Set(this.filteredBlogs.flatMap((item) => item.tags))].sort(() => Math.random() - 0.5).slice(0, 6);
      const imageContainer = document.querySelector('[data-img]');
      this.displayMultiTextSVG(tags || ["No Image"], imageContainer).then((img) => {
         img.appendChild(window.App.modules.util.createElement('div', 'image-shades'));
      });
      await this.renderInfoBlogs();
    } catch (error) {
      console.error("Error loading blogs:", error);
    }
  }
  async renderInfoBlogs() {
    const container = document.querySelector("[data-skills-info]");
    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const pageBlogs = this.filteredBlogs.slice(startIdx, endIdx);
    if (container && pageBlogs.length > 0) {
      const blogsByCategory = pageBlogs.reduce((acc, blog) => {
        const category = blog.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(blog);
        return acc;
      }, {});
      const sortedCategories = Object.keys(blogsByCategory).sort();
      sortedCategories.forEach((category) => {
        const blogs = blogsByCategory[category];
        const firstBlog = blogs[0];
        const categoryCard = window.App.modules.util.createElement("div", "skill-info-category");
        const cardHeader = window.App.modules.util.createElement("div", "skill-info-header");
        const categoryName = window.App.modules.util.createElement("h3", "skill-info-category-name", category);
        const catIcon = window.App.modules.util.createElement("span", `skill-info-category-icon ${firstBlog.categoryClass || ""}`);
        catIcon.innerHTML = firstBlog.categoryIcon;
        cardHeader.appendChild(catIcon);
        cardHeader.appendChild(categoryName);
        categoryCard.appendChild(cardHeader);
        const blogsContainer = window.App.modules.util.createElement("ul", "skill-info-list");
        blogs.forEach((blog) => {
          this.createBlogItem(blog).then((blogItem) => {
            blogsContainer.appendChild(blogItem);
          });
        });
        categoryCard.appendChild(blogsContainer);
        container.appendChild(categoryCard);
        container.appendChild(window.App.modules.util.createElement("p", "cat-border"));
      });
    } else if (container) {
      const noResults = window.App.modules.util.createElement("p", "blog-no-results", "No blog posts found");
      container.appendChild(noResults);
    }
  }
  async getGoatCount(page) {
    try {
      const res = await window.App.modules.apiClient.loadJSON(page);
      let value = res?.count_unique ?? res?.count;
      value = typeof value === "string" ? Number(value.replace(/[,_\s]/g, "")) : value;
      const format = (v) =>
        v == null || !Number.isFinite(v)
          ? "∞"
          : v < 100
          ? `${v}+`
          : v >= 1e12
          ? `${(v / 1e12).toFixed(1).replace(/\.0$/, "")}t+`
          : v >= 1e6
          ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}m+`
          : v >= 1e3
          ? `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}k+`
          : `${v}+`;
      return format(value);
    } catch (error) {
      console.error("Error fetching GoatCounter data:", error);
      return "∞";
    }
  }
  async createBlogItem(blog) {
    const blogItem = window.App.modules.util.createElement("a", "info-blog-item");
    const blogUrl = blog.categorySlug ? `/blogs/${blog.categorySlug}/${blog.slug}/` : `#blog-${blog.id}`;
    blogItem.href = blogUrl;
    const title = window.App.modules.util.createElement("h4", "info-blog-title", blog.title);
    const readCount = await this.getGoatCount(`${this.goat}${encodeURIComponent("blogs/" + blog?.categorySlug)}/${encodeURIComponent(blog?.slug)}.json`);
    const meta = window.App.modules.util.createElement("div", "info-blog-meta");
    meta.innerHTML = `
    <span class="info-blog-date">${blog.date}</span>
    <span class="info-blog-read-time">${blog.readTime}</span>
    <span class="info-blog-reads">${readCount} Reads</span>
  `;
    blogItem.appendChild(title);
    blogItem.appendChild(meta);
    return blogItem;
  }
  cleanup() {
    const container = document.querySelector("[data-skills-info]");
    if (container) container.innerHTML = "";
    document.querySelectorAll("[data-social]").forEach((el) => {
      el.innerHTML = "";
    });
    this.config = null;
  }
}
function initInfo() {
  if (window.App?.modules?.info) {
    window.App.modules.info.cleanup?.();
  }
  const infoModule = new Info();
  window.App.register("info", infoModule, "initInfo");
  infoModule.init();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInfo);
} else {
  initInfo();
}
export { Info, initInfo };
