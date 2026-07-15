(function() {
    // Config
    const GITHUB_USER = 'albeph';
    const CACHE_TIME = 30 * 1000; // 30 seconds in ms

    // Generic fallback gradients for repo cards
    const fallbackGradients = [
        'linear-gradient(135deg, #FF512F, #DD2476)', // Sunset
        'linear-gradient(135deg, #1A2980, #26D0CE)', // Ocean
        'linear-gradient(135deg, #61045f, #aa076b)', // Violet
        'linear-gradient(135deg, #0575E6, #00F260)', // Aurora
        'linear-gradient(135deg, #7F00FF, #E100FF)', // Electric
        'linear-gradient(135deg, #e65c00, #F9D423)', // Sunlight
        'linear-gradient(135deg, #02c39a, #028090)', // Petrol
        'linear-gradient(135deg, #11998e, #38ef7d)', // Forest
        'linear-gradient(135deg, #f857a6, #ff5858)', // Ruby
        'linear-gradient(135deg, #0f2027, #203a43, #2c5364)'  // Midnight
    ];

    // Language specific gradients
    const languageGradients = {
        'javascript': 'linear-gradient(135deg, #f5d020, #f59800)',
        'typescript': 'linear-gradient(135deg, #007acc, #004d80)',
        'html': 'linear-gradient(135deg, #e34c26, #f06529)',
        'css': 'linear-gradient(135deg, #264de4, #29beb0)',
        'python': 'linear-gradient(135deg, #3572A5, #2B5B84)',
        'ruby': 'linear-gradient(135deg, #701516, #b8312f)',
        'java': 'linear-gradient(135deg, #b07219, #804c00)',
        'c++': 'linear-gradient(135deg, #f34b7d, #a02040)',
        'go': 'linear-gradient(135deg, #00ADD8, #0080a0)',
        'swift': 'linear-gradient(135deg, #ffac45, #ff4500)',
        'rust': 'linear-gradient(135deg, #dea584, #805030)',
        'shell': 'linear-gradient(135deg, #89e051, #50a030)',
        'php': 'linear-gradient(135deg, #4F5D95, #2F3B66)',
        'c#': 'linear-gradient(135deg, #178600, #0c4d00)'
    };

    // DOM Elements
    let navToggleBtn, navContainer;
    let repoGrid, apiStatusDot, apiStatusText;

    // Initialize Page
    document.addEventListener('DOMContentLoaded', () => {
        initMobileNav();
        initGitHubData();
    });

    // Mobile Navigation logic
    function initMobileNav() {
        navToggleBtn = document.querySelector('.js-nav-toggle');
        navContainer = document.querySelector('.js-nav');
        if (!navToggleBtn || !navContainer) return;

        navToggleBtn.addEventListener('click', () => {
            const isOpen = navContainer.classList.toggle('nav--open');
            navToggleBtn.setAttribute('aria-expanded', isOpen);
            document.body.classList.toggle('no-scroll', isOpen);
            
            // Re-calc diameter for circular mobile menu transition
            if (isOpen) {
                const diameter = Math.max(window.innerWidth, window.innerHeight) * 2;
                navContainer.style.setProperty('--diameter', `${diameter}px`);
                const menu = document.getElementById('nav-menu');
                if (menu) menu.classList.add('nav__menu--visible');
            } else {
                const menu = document.getElementById('nav-menu');
                if (menu) menu.classList.remove('nav__menu--visible');
            }
        });
    }

    // GitHub Data Fetching & Caching
    async function initGitHubData() {
        repoGrid = document.querySelector('.js-repo-grid');
        apiStatusDot = document.querySelector('.js-api-status-dot');
        apiStatusText = document.querySelector('.js-api-status-text');

        // Dynamic Username based on hostname (e.g. albeph.github.io -> albeph)
        let username = GITHUB_USER;
        const hostParts = window.location.hostname.split('.');
        if (hostParts.length === 3 && hostParts[1] === 'github' && hostParts[2] === 'io') {
            username = hostParts[0];
        }

        const profileCacheKey = `github_profile_${username}`;
        const reposCacheKey = `github_repos_${username}`;
        const cachedProfile = localStorage.getItem(profileCacheKey);
        const cachedRepos = localStorage.getItem(reposCacheKey);
        const cachedTime = localStorage.getItem(`${reposCacheKey}_time`);
        const now = Date.now();
        let hasCache = false;

        // 1. Instantly render cache if it exists for lightning-fast loading
        if (cachedProfile && cachedRepos) {
            try {
                const profile = JSON.parse(cachedProfile);
                const repos = JSON.parse(cachedRepos);
                renderProfile(profile);
                renderRepos(repos);
                updateApiStatus('ok', 'GitHub API: OK');
                hasCache = true;
            } catch (e) {
                console.error('Error parsing cached data:', e);
            }
        }

        // 2. Prevent background fetching if the cache is fresher than CACHE_TIME (30s)
        if (hasCache && cachedTime && (now - parseInt(cachedTime, 10) < CACHE_TIME)) {
            return;
        }

        if (!hasCache) {
            updateApiStatus('loading', 'Loading data...');
        }

        // 3. Background fetch fresh data from GitHub API
        try {
            const [profile, repos] = await Promise.all([
                fetchFreshData(profileCacheKey, `https://api.github.com/users/${username}`),
                fetchFreshData(reposCacheKey, `https://api.github.com/users/${username}/repos?per_page=100`)
            ]);

            // Re-render dynamically with the new updates
            renderProfile(profile);
            renderRepos(repos);
            updateApiStatus('ok', 'GitHub API: OK');
        } catch (error) {
            console.error('Error fetching fresh GitHub data:', error);
            // Only fall back to offline block if no cache exists to display
            if (!hasCache) {
                renderFallbackData();
                updateApiStatus('error', 'GitHub API Error');
            }
        }
    }

    async function fetchFreshData(cacheKey, url) {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`GitHub API returned status ${res.status}`);
        }
        const data = await res.json();
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        return data;
    }

    function renderProfile(profile) {
        // Populate header avatar
        const avatars = document.querySelectorAll('.js-header-avatar');
        avatars.forEach(img => img.src = profile.avatar_url);

        // Only update name if it exists in the GitHub profile
        if (profile.name) {
            const names = document.querySelectorAll('.js-header-name');
            names.forEach(nameEl => nameEl.textContent = profile.name);
        }

        // Only update bio if it exists in the GitHub profile
        if (profile.bio) {
            const bioContainer = document.querySelector('.js-hero-bio');
            if (bioContainer) {
                bioContainer.innerHTML = `<p>${profile.bio}</p>`;
            }
        }
    }

    function renderRepos(repos) {
        if (!repoGrid) return;

        // Filter and sort repos by pushed_at descending (most recent commit activity)
        let filteredRepos = repos.filter(repo => !repo.fork);
        if (filteredRepos.length === 0) {
            filteredRepos = repos; // Fallback to all if no original repos
        }

        // Sort by pushed_at (most recent first)
        filteredRepos.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

        // Limit to 8 repos (or customize)
        const topRepos = filteredRepos.slice(0, 8);

        let html = '';
        topRepos.forEach(repo => {
            const gradient = getRepoGradient(repo);
            const language = repo.language || 'HTML/CSS';
            const description = repo.description || 'No Description';
            const stars = repo.stargazers_count;
            const forks = repo.forks_count;

            html += `
                <li>
                    <div class="repo-card">
                        <div class="repo-card__gradient" style="background: ${gradient};"></div>
                        <div class="repo-card__inner">
                            <a href="${repo.html_url}" class="repo-card__link" target="_blank" rel="noopener">
                                <h3 class="repo-card__title">${repo.name}</h3>
                            </a>
                            <p class="repo-card__description">${description}</p>
                            <div class="repo-card__footer">
                                <span class="repo-card__lang">${language}</span>
                                <div class="repo-card__stats">
                                    <span class="repo-card__stat" aria-label="${stars} Stars">
                                        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>${stars}
                                    </span>
                                    <span class="repo-card__stat" aria-label="${forks} Forks">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="repo-card__svg-fork"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>${forks}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        });

        repoGrid.innerHTML = html;
    }

    function renderFallbackData() {
        if (!repoGrid) return;
        // If API fails completely, render some placeholder cards but with stylish fallback look
        let html = '';
        for (let i = 0; i < 4; i++) {
            const gradient = fallbackGradients[i % fallbackGradients.length];
            html += `
                <li>
                    <div class="repo-card">
                        <div class="repo-card__gradient" style="background: ${gradient};"></div>
                        <div class="repo-card__inner">
                            <a href="https://github.com/${GITHUB_USER}" class="repo-card__link" target="_blank" rel="noopener">
                                <h3 class="repo-card__title">Repository Fallback</h3>
                            </a>
                            <p class="repo-card__description">Unable to load GitHub repositories at this moment. Please check your connection or try again later.</p>
                            <div class="repo-card__footer">
                                <span class="repo-card__lang">Offline</span>
                                <div class="repo-card__stats">
                                    <span class="repo-card__stat"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        }
        repoGrid.innerHTML = html;
    }

    function getRepoGradient(repo) {
        const lang = (repo.language || '').toLowerCase();
        if (languageGradients[lang]) {
            return languageGradients[lang];
        }
        // Fallback to name hash based gradient
        let hash = 0;
        const name = repo.name || '';
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % fallbackGradients.length;
        return fallbackGradients[index];
    }

    function updateApiStatus(status, text) {
        if (!apiStatusDot || !apiStatusText) return;
        
        apiStatusText.textContent = text;
        apiStatusDot.className = 'footer__status-dot'; // reset
        
        if (status === 'loading') {
            apiStatusDot.classList.add('footer__status-dot--loading');
        } else if (status === 'error') {
            apiStatusDot.classList.add('footer__status-dot--error');
        }
        // 'ok' status just keeps standard green dot
    }
})();
