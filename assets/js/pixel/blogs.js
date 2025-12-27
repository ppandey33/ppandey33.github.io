import { GenSvg } from "../gen-svg.js";
import { onComponentLoaded, initPaginator } from "../paginator.js";
class Blogs extends GenSvg {
  constructor() {
    super();
    this.allBlogs = [];
    this.filteredBlogs = [];
    this.currentPage = 1;
    this.itemsPerPage = 9;
    this.svgGenerator = null;
  }

  async init() {
    initPaginator('blog');
    await this.loadBlogs();
    this.setupFilters();
  }

  async loadBlogs() {
    try {
      const data = await window.App.modules.apiClient.loadJSON("/data/blogs.json");
      if (!data?.blogs) throw new Error("Failed to load blogs");

      this.allBlogs = data?.blogs.map((blog) => ({
        id: blog.id,
        title: blog.title,
        excerpt: blog.excerpt,
        category: blog.category,
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
      this.renderPage();
    } catch (error) {
      console.error("Error loading blogs:", error);
      this.showError();
    }
  }

  setupFilters() {
    const filterContainer = document.querySelector("[data-blog-filter]");
    if (!filterContainer) return;
    const searchWrapper = window.App.modules.util.createElement("div", "blog-search-wrapper");
    const searchInput = window.App.modules.util.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search blogs...";
    searchInput.className = "blog-search-input";
    searchWrapper.appendChild(searchInput);
    const categoryWrapper = window.App.modules.util.createElement("div", "blog-category-wrapper");
    const categorySelect = window.App.modules.util.createElement("select", "blog-category-select");

    const categories = this.getUniqueCategories();
    const allOption = window.App.modules.util.createElement("option", "", "All Categories");
    allOption.value = "all";
    categorySelect.appendChild(allOption);

    categories.forEach((category) => {
      const option = window.App.modules.util.createElement("option", "", category);
      option.value = category;
      categorySelect.appendChild(option);
    });
    categoryWrapper.appendChild(categorySelect);
    const sortWrapper = window.App.modules.util.createElement("div", "blog-sort-wrapper");
    const sortSelect = window.App.modules.util.createElement("select", "blog-sort-select");
    const sortOptions = [
      { value: "date-desc", label: "Newest First" },
      { value: "date-asc", label: "Oldest First" },
      { value: "title-asc", label: "Title (A-Z)" },
      { value: "title-desc", label: "Title (Z-A)" },
    ];

    sortOptions.forEach((opt) => {
      const option = window.App.modules.util.createElement("option", "", opt.label);
      option.value = opt.value;
      sortSelect.appendChild(option);
    });
    sortWrapper.appendChild(sortSelect);

    filterContainer.appendChild(searchWrapper);
    filterContainer.appendChild(categoryWrapper);
    filterContainer.appendChild(sortWrapper);
    searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
    categorySelect.addEventListener("change", (e) => this.handleCategoryFilter(e.target.value));
    sortSelect.addEventListener("change", (e) => this.handleSort(e.target.value));
  }

  getUniqueCategories() {
    const categories = [...new Set(this.allBlogs.map((blog) => blog.category))];
    return categories.sort();
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase();
    this.filteredBlogs = this.allBlogs.filter(
      (blog) =>
        blog.title.toLowerCase().includes(searchTerm) ||
        blog.excerpt.toLowerCase().includes(searchTerm) ||
        blog.author.toLowerCase().includes(searchTerm) ||
        blog.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
    this.currentPage = 1;
    this.renderPage();
  }

  handleCategoryFilter(category) {
    if (category === "all") {
      this.filteredBlogs = [...this.allBlogs];
    } else {
      this.filteredBlogs = this.allBlogs.filter((blog) => blog.category === category);
    }
    this.currentPage = 1;
    this.renderPage();
  }

  handleSort(sortBy) {
    this.filteredBlogs.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return b.dateObj - a.dateObj;
        case "date-asc":
          return a.dateObj - b.dateObj;
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    this.currentPage = 1;
    this.renderPage();
  }

  renderPage() {
    const blogContainer = document.querySelector("[data-post-content]");
    if (!blogContainer) return;

    blogContainer.innerHTML = "";

    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const pageBlogs = this.filteredBlogs.slice(startIdx, endIdx);

    if (pageBlogs.length === 0) {
      const noResults = window.App.modules.util.createElement("p", "blog-no-results", "No blog posts found");
      blogContainer.appendChild(noResults);
      this.renderPagination();
      return;
    }

    pageBlogs.forEach((blog, index) => {
      const card = this.createBlogCard(blog, index);
      blogContainer.appendChild(card);
    });

    this.renderPagination();
  }

  createBlogCard(blog, index) {
    const card = window.App.modules.util.createElement("article", `blog-card ${index % 3 === 0 ? "fade-left" : index % 3 === 2 ? "fade-right" : "zoom"}`);
    let imageContainer = window.App.modules.util.createElement("div", "blog-image");
    if (this.displayMultiTextSVG) {
      this.displayMultiTextSVG(blog?.tags.slice(0, 6) || ["No Image"], imageContainer).then((img) => {
        imageContainer = img;

        const categoryBadge = window.App.modules.util.createElement("div", "blog-category-badge", blog.category);
        imageContainer.appendChild(categoryBadge);
        const shades = window.App.modules.util.createElement("div", "image-shades");
        imageContainer.appendChild(shades);
      });
    } else {
      const categoryBadge = window.App.modules.util.createElement("div", "blog-category-badge", blog.category);
      imageContainer.appendChild(categoryBadge);
    }

    card.appendChild(imageContainer);

    const info = window.App.modules.util.createElement("div", "blog-info"),
      meta = window.App.modules.util.createElement("div", "blog-meta"),
      date = window.App.modules.util.createElement("span", "blog-date"),
      dateIcon = window.App.modules.util.createElement("span", "blog-meta-icon fa fa-regular");
    dateIcon.innerHTML = "&#xf133;";
    date.appendChild(dateIcon);
    date.appendChild(document.createTextNode(this.formatDate(blog.dateObj)));

    const readTime = window.App.modules.util.createElement("span", "blog-read-time"),
      timeIcon = window.App.modules.util.createElement("span", "blog-meta-icon fa fa-regular");
    timeIcon.innerHTML = "&#xf34e;";
    readTime.appendChild(timeIcon);
    readTime.appendChild(document.createTextNode(blog.readTime));

    meta.appendChild(date);
    meta.appendChild(readTime);
    info.appendChild(meta);
    const title = window.App.modules.util.createElement("h3", "blog-title", blog.title);
    info.appendChild(title);
    const excerpt = window.App.modules.util.createElement("p", "blog-excerpt", blog.excerpt);
    info.appendChild(excerpt);
    if (blog.tags && blog.tags.length > 0) {
      const tagsContainer = window.App.modules.util.createElement("div", "blog-tags");
      blog.tags.slice(0, 3).forEach((tag) => {
        const tagEl = window.App.modules.util.createElement("span", "blog-tag", tag);
        tagsContainer.appendChild(tagEl);
      });
      info.appendChild(tagsContainer);
    }
    const footer = window.App.modules.util.createElement("div", "blog-footer");

    const author = window.App.modules.util.createElement("div", "blog-author");
    const avatar = window.App.modules.util.createElement("div", "blog-author-avatar", blog.author.charAt(0).toUpperCase());
    const authorName = window.App.modules.util.createElement("span", "", blog.author);
    author.appendChild(avatar);
    author.appendChild(authorName);

    const readMore = window.App.modules.util.createElement("a", "blog-read-more", "Read more");
    const blogUrl = blog.categorySlug ? `/blogs/${blog.categorySlug}/${blog.slug}/` : `#blog-${blog.id}`;
    readMore.href = blogUrl;

    footer.appendChild(author);
    footer.appendChild(readMore);
    info.appendChild(footer);

    card.appendChild(info);
    return card;
  }

  renderPagination() {
    onComponentLoaded.next({
      type: "pagination",
      id: "blog",
      mode: "server",
      itemsPerPage: this.itemsPerPage,
      totalItems: this.filteredBlogs.length,
      currentPage: this.currentPage,
      onPageChange: (page) => {
        this.currentPage = page;
        this.renderPage();
        this.scrollToTop();
      },
    });
  }

  scrollToTop() {
    const section = document.querySelector("#blogs");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  formatDate(date) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  showError() {
    const blogContainer = document.querySelector("[data-post-content]");
    if (blogContainer) {
      blogContainer.innerHTML = '<p class="blog-no-results">Failed to load blog posts. Please try again later.</p>';
    }
  }

  cleanup() {
    const blogContainer = document.querySelector("[data-post-content]");
    const filterContainer = document.querySelector("[data-blog-filter]");
    const paginationContainers = document.querySelectorAll("[data-blog-pager]");

    if (blogContainer) blogContainer.innerHTML = "";
    if (filterContainer) filterContainer.innerHTML = "";
    paginationContainers.forEach((container) => (container.innerHTML = ""));

    this.allBlogs = [];
    this.filteredBlogs = [];
    this.currentPage = 1;
    this.svgGenerator = null;
  }
}

function initBlogs() {
  if (window.App?.modules?.blogs) {
    window.App.modules.blogs.cleanup?.();
  }
  const blogsModule = new Blogs();
  window.App.register("blogs", blogsModule, "initBlogs");
  blogsModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBlogs);
} else {
  initBlogs();
}

export { Blogs, initBlogs };
