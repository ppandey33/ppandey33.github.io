// GitHub Repositories Dynamic Loading
(function() {
  'use strict';
  
  const GITHUB_API = 'https://api.github.com';
  const USERNAME = 'ppandey33'; // From config
  let allRepos = [];
  let filteredRepos = [];
  
  // Fetch GitHub repositories
  async function fetchRepositories() {
    const loadingEl = document.getElementById('repos-loading');
    const containerEl = document.getElementById('repos-container');
    const errorEl = document.getElementById('repos-error');
    
    try {
      loadingEl.style.display = 'block';
      containerEl.style.display = 'none';
      errorEl.style.display = 'none';
      
      const response = await fetch(`${GITHUB_API}/users/${USERNAME}/repos?sort=updated&per_page=100`);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const repos = await response.json();
      
      allRepos = repos.filter((r) => r.name.indexOf("ppandey33") < 0);
      // Filter out forked repos by default, but keep the data
      allRepos = allRepos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description || "No description available",
        html_url: repo.html_url,
        homepage: repo.homepage,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        created_at: repo.created_at,
        fork: repo.fork,
        topics: repo.topics || [],
      }));
      
      filteredRepos = [...allRepos];
      
      loadingEl.style.display = 'none';
      containerEl.style.display = 'grid';
      
      renderRepositories(filteredRepos);
      setupFilters();
      setupSearch();
      
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
    }
  }
  
  // Render repositories
  function renderRepositories(repos) {
    const container = document.getElementById('repos-container');
    if (!container) return;
    
    if (repos.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No repositories found matching your criteria.</p></div>';
      return;
    }
    
    container.innerHTML = '';
    
    repos.forEach(repo => {
      const card = createRepoCard(repo);
      container.appendChild(card);
    });
  }
  
  // Create repository card
  function createRepoCard(repo) {
    const card = document.createElement('div');
    card.className = 'repo-card glass-card';
    card.dataset.repoId = repo.id;
    
    const languageColor = getLanguageColor(repo.language);
    const updatedDate = formatDate(repo.updated_at);
    
    card.innerHTML = `
      <div class="repo-header">
        <h3 class="repo-name">
          <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
        </h3>
        ${repo.fork ? '<span class="repo-fork-badge">🍴 Forked</span>' : ''}
      </div>
      
      <p class="repo-description">${escapeHtml(repo.description)}</p>
      
      <div class="repo-meta">
        ${repo.language ? `
          <span class="repo-language">
            <span class="language-dot" style="background-color: ${languageColor}"></span>
            ${repo.language}
          </span>
        ` : ''}
        <span>Updated ${updatedDate}</span>
      </div>
      
      ${repo.topics.length > 0 ? `
        <div class="repo-topics">
          ${repo.topics.slice(0, 5).map(topic => 
            `<span class="repo-topic">#${topic}</span>`
          ).join('')}
        </div>
      ` : ''}
      
      <div class="repo-stats">
        <span class="stat-item">
          ⭐ ${repo.stargazers_count}
        </span>
        <span class="stat-item">
          🍴 ${repo.forks_count}
        </span>
        ${repo.homepage ? `
          <a href="${repo.homepage}" target="_blank" rel="noopener" class="stat-item">
            🔗 Demo
          </a>
        ` : ''}
      </div>
    `;
    
    return card;
  }
  
  // Set up filter buttons
  function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Apply filter
        const filter = btn.dataset.filter;
        applyFilter(filter);
      });
    });
  }
  
  // Apply filter
  function applyFilter(filter) {
    switch (filter) {
      case 'all':
        filteredRepos = [...allRepos];
        break;
      case 'starred':
        filteredRepos = allRepos.filter(repo => repo.stargazers_count > 0);
        break;
      case 'forked':
        filteredRepos = allRepos.filter(repo => repo.fork);
        break;
      default:
        filteredRepos = [...allRepos];
    }
    
    renderRepositories(filteredRepos);
  }
  
  // Set up search functionality
  function setupSearch() {
    const searchInput = document.getElementById('repo-search');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      searchTimeout = setTimeout(() => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
          renderRepositories(filteredRepos);
          return;
        }
        
        const searchResults = filteredRepos.filter(repo => {
          return repo.name.toLowerCase().includes(query) ||
                 repo.description.toLowerCase().includes(query) ||
                 (repo.language && repo.language.toLowerCase().includes(query)) ||
                 repo.topics.some(topic => topic.toLowerCase().includes(query));
        });
        
        renderRepositories(searchResults);
      }, 300);
    });
  }
  
  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
  
  // Get language color
  function getLanguageColor(language) {
    const colors = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'C#': '#178600',
      'C++': '#f34b7d',
      'C': '#555555',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'Ruby': '#701516',
      'PHP': '#4F5D95',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'Shell': '#89e051',
      'Vue': '#41b883',
      'React': '#61dafb',
      'Angular': '#dd0031'
    };
    
    return colors[language] || '#8b949e';
  }
  
  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchRepositories);
  } else {
    fetchRepositories();
  }
})();