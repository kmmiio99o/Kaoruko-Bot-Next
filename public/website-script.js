// Kaoruko Bot Website JavaScript
class Website {
    constructor() {
        this.socket = null;
        this.authToken = 'kaoruko-dashboard-2024';
        this.commands = [];
        this.currentFilter = 'all';
        
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupSmoothScrolling();
        this.setupNavbar();
    }

    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('statsUpdate', (data) => {
            this.updateStats(data);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
                this.setActiveNavLink(link);
            });
        });

        // Mobile menu toggle
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Command filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(e.target);
                this.filterCommands(e.target.dataset.category);
            });
        });

        // Dashboard button
        const dashboardBtn = document.querySelector('.dashboard-footer .btn');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.open('/', '_blank');
            });
        }
    }

    setupSmoothScrolling() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
            });
        });
    }

    setupNavbar() {
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(10, 10, 10, 0.98)';
            } else {
                navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            }
        });

        // Active nav link on scroll
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('section[id]');
            const navLinks = document.querySelectorAll('.nav-link');
            
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (window.scrollY >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadCommands(),
                this.loadStatus()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateStats(data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadCommands() {
        try {
            const response = await fetch('/api/commands', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.commands = data.data;
                this.renderCommands();
            }
        } catch (error) {
            console.error('Error loading commands:', error);
        }
    }

    async loadStatus() {
        try {
            const response = await fetch('/api/status', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateStatus(data.data);
            }
        } catch (error) {
            console.error('Error loading status:', error);
        }
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Offline';
        }
    }

    updateStats(data) {
        // Hero stats
        const guildCount = document.getElementById('guildCount');
        const memberCount = document.getElementById('memberCount');
        const uptime = document.getElementById('uptime');

        if (guildCount) guildCount.textContent = data.guilds || '-';
        if (memberCount) memberCount.textContent = data.members ? data.members.toLocaleString() : '-';
        if (uptime) uptime.textContent = data.uptime || '-';

        // Dashboard stats
        const dashboardGuilds = document.getElementById('dashboardGuilds');
        const dashboardUsers = document.getElementById('dashboardUsers');
        const dashboardUptime = document.getElementById('dashboardUptime');

        if (dashboardGuilds) dashboardGuilds.textContent = data.guilds || '-';
        if (dashboardUsers) dashboardUsers.textContent = data.members ? data.members.toLocaleString() : '-';
        if (dashboardUptime) dashboardUptime.textContent = data.uptime || '-';
    }

    updateStatus(data) {
        // Bot status
        const botStatus = document.getElementById('botStatus');
        const botPing = document.getElementById('botPing');
        const botUptime = document.getElementById('botUptime');
        const botStatusBadge = document.getElementById('botStatusBadge');

        if (botStatus) botStatus.textContent = data.bot.status;
        if (botPing) botPing.textContent = `${data.bot.ping}ms`;
        if (botUptime) botUptime.textContent = data.bot.uptime;
        if (botStatusBadge) {
            botStatusBadge.textContent = data.bot.status;
            botStatusBadge.className = `status-badge ${data.bot.status}`;
        }

        // Database status
        const dbStatus = document.getElementById('dbStatus');
        const dbStatusBadge = document.getElementById('dbStatusBadge');

        if (dbStatus) dbStatus.textContent = data.database.message;
        if (dbStatusBadge) {
            dbStatusBadge.textContent = data.database.status;
            dbStatusBadge.className = `status-badge ${data.database.status}`;
        }

        // System info
        const systemMemory = document.getElementById('systemMemory');
        const nodeVersion = document.getElementById('nodeVersion');
        const platform = document.getElementById('platform');

        if (systemMemory) systemMemory.textContent = `${Math.round(data.system.memory.rss / 1024 / 1024)} MB`;
        if (nodeVersion) nodeVersion.textContent = data.system.nodeVersion;
        if (platform) platform.textContent = data.system.platform;
    }

    renderCommands() {
        const container = document.getElementById('commandsGrid');
        if (!container) return;

        if (this.commands.length === 0) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="material-icons">terminal</i>
                    <p>No commands available</p>
                </div>
            `;
            return;
        }

        const commandsHTML = this.commands.map(cmd => `
            <div class="command-card" data-category="${cmd.category}">
                <div class="command-header">
                    <div class="command-name">/${cmd.name}</div>
                    <div class="command-badges">
                        <span class="badge category">${cmd.category}</span>
                        ${cmd.slashCommand ? '<span class="badge type">Slash</span>' : ''}
                        ${cmd.prefixCommand ? '<span class="badge type">Prefix</span>' : ''}
                        ${cmd.ownerOnly ? '<span class="badge owner-only">Owner Only</span>' : ''}
                    </div>
                </div>
                <div class="command-description">${cmd.description || 'No description available'}</div>
                ${cmd.permissions && cmd.permissions.length > 0 ? `
                    <div class="command-permissions">
                        ${cmd.permissions.map(perm => `<span class="permission-tag">${perm}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        container.innerHTML = commandsHTML;
    }

    setActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    filterCommands(category) {
        const commandCards = document.querySelectorAll('.command-card');
        
        commandCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease-in-out';
            } else {
                card.style.display = 'none';
            }
        });
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offsetTop = section.offsetTop - 70; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }
}

// Initialize website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.website = new Website();
});

// Add CSS for fadeIn animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
