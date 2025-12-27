import { onComponentLoaded, initPaginator } from "../paginator.js";
class Dev {
  constructor() {
    this.allRepos = [];
    this.filteredRepos = [];
    this.currentPage = 1;
    this.itemsPerPage = 9;
    this.config = null;
  }

  async init() {
    initPaginator('project');
    await this.renderProjects();
    this.setupFilters();
  }

  async renderProjects() {
    try {
      this.config = await window.App.modules.apiClient.loadJSON("/data/site-config.json");
      const gitHub = `${this.config?.gitApi}/users/${this.config?.gitUser}/repos?sort=updated&per_page=100`;
      let response = await window.App.modules.apiClient.loadJSON(gitHub);
      if (!response) return;

      this.allRepos = response.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description || "No description available",
        homepage: repo.homepage,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        created_at: repo.created_at,
        fork: repo.fork,
        topics: repo.topics || [],
        thumbnail: `${this.config.gitThumb}${this.config.gitUser}/${repo.name}`,
        links: [
          { url: repo.homepage, label: "Live Demo <~>" },
          { url: repo.html_url, label: "GitHub Repo >=" },
        ],
      }));
      this.filteredRepos = [...this.allRepos];
      this.renderPage();
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  setupFilters() {
    const filterContainer = document.querySelector("[data-filter]");
    if (!filterContainer) return;
    const searchWrapper = window.App.modules.util.createElement("div", "search-wrapper");
    const searchInput = window.App.modules.util.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search projects...";
    searchInput.className = "search-input";
    searchWrapper.appendChild(searchInput);
    const sortWrapper = window.App.modules.util.createElement("div", "sort-wrapper");
    const sortSelect = window.App.modules.util.createElement("select", "sort-select");
    const sortOptions = [
      { value: "updated", label: "Recently Updated" },
      { value: "created", label: "Recently Created" },
      { value: "name", label: "Name (A-Z)" },
      { value: "stars", label: "Most Stars" },
      { value: "forks", label: "Most Forks" },
    ];
    sortOptions.forEach((opt) => {
      const option = window.App.modules.util.createElement("option", "", opt.label);
      option.value = opt.value;
      sortSelect.appendChild(option);
    });
    sortWrapper.appendChild(sortSelect);
    filterContainer.appendChild(searchWrapper);
    filterContainer.appendChild(sortWrapper);
    searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
    sortSelect.addEventListener("change", (e) => this.handleSort(e.target.value));
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase();
    this.filteredRepos = this.allRepos.filter(
      (repo) => repo.name.toLowerCase().includes(searchTerm) || repo.description.toLowerCase().includes(searchTerm) || repo.topics.some((topic) => topic.toLowerCase().includes(searchTerm))
    );
    this.currentPage = 1;
    this.renderPage();
  }

  handleSort(sortBy) {
    this.filteredRepos.sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return new Date(b.updated_at) - new Date(a.updated_at);
        case "created":
          return new Date(b.created_at) - new Date(a.created_at);
        case "name":
          return a.name.localeCompare(b.name);
        case "stars":
          return b.stargazers_count - a.stargazers_count;
        case "forks":
          return b.forks_count - a.forks_count;
        default:
          return 0;
      }
    });
    this.currentPage = 1;
    this.renderPage();
  }

  renderPage() {
    const projectsContainer = document.querySelector("[data-projects]");
    if (!projectsContainer) return;

    projectsContainer.innerHTML = "";

    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const pageRepos = this.filteredRepos.slice(startIdx, endIdx);

    if (pageRepos.length === 0) {
      const noResults = window.App.modules.util.createElement("p", "no-results", "No projects found");
      projectsContainer.appendChild(noResults);
      this.renderPagination();
      return;
    }

    pageRepos.forEach((project) => {
      const card = this.createProjectCard(project);
      projectsContainer.appendChild(card);
    });

    this.renderPagination();
  }

  createProjectCard(project) {
    const card = window.App.modules.util.createElement("div", "project-card");

    const imageContainer = window.App.modules.util.createElement("div", "project-image");
    const img = window.App.modules.util.createElement("img");
    img.src = project.thumbnail;
    img.alt = project.name;
    imageContainer.appendChild(img);
    card.appendChild(imageContainer);

    const info = window.App.modules.util.createElement("div", "project-info");
    const title = window.App.modules.util.createElement("h3", "project-title", project.name);
    const description = window.App.modules.util.createElement("p", "project-description", project.description);

    info.appendChild(title);
    info.appendChild(description);

    const tags = window.App.modules.util.createElement("div", "project-tags");
    project.topics.forEach((tag) => {
      const tagEl = window.App.modules.util.createElement("span", "project-tag", tag);
      tags.appendChild(tagEl);
    });
    info.appendChild(tags);

    const links = window.App.modules.util.createElement("div", "project-links");
    project.links.forEach((link) => {
      if (link.url) {
        const linkEl = window.App.modules.util.createElement("a", "project-link", link.label);
        linkEl.target = "_blank";
        linkEl.href = link.url;
        links.appendChild(linkEl);
      }
    });
    info.appendChild(links);
    card.appendChild(info);

    return card;
  }

  renderPagination() {
    onComponentLoaded.next({
      type: "pagination",
      id: "project",
      mode: "server",
      itemsPerPage: this.itemsPerPage,
      totalItems: this.filteredRepos.length,
      currentPage: this.currentPage,
      onPageChange: (page) => {
        this.currentPage = page;
        this.renderPage();
        this.scrollToTop();
      },
    });
  }

  scrollToTop() {
    const section = document.querySelector("#dev");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  cleanup() {
    const projectsContainer = document.querySelector("[data-projects]");
    const filterContainer = document.querySelector("[data-filter]");
    const paginationContainers = document.querySelectorAll("[data-project-pager]");

    if (projectsContainer) projectsContainer.innerHTML = "";
    if (filterContainer) filterContainer.innerHTML = "";
    paginationContainers.forEach((container) => (container.innerHTML = ""));

    this.allRepos = [];
    this.filteredRepos = [];
    this.currentPage = 1;
    this.config = null;
  }
}

function initDev() {
  if (window.App?.modules?.project) {
    window.App.modules.project.cleanup?.();
  }
  const projectModule = new Dev();
  window.App.register("project", projectModule, 'initDev');
  projectModule.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDev);
} else {
  initDev();
}

export { Dev, initDev };
