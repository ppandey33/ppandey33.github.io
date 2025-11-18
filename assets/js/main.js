// Main JavaScript for Portfolio Website
(function () {
  "use strict";

  // Add this helper function to calculate the correct path prefix
  function getDataPathPrefix() {
    const path = window.location.pathname;
    const depth = path.split("/").filter((p) => p && p !== "index.html").length;

    // If we're in root or at index.html, no prefix needed
    if (depth === 0 || path === "/" || path === "/index.html") {
      return "";
    }

    // For each level deep, add '../'
    return "../".repeat(depth);
  }

  // Update your PATHS object to use the dynamic prefix
  const getDataPaths = () => {
    const prefix = getDataPathPrefix();
    return {
      config: `${prefix}data/site-config.json`,
      navigation: `${prefix}data/navigation.json`,
      skills: `${prefix}data/skills.json`,
      experience: `${prefix}data/experience.json`,
      education: `${prefix}data/education.json`,
      achievements: `${prefix}data/achievements.json`,
    };
  };

  // Resolve path relative to current location
  function resolvePath(path) {
    if (path.startsWith("http")) return path; // External URL
    if (path.startsWith("/")) {
      // Absolute path - need to handle based on current location
      const depth = (window.location.pathname.match(/\//g) || []).length - 1;
      if (depth > 0 && !path.startsWith("/#")) {
        return "../".repeat(depth) + path.substring(1);
      }
      return path;
    }
    return path;
  }

  // Cache for loaded data
  const dataCache = {};

  // Utility: Fetch JSON data
  async function fetchJSON(path) {
    if (dataCache[path]) return dataCache[path];

    try {
      // Try multiple path variations
      const paths = [path, resolvePath(path), window.location.origin + path];

      let response;
      let lastError;

      for (const tryPath of paths) {
        try {
          response = await fetch(tryPath);
          if (response.ok) break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error(`HTTP error! status: ${response?.status}`);
      }

      const data = await response.json();
      dataCache[path] = data;
      return data;
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      return null;
    }
  }

  async function loadSiteConfig() {
    const config = await fetchJSON(PATHS.config);
    if (!config) return;

    // Create typing animation for hero section
    createTypingHero(config.hero);

    // Continue with rest of your config loading...
    // ... other config code
  }

  function createTypingHero(heroData) {
    const heroLeftContainer = document.querySelector(".hero-left-container");
    if (!heroLeftContainer) return;

    // Remove existing elements with data-config for hero greeting, title, subtitle, description
    const existingElements = heroLeftContainer.querySelectorAll(
      '[data-config="hero.greeting"], [data-config="hero.title"], [data-config="hero.subtitle"], [data-config="hero.description"]'
    );
    existingElements.forEach((el) => el.remove());

    // Create typing container
    const typingContainer = document.createElement("div");
    typingContainer.className = "typing-container";

    // Line 1: Greeting (smaller, cyan color)
    if (heroData.greeting) {
      const line1 = createTypingLine(heroData.greeting, "line-1 greeting-line");
      typingContainer.appendChild(line1);
    }

    // Line 2: Title (large, with gradient)
    if (heroData.title) {
      const line2 = createTypingLine(heroData.title, "line-2 title-line");
      typingContainer.appendChild(line2);
    }

    // Line 3: Subtitle (medium, gray)
    if (heroData.subtitle) {
      const line3 = createTypingLine(heroData.subtitle, "line-3 subtitle-line");
      typingContainer.appendChild(line3);
    }

    // Line 4: Description (smaller, light gray)
    if (heroData.description) {
      const line4 = createTypingLine(
        heroData.description,
        "line-4 description-line"
      );
      typingContainer.appendChild(line4);
    }

    // Insert at the beginning of hero-left-container (before CTA buttons)
    heroLeftContainer.insertBefore(
      typingContainer,
      heroLeftContainer.firstChild
    );

    // Start the typing animation
    startTypingAnimation();
  }

  function createTypingLine(text, className) {
    const line = document.createElement("div");
    line.className = `typing-line ${className}`;

    text.split("").forEach((char) => {
      const span = document.createElement("span");
      span.innerHTML = char === " " ? "&nbsp;" : char;
      span.style.opacity = "0";
      line.appendChild(span);
    });

    return line;
  }

  function startTypingAnimation() {
    const lines = document.querySelectorAll(".typing-line");
    let cumulativeDelay = 0;

    lines.forEach((line, lineIndex) => {
      const spans = line.querySelectorAll("span");

      // Add cursor to current line
      setTimeout(() => {
        line.classList.add("active");
      }, cumulativeDelay);

      spans.forEach((span, charIndex) => {
        setTimeout(() => {
          span.style.opacity = "1";
          span.style.transform = "translateY(0)";

          // Remove cursor when line is complete
          if (charIndex === spans.length - 1) {
            setTimeout(() => {
              line.classList.remove("active");
            }, 100);
          }
        }, cumulativeDelay + charIndex * 50); // 50ms per character
      });

      // Add delay before next line starts
      cumulativeDelay += spans.length * 50 + 300; // 300ms pause between lines
    });
  }

  // Populate dynamic content from config
  async function populateConfigData() {
    const PATHS = getDataPaths();
    const config = await fetchJSON(PATHS.config);
    if (!config) return;
    createTypingHero(config.hero);
    // const typingContainer = document.createElement("div");
    // typingContainer.className = "typing-container";

    // const heroFields = ["greeting", "title", "subtitle"];
    // let totalDelay = 0;

    // heroFields.forEach((field, lineIndex) => {
    //   const element = document.querySelector(`[data-config="hero.${field}"]`);
    //   if (!element || !config.hero[field]) return;

    //   const text = config.hero[field];
    //   const typingLine = document.createElement("div");
    //   typingLine.className = `typing-line line-${lineIndex + 1}`;

    //   text.split("").forEach((char, charIndex) => {
    //     const span = document.createElement("span");
    //     span.innerHTML = char === " " ? "&nbsp;" : char;
    //     span.style.animationDelay = `${totalDelay + charIndex * 0.05}s`;
    //     typingLine.appendChild(span);
    //   });

    //   totalDelay += text.length * 0.05 + 0.3; // Add delay between lines
    //   typingContainer.appendChild(typingLine);
    //   element.remove();
    // });

    // const heroContent = document.querySelector(".hero-content");
    // if (heroContent && typingContainer.children.length > 0) {
    //   heroContent.insertBefore(typingContainer, heroContent.firstChild);
    // }

    // Update elements with data-config attribute
    document.querySelectorAll("[data-config]").forEach((el) => {
      const path = el.getAttribute("data-config");
      const value = getNestedValue(config, path);
      if (value) {
        if (el.tagName === "A" && el.hasAttribute("href") === false) {
          el.setAttribute("href", value);
        } else {
          el.textContent = value;
        }
      }
    });

    // Update elements with data-config-text (for button text)
    document.querySelectorAll("[data-config-text]").forEach((el) => {
      const path = el.getAttribute("data-config-text");
      const value = getNestedValue(config, path);
      if (value) el.textContent = value;
    });

    // Update document title
    if (config.title && !document.title.includes(config.title)) {
      document.title = config.title;
    }
  }

  // Helper: Get nested object value by path
  function getNestedValue(obj, path) {
    return path.split(".").reduce((curr, key) => curr?.[key], obj);
  }

  // Build Navigation Menu
  async function buildNavigation() {
    const navMenu = document.getElementById("nav-menu");
    if (!navMenu) return;
    const PATHS = getDataPaths();
    const navData = await fetchJSON(PATHS.navigation);
    if (!navData) return;

    navMenu.innerHTML = "";
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;

    navData.forEach((item) => {
      const li = document.createElement("li");
      li.className = "nav-item";

      const a = document.createElement("a");
      a.href = resolvePath(item.url);
      a.className = "nav-link";
      a.innerHTML = `<span>${item.icon}</span> ${item.title}`;

      // Improved active state detection
      const itemPath = item.url.split("#")[0] || "/";
      const itemHash = item.url.includes("#")
        ? "#" + item.url.split("#")[1]
        : "";

      let isActive = false;

      if (itemHash) {
        // Hash link - check both path and hash
        isActive =
          (currentPath === "/" || currentPath === "/index.html") &&
          currentHash === itemHash;
      } else if (itemPath === "/") {
        // Home link - active only on exact home page
        isActive =
          (currentPath === "/" || currentPath === "/index.html") &&
          !currentHash;
      } else {
        // Other pages - check if current path includes the item path
        isActive =
          currentPath.includes(itemPath) ||
          currentPath === itemPath ||
          (itemPath.endsWith(".html") &&
            currentPath === itemPath.replace(".html", ""));
      }

      if (isActive) {
        a.classList.add("active");
      }

      li.appendChild(a);
      navMenu.appendChild(li);
    });

    // Set up mobile menu toggle
    setupMobileMenu();
  }

  // Mobile Menu Toggle
  function setupMobileMenu() {
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    if (navToggle && navMenu) {
      navToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
      });

      // Close menu when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".navbar")) {
          navMenu.classList.remove("active");
        }
      });

      // Close menu when clicking nav link
      navMenu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
          navMenu.classList.remove("active");
        });
      });
    }
  }

  // Build Skills Section
  async function buildSkills() {
    const container = document.getElementById("skills-container");
    if (!container) return;
    const PATHS = getDataPaths();
    const skills = await fetchJSON(PATHS.skills);
    if (!skills) return;

    container.innerHTML = "";
    skills.forEach((category) => {
      const card = document.createElement("div");
      card.className = "skill-category glass-card";

      card.innerHTML = `
        <h3>${category.category}</h3>
        <div class="skill-tags">
          ${category.skills
            .map((skill) => `<span class="skill-tag">${skill}</span>`)
            .join("")}
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Build Experience Timeline
  async function buildExperience() {
    const container = document.getElementById("experience-container");
    if (!container) return;
    const PATHS = getDataPaths();
    const experience = await fetchJSON(PATHS.experience);
    if (!experience) return;

    container.innerHTML = "";
    experience.forEach((job) => {
      const item = document.createElement("div");
      item.className = "experience-item glass-card";

      item.innerHTML = `
        <div class="experience-header">
          <h3 class="experience-position">${job.position}</h3>
          <div class="experience-company">${job.company}</div>
          <div class="experience-meta">
            <span>📍 ${job.location}</span>
            <span>📅 ${job.period}</span>
          </div>
          ${
            job.project
              ? `<div class="experience-project">🚀 Project: ${job.project}</div>`
              : ""
          }
        </div>
        <ul class="experience-achievements">
          ${job.achievements
            .map((achievement) => `<li>${achievement}</li>`)
            .join("")}
        </ul>
      `;

      container.appendChild(item);
    });
  }

  // Build Education Section
  async function buildEducation() {
    const container = document.getElementById("education-container");
    if (!container) return;
    const PATHS = getDataPaths();
    const education = await fetchJSON(PATHS.education);
    if (!education) return;

    container.innerHTML = "";
    education.forEach((edu) => {
      const card = document.createElement("div");
      card.className = "education-item glass-card";

      card.innerHTML = `
        <h3 class="education-degree">${edu.degree}</h3>
        <div class="education-institution">${edu.institution}</div>
        <div class="education-meta">
          <span>${edu.period}</span>
          <span class="education-score">${edu.score}</span>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // Build Achievements Section
  async function buildAchievements() {
    const container = document.getElementById("achievements-container");
    if (!container) return;
    const PATHS = getDataPaths();
    const achievements = await fetchJSON(PATHS.achievements);
    if (!achievements) return;

    container.innerHTML = "";
    achievements.forEach((achievement) => {
      const card = document.createElement("div");
      card.className = "achievement-item glass-card";

      card.innerHTML = `
        <span class="achievement-icon">${achievement.icon}</span>
        <h3 class="achievement-title">${achievement.title}</h3>
        <p class="achievement-description">${achievement.description}</p>
      `;

      container.appendChild(card);
    });
  }

  // Smooth scroll for anchor links
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const href = this.getAttribute("href");
        if (href === "#") return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.offsetTop;
          const offsetPosition = elementPosition - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      });
    });
  }

  // Update footer year
  function updateFooterYear() {
    const yearElement = document.getElementById("current-year");
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }

  // Header scroll effect
  function setupHeaderScroll() {
    const header = document.querySelector(".header");
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll <= 0) {
        header.classList.remove("scroll-up");
        return;
      }

      if (
        currentScroll > lastScroll &&
        !header.classList.contains("scroll-down")
      ) {
        header.classList.remove("scroll-up");
        header.classList.add("scroll-down");
      } else if (
        currentScroll < lastScroll &&
        header.classList.contains("scroll-down")
      ) {
        header.classList.remove("scroll-down");
        header.classList.add("scroll-up");
      }

      lastScroll = currentScroll;
    });
  }

  // Initialize intersection observer for animations
  function setupIntersectionObserver() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all cards
    document.querySelectorAll(".glass-card").forEach((card) => {
      observer.observe(card);
    });
  }

  // Initialize everything
  async function init() {
    try {
      // Wait for config to load first
      await populateConfigData();
      // Build all sections in parallel
      await Promise.all([
        buildNavigation(),
        buildSkills(),
        buildExperience(),
        buildEducation(),
        buildAchievements(),
      ]);

      // Set up UI enhancements
      setupSmoothScroll();
      setupHeaderScroll();
      updateFooterYear();

      // Add fade-in animation class
      setTimeout(() => {
        setupIntersectionObserver();
      }, 100);
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for use by other scripts
  window.PortfolioApp = {
    fetchJSON,
    populateConfigData,
  };
})();
