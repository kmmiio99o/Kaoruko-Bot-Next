class Dashboard {
  constructor() {
    this.socket = null;
    this.currentTab = "overview";
    this.authToken = "kaoruko-dashboard-2024";
    this.init();
  }

  init() {
    this.setupSocket();
    this.setupEventListeners();
    this.switchTab(this.currentTab);
  }

  setupSocket() {
    this.socket = io();
    this.socket.on("connect", () => this.updateConnectionStatus(true));
    this.socket.on("disconnect", () => this.updateConnectionStatus(false));
    this.socket.on("statsUpdate", (data) => this.updateStats(data));
  }

  setupEventListeners() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    document
      .getElementById("refreshBtn")
      .addEventListener("click", () => this.loadDataForCurrentTab());
    document
      .getElementById("websiteBtn")
      .addEventListener("click", () => window.open("/", "_blank"));
  }

  async fetchData(endpoint) {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      return null;
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));
    document.getElementById(`${tabName}-tab`).classList.add("active");

    document.getElementById("pageTitle").textContent = document.querySelector(
      `[data-tab="${tabName}"] span`,
    ).textContent;

    this.loadDataForCurrentTab();
  }

  loadDataForCurrentTab() {
    switch (this.currentTab) {
      case "overview":
        this.loadOverview();
        break;
      case "servers":
        this.loadServers();
        break;
      case "commands":
        this.loadCommands();
        break;
      case "logs":
        this.loadLogs();
        break;
      case "status":
        this.loadStatus();
        break;
      case "settings":
        this.loadSettings();
        break;
    }
  }

  async loadSettings() {
    const select = document.getElementById("serverSelect");
    const guilds = await this.fetchData("guilds");
    if (guilds) {
      select.innerHTML = "<option>Select a server</option>";
      guilds.forEach((guild) => {
        const option = document.createElement("option");
        option.value = guild.id;
        option.textContent = guild.name;
        select.appendChild(option);
      });
      select.addEventListener("change", (e) =>
        this.loadServerSettings(e.target.value),
      );
    }
  }

  async loadServerSettings(guildId) {
    const container = document.getElementById("settings-form");
    if (!guildId || guildId === "Select a server") {
      container.style.display = "none";
      return;
    }
    container.style.display = "block";
    container.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div></div>';
    const settings = await this.fetchData(`server-settings/${guildId}`);
    if (settings) {
      this.renderSettingsForm(container, settings);
      document
        .getElementById("saveSettings")
        .addEventListener("click", () => this.saveServerSettings(guildId));
    } else {
      container.innerHTML = "<p>Could not load settings for this server.</p>";
    }
  }

  renderSettingsForm(container, settings) {
    const {
      prefix,
      logCommands,
      logErrors,
      logEvents,
      welcomeChannel,
      goodbyeChannel,
      modLogChannel,
      autoModeration = {},
      permissions = {},
    } = settings;
    const {
      adminRoles = [],
      modRoles = [],
      blacklistedUsers = [],
    } = permissions;
    const {
      enabled = false,
      deleteInvites = false,
      deleteSpam = false,
      maxWarnings = 3,
    } = autoModeration;

    container.innerHTML = `
            <h4>General Settings</h4>
            <div class="form-group">
                <label for="prefix">Command Prefix</label>
                <input type="text" id="prefix" value="${prefix || "."}">
            </div>

            <h4>Channel Settings</h4>
            <div class="form-group">
                <label for="welcomeChannel">Welcome Channel ID</label>
                <input type="text" id="welcomeChannel" value="${welcomeChannel || ""}">
            </div>
            <div class="form-group">
                <label for="goodbyeChannel">Goodbye Channel ID</label>
                <input type="text" id="goodbyeChannel" value="${goodbyeChannel || ""}">
            </div>
            <div class="form-group">
                <label for="modLogChannel">Mod Log Channel ID</label>
                <input type="text" id="modLogChannel" value="${modLogChannel || ""}">
            </div>

            <h4>Logging</h4>
            <div class="form-group">
                <input type="checkbox" id="logCommands" ${logCommands ? "checked" : ""}>
                <label for="logCommands">Log Commands</label>
            </div>
            <div class="form-group">
                <input type="checkbox" id="logErrors" ${logErrors ? "checked" : ""}>
                <label for="logErrors">Log Errors</label>
            </div>
            <div class="form-group">
                <input type="checkbox" id="logEvents" ${logEvents ? "checked" : ""}>
                <label for="logEvents">Log Events</label>
            </div>

            <h4>Auto Moderation</h4>
            <div class="form-group">
                <input type="checkbox" id="autoModEnabled" ${enabled ? "checked" : ""}>
                <label for="autoModEnabled">Enabled</label>
            </div>
             <div class="form-group">
                <input type="checkbox" id="deleteInvites" ${deleteInvites ? "checked" : ""}>
                <label for="deleteInvites">Delete Invite Links</label>
            </div>
             <div class="form-group">
                <input type="checkbox" id="deleteSpam" ${deleteSpam ? "checked" : ""}>
                <label for="deleteSpam">Delete Spam</label>
            </div>
            <div class="form-group">
                <label for="maxWarnings">Max Warnings</label>
                <input type="number" id="maxWarnings" value="${maxWarnings}">
            </div>

            <h4>Permissions</h4>
            <div class="form-group">
                <label for="adminRoles">Admin Roles (IDs, comma-separated)</label>
                <input type="text" id="adminRoles" value="${adminRoles.join(", ")}">
            </div>
            <div class="form-group">
                <label for="modRoles">Mod Roles (IDs, comma-separated)</label>
                <input type="text" id="modRoles" value="${modRoles.join(", ")}">
            </div>
            <div class="form-group">
                <label for="blacklistedUsers">Blacklisted Users (IDs, comma-separated)</label>
                <input type="text" id="blacklistedUsers" value="${blacklistedUsers.join(", ")}">
            </div>

            <button id="saveSettings">Save Settings</button>
        `;
  }

  async saveServerSettings(guildId) {
    const settings = {
      prefix: document.getElementById("prefix").value,
      logCommands: document.getElementById("logCommands").checked,
      logErrors: document.getElementById("logErrors").checked,
      logEvents: document.getElementById("logEvents").checked,
      welcomeChannel: document.getElementById("welcomeChannel").value || null,
      goodbyeChannel: document.getElementById("goodbyeChannel").value || null,
      modLogChannel: document.getElementById("modLogChannel").value || null,
      autoModeration: {
        enabled: document.getElementById("autoModEnabled").checked,
        deleteInvites: document.getElementById("deleteInvites").checked,
        deleteSpam: document.getElementById("deleteSpam").checked,
        maxWarnings: parseInt(document.getElementById("maxWarnings").value, 10),
      },
      permissions: {
        adminRoles: document
          .getElementById("adminRoles")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        modRoles: document
          .getElementById("modRoles")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        blacklistedUsers: document
          .getElementById("blacklistedUsers")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    };

    const response = await fetch(`/api/server-settings/${guildId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      alert("Settings saved successfully!");
    } else {
      alert("Failed to save settings.");
    }
  }

  async loadOverview() {
    const stats = await this.fetchData("stats");
    if (stats) this.updateStats(stats);
  }

  updateStats(data) {
    document.getElementById("guildCount").textContent = data.guilds || "-";
    document.getElementById("memberCount").textContent = data.members
      ? data.members.toLocaleString()
      : "-";
    document.getElementById("uptime").textContent = data.uptime || "-";
    document.getElementById("memoryUsage").textContent = data.memory
      ? data.memory.rss
      : "-";
  }

  async loadServers() {
    const container = document.getElementById("serversList");
    container.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div></div>';
    const guilds = await this.fetchData("guilds");
    if (guilds) {
      const table = this.createTable(["ID", "Name", "Members"]);
      guilds.forEach((guild) => {
        const row = table.insertRow();
        row.insertCell().textContent = guild.id;
        row.insertCell().textContent = guild.name;
        row.insertCell().textContent = guild.memberCount;
      });
      container.innerHTML = "";
      container.appendChild(table);
    } else {
      container.innerHTML = "<p>Could not load servers.</p>";
    }
  }

  async loadCommands() {
    const container = document.getElementById("commandsList");
    container.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div></div>';
    const commands = await this.fetchData("commands");
    if (commands) {
      const table = this.createTable(["Name", "Description", "Category"]);
      commands.forEach((cmd) => {
        const row = table.insertRow();
        row.insertCell().textContent = cmd.name;
        row.insertCell().textContent = cmd.description;
        row.insertCell().textContent = cmd.category;
      });
      container.innerHTML = "";
      container.appendChild(table);
    } else {
      container.innerHTML = "<p>Could not load commands.</p>";
    }
  }

  async loadLogs() {
    const container = document.getElementById("logsContainer");
    container.innerHTML = "<p>Log functionality is not yet implemented.</p>";
  }

  async loadStatus() {
    const container = document.getElementById("status-container");
    container.innerHTML =
      '<div class="loading-state"><div class="loading-spinner"></div></div>';
    const status = await this.fetchData("status");
    if (status) {
      let html = "<ul>";
      html += `<li>Bot Status: ${status.bot.status}</li>`;
      html += `<li>Database Status: ${status.database.status}</li>`;
      html += "</ul>";
      container.innerHTML = html;
    } else {
      container.innerHTML = "<p>Could not load status.</p>";
    }
  }

  createTable(headers) {
    const table = document.createElement("table");
    table.className = "styled-table";
    const thead = table.createTHead();
    const row = thead.insertRow();
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      row.appendChild(th);
    });
    return table;
  }

  updateConnectionStatus(connected) {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    if (connected) {
      statusDot.classList.add("connected");
      statusText.textContent = "Połączono";
    } else {
      statusDot.classList.remove("connected");
      statusText.textContent = "Rozłączono";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => new Dashboard());
