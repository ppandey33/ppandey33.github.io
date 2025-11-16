// Theme Management System
(function() {
  'use strict';
  
function getDataPathPrefix() {
    const path = window.location.pathname;
    const depth = path
      .split("/")
      .filter((p) => p && p !== "index.html").length;

    // If we're in root or at index.html, no prefix needed
    if (depth === 0 || path === "/" || path === "/index.html") {
      return "";
    }

    // For each level deep, add '../'
    return "../".repeat(depth);
  }
  const prefix = getDataPathPrefix();
  const THEME_KEY = 'portfolio-theme';
  const CONFIG_PATH = `${prefix}data/site-config.json`;
  
  let siteConfig = null;
  
  // Load site configuration
  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_PATH);
      siteConfig = await response.json();
      applyConfigColors();
      return siteConfig;
    } catch (error) {
      console.error('Failed to load site config:', error);
      return null;
    }
  }
  
  // Apply custom colors from config
  function applyConfigColors() {
    if (!siteConfig || !siteConfig.theme || !siteConfig.theme.colors) return;
    
    const colors = siteConfig.theme.colors;
    const root = document.documentElement;
    
    if (colors.primary) {
      root.style.setProperty('--primary-color', colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty('--secondary-color', colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty('--accent-color', colors.accent);
    }
  }
  
  // Get saved theme or use default
  function getSavedTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    
    // Check config for default theme
    if (siteConfig && siteConfig.theme && siteConfig.theme.default) {
      return siteConfig.theme.default;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  }
  
  // Set theme
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }
  
  // Toggle theme
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }
  
  // Initialize theme on page load
  async function initTheme() {
    await loadConfig();
    const theme = getSavedTheme();
    setTheme(theme);
    
    // Set up theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
  
  // Watch for config file changes (for development)
  function watchConfigChanges() {
    let lastModified = null;
    
    setInterval(async () => {
      try {
        const response = await fetch(CONFIG_PATH, { method: 'HEAD' });
        const modified = response.headers.get('last-modified');
        
        if (lastModified && modified !== lastModified) {
          console.log('Config updated, reloading...');
          await loadConfig();
        }
        lastModified = modified;
      } catch (error) {
        // Silently fail
      }
    }, 5000);
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
  
  // Export functions for use by other scripts
  window.ThemeManager = {
    loadConfig,
    setTheme,
    toggleTheme,
    getSavedTheme,
    getConfig: () => siteConfig
  };
})();