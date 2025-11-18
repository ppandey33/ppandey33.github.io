// Blogs Listing and Filtering
(function () {
  ("use strict");

  function getDataPathPrefix() {
    const path = window.location.pathname;
    const depth = path.split("/").filter((p) => p && p !== "index.html").length;

    if (depth === 0 || path === "/" || path === "/index.html") {
      return "";
    }

    return "../".repeat(depth);
  }

  const prefix = getDataPathPrefix();
  const BLOGS_PATH = `${prefix}data/blogs.json`;
  let allBlogs = [];
  let filteredBlogs = [];
  let selectedCategory = "all";
  let categories = {};

  // Fetch blog posts
  async function fetchBlogs() {
    try {
      const response = await fetch(BLOGS_PATH);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blogs = await response.json();
      allBlogs = blogs.map((blog) => ({
        ...blog,
        dateObj: new Date(blog.date),
      }));
      // Sort by date (newest first)
      allBlogs.sort((a, b) => b.dateObj - a.dateObj);

      // Extract categories with slugs
      categories = extractCategories(allBlogs);

      filteredBlogs = [...allBlogs];

      renderBlogs(filteredBlogs);
      setupCategoryFilters();
      setupCategoryDropdown();
      setupSearch();
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      document.getElementById("blogs-container").innerHTML =
        '<div class="error-state"><p>Failed to load blog posts. Please try again later.</p></div>';
    }
  }

  // Extract unique categories with their slugs
  function extractCategories(blogs) {
    const categoriesMap = new Map();

    blogs.forEach((blog) => {
      if (!categoriesMap.has(blog.category)) {
        categoriesMap.set(blog.category, {
          name: blog.category,
          slug: blog.categorySlug,
          count: 0,
        });
      }
      categoriesMap.get(blog.category).count++;
    });

    return Object.fromEntries(categoriesMap);
  }

  // Render blog posts
  function renderBlogs(blogs) {
    const container = document.getElementById("blogs-container");
    const emptyState = document.getElementById("blogs-empty");

    if (!container) return;

    if (blogs.length === 0) {
      container.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    container.style.display = "grid";
    if (emptyState) emptyState.style.display = "none";

    container.innerHTML = "";

    blogs.forEach((blog) => {
      const card = createBlogCard(blog);
      container.appendChild(card);
    });
  }

  // Create blog card
  function createBlogCard(blog) {
    const card = document.createElement("article");
    card.className = "blog-card glass-card";
    card.dataset.blogId = blog.id;

    const formattedDate = formatDate(blog.dateObj);
    const blogUrl = blog.categorySlug
      ? `/blogs/posts/${blog.categorySlug}/${blog.slug}/`
      : blog.originalUrl;

    card.innerHTML = `
    <div class="blog-header">
      <div class="blog-category">${blog.category}</div>
      <h3 class="blog-title">
        <a href="${blogUrl}" ${
      !blog.categorySlug ? 'target="_blank" rel="noopener"' : ""
    }>
          ${escapeHtml(blog.title)}
        </a>
      </h3>
    </div>
    
    <p class="blog-excerpt">${escapeHtml(blog.excerpt)}</p>
    
    <div class="blog-meta">
      <span>✍️ ${blog.author}</span>
      <span>📅 ${formattedDate}</span>
      <span>⏱️ ${blog.readTime}</span>
    </div>
    
    ${
      blog.tags && blog.tags.length > 0
        ? `
      <div class="blog-tags">
        ${blog.tags
          .map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
    `
        : ""
    }
    
    <div class="blog-footer">
      <a href="${blogUrl}" 
         ${!blog.categorySlug ? 'target="_blank" rel="noopener"' : ""}
         class="btn btn-secondary">
        Read Article ${!blog.categorySlug ? "↗" : "→"}
      </a>
    </div>
  `;

    return card;
  }
  
  // Set up category filters (buttons)
  function setupCategoryFilters() {
    const container = document.getElementById("blog-categories");
    if (!container) return;

    container.innerHTML = "";

    // Add "All" button
    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All";
    allBtn.dataset.category = "all";
    allBtn.addEventListener("click", () => handleCategoryClick("all", allBtn));
    container.appendChild(allBtn);

    // Add category buttons
    Object.values(categories).forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.textContent = `${cat.name} (${cat.count})`;
      btn.dataset.category = cat.name;
      btn.addEventListener("click", () => handleCategoryClick(cat.name, btn));
      container.appendChild(btn);
    });
  }

  // Set up category dropdown
  function setupCategoryDropdown() {
    const dropdown = document.getElementById("category-dropdown");
    if (!dropdown) return;

    dropdown.innerHTML = `
      <option value="all">All Categories</option>
      ${Object.values(categories)
        .map(
          (cat) =>
            `<option value="${cat.name}">${cat.name} (${cat.count})</option>`
        )
        .join("")}
    `;

    dropdown.addEventListener("change", (e) => {
      const category = e.target.value;
      selectedCategory = category;

      // Update button states
      const buttons = document.querySelectorAll(".filter-btn");
      buttons.forEach((btn) => {
        if (btn.dataset.category === category) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      applyFilters();
    });
  }

  // Handle category button click
  function handleCategoryClick(category, button) {
    // Update active state
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    // Update dropdown
    const dropdown = document.getElementById("category-dropdown");
    if (dropdown) {
      dropdown.value = category;
    }

    // Apply filter
    selectedCategory = category;
    applyFilters();
  }

  // Apply filters
  function applyFilters() {
    if (selectedCategory === "all") {
      filteredBlogs = [...allBlogs];
    } else {
      filteredBlogs = allBlogs.filter(
        (blog) => blog.category === selectedCategory
      );
    }

    // Reapply search if there's a search query
    const searchInput = document.getElementById("blog-search");
    if (searchInput && searchInput.value.trim()) {
      applySearch(searchInput.value);
    } else {
      renderBlogs(filteredBlogs);
    }
  }

  // Set up search functionality
  function setupSearch() {
    const searchInput = document.getElementById("blog-search");
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        applySearch(e.target.value);
      }, 300);
    });
  }

  // Apply search
  function applySearch(query) {
    query = query.toLowerCase().trim();

    if (query === "") {
      renderBlogs(filteredBlogs);
      return;
    }

    const searchResults = filteredBlogs.filter((blog) => {
      return (
        blog.title.toLowerCase().includes(query) ||
        blog.excerpt.toLowerCase().includes(query) ||
        blog.category.toLowerCase().includes(query) ||
        blog.author.toLowerCase().includes(query) ||
        (blog.tags &&
          blog.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    });

    renderBlogs(searchResults);
  }

  // Format date
  function formatDate(date) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchBlogs);
  } else {
    fetchBlogs();
  }
})();
