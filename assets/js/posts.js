// Enhanced blogs.js with Blog Post Page Support
(function () {
  "use strict";

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

  // Check if we're on a blog post page
  function isBlogPostPage() {
    const path = window.location.pathname;
    return path.includes("/blogs/posts/");
  }

  // Get current blog slug and category from URL
  function getCurrentBlogInfo() {
    const path = window.location.pathname;
    const segments = path.split("/").filter((s) => s && s !== "index.html");

    const postsIndex = segments.indexOf("posts");
    if (postsIndex !== -1 && segments.length > postsIndex + 2) {
      return {
        categorySlug: segments[postsIndex + 1],
        slug: segments[postsIndex + 2],
      };
    }

    return null;
  }

  // ============================================
  // BLOG POST PAGE FUNCTIONS
  // ============================================

  async function initBlogPostPage() {
    try {
      const response = await fetch(BLOGS_PATH);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blogs = await response.json();
      const blogInfo = getCurrentBlogInfo();

      if (!blogInfo) {
        console.error("Could not determine blog info from URL");
        return;
      }

      console.log("Blog info:", blogInfo);

      // Find current blog
      const currentBlog = blogs.find(
        (blog) =>
          blog.slug === blogInfo.slug &&
          blog.categorySlug === blogInfo.categorySlug
      );

      if (!currentBlog) {
        console.error("Blog not found");
        return;
      }

      console.log("Current blog:", currentBlog.title);

      // Populate metadata
      populateMetadata(currentBlog);
      populateTags(currentBlog.tags);
      setupNavigation(blogs, currentBlog, blogInfo.categorySlug);
      setupShareButtons(currentBlog);
    } catch (error) {
      console.error("Error loading blog post:", error);
    }
  }

 function populateMetadata(blog) {
   // Populate all elements with data-blog-meta attribute
   document.querySelectorAll("[data-blog-meta]").forEach((element) => {
     const field = element.getAttribute("data-blog-meta");
     let value = blog[field];

     // Check if we should set text content or href
     const textField = element.getAttribute("data-blog-meta-text");
     if (textField) {
       // For elements that need both href and text
       if (field === "originalUrl") {
         const date = new Date(blog.date);
         const formattedDate = date.toLocaleDateString("en-US", {
           year: "numeric",
           month: "short",
           day: "numeric",
         });

         if (value) {
           // Has original URL - link to external source
           element.href = value;
           element.textContent = `📅 ${formattedDate}, Published on C# Corner`;
           element.target = "_blank";
           element.rel = "noopener noreferrer";
         } else {
           // No original URL - just show date without link
           element.href = "#";
           element.textContent = `📅 ${formattedDate}`;
           element.style.pointerEvents = "none";
           element.style.cursor = "default";
           element.style.textDecoration = "none";
         }
       }
     } else {
       element.textContent = value;
     }
   });

   // Update page title
   document.title = `${blog.title} | Pawan Pandey`;
 }
  function populateTags(tags) {
    const tagsContainer = document.getElementById("blog-tags");
    if (!tagsContainer || !tags || tags.length === 0) return;

    tagsContainer.innerHTML = tags
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
  }

  function setupNavigation(blogs, currentBlog, categorySlug) {
    console.log("=== Setting up navigation ===");
    console.log("Current blog:", currentBlog.title);
    console.log("Category:", categorySlug);

    // Filter blogs by current category - PRESERVE ORIGINAL ORDER
    const categoryBlogs = blogs.filter((b) => b.categorySlug === categorySlug);

    console.log("Blogs in category:", categoryBlogs.length);
    categoryBlogs.forEach((b, idx) => {
      console.log(`  ${idx}: ${b.title}`);
    });

    // Find current blog index
    const currentIndex = categoryBlogs.findIndex(
      (b) => b.slug === currentBlog.slug
    );

    console.log("Current index:", currentIndex);

    if (currentIndex === -1) {
      console.error("Current blog not found in category!");
      return;
    }

    // Get navigation buttons
    const prevBtn = document.getElementById("prev-post");
    const nextBtn = document.getElementById("next-post");

    // Hide both by default
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";

    // Setup PREVIOUS button (index - 1)
    if (currentIndex > 0) {
      const prevPost = categoryBlogs[currentIndex - 1];
      console.log("✓ Previous post:", prevPost.title);

      if (prevBtn) {
        prevBtn.style.display = "inline-block";
        prevBtn.title = `Previous: ${prevPost.title}`;
        prevBtn.removeAttribute("href");
        prevBtn.style.cursor = "pointer";

        prevBtn.onclick = function (e) {
          e.preventDefault();
          const url = `/blogs/posts/${prevPost.categorySlug}/${prevPost.slug}/`;
          console.log("Navigating to previous:", url);
          window.location.href = url;
        };
      }
    } else {
      console.log("✗ No previous post (first in category)");
    }

    // Setup NEXT button (index + 1)
    if (currentIndex < categoryBlogs.length - 1) {
      const nextPost = categoryBlogs[currentIndex + 1];
      console.log("✓ Next post:", nextPost.title);

      if (nextBtn) {
        nextBtn.style.display = "inline-block";
        nextBtn.title = `Next: ${nextPost.title}`;
        nextBtn.removeAttribute("href");
        nextBtn.style.cursor = "pointer";

        nextBtn.onclick = function (e) {
          e.preventDefault();
          const url = `/blogs/posts/${nextPost.categorySlug}/${nextPost.slug}/`;
          console.log("Navigating to next:", url);
          window.location.href = url;
        };
      }
    } else {
      console.log("✗ No next post (last in category)");
    }

    console.log("=== Navigation complete ===\n");
  }

  function setupShareButtons(blog) {
    const currentUrl = window.location.href;
    const title = encodeURIComponent(blog.title);
    const url = encodeURIComponent(currentUrl);

    // Twitter
    const twitterBtn = document.getElementById("share-twitter");
    if (twitterBtn) {
      twitterBtn.href = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    }

    // LinkedIn
    const linkedinBtn = document.getElementById("share-linkedin");
    if (linkedinBtn) {
      linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    }

    // Facebook
    const facebookBtn = document.getElementById("share-facebook");
    if (facebookBtn) {
      facebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    }
  }

  // ============================================
  // BLOG LISTING PAGE FUNCTIONS
  // ============================================

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
      const container = document.getElementById("blogs-container");
      if (container) {
        container.innerHTML =
          '<div class="error-state"><p>Failed to load blog posts. Please try again later.</p></div>';
      }
    }
  }

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

  function setupCategoryFilters() {
    const container = document.getElementById("blog-categories");
    if (!container) return;

    container.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All";
    allBtn.dataset.category = "all";
    allBtn.addEventListener("click", () => handleCategoryClick("all", allBtn));
    container.appendChild(allBtn);

    Object.values(categories).forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.textContent = `${cat.name} (${cat.count})`;
      btn.dataset.category = cat.name;
      btn.addEventListener("click", () => handleCategoryClick(cat.name, btn));
      container.appendChild(btn);
    });
  }

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

  function handleCategoryClick(category, button) {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    const dropdown = document.getElementById("category-dropdown");
    if (dropdown) {
      dropdown.value = category;
    }

    selectedCategory = category;
    applyFilters();
  }

  function applyFilters() {
    if (selectedCategory === "all") {
      filteredBlogs = [...allBlogs];
    } else {
      filteredBlogs = allBlogs.filter(
        (blog) => blog.category === selectedCategory
      );
    }

    const searchInput = document.getElementById("blog-search");
    if (searchInput && searchInput.value.trim()) {
      applySearch(searchInput.value);
    } else {
      renderBlogs(filteredBlogs);
    }
  }

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

  function formatDate(date) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    if (isBlogPostPage()) {
      console.log("Initializing blog post page...");
      initBlogPostPage();
    } else {
      console.log("Initializing blog listing page...");
      fetchBlogs();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
