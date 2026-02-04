// Dashboard Application
class Dashboard {
  constructor() {
    this.user = null;
    this.guilds = [];
    this.selectedGuild = null;
    this.isOwner = false;
    this.stats = null;
    this.commands = null;
    
    this.init();
  }

  async init() {
    await this.checkAuth();
    await this.loadStats();
    this.setupEventListeners();
    this.loadPage('overview');
  }

  async checkAuth() {
    try {
      const res = await fetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
        this.guilds = data.guilds || [];
        this.isOwner = data.isOwner;
        this.updateUI();
      }
    } catch (error) {
      console.log('Not authenticated');
    }
  }

  updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const guildSelector = document.getElementById('guild-selector');
    const guildNav = document.getElementById('guild-nav');
    const ownerNav = document.getElementById('owner-nav');

    if (this.user) {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      userInfo.style.display = 'flex';
      guildSelector.style.display = 'block';
      guildNav.style.display = 'block';

      document.getElementById('user-avatar').src = this.user.avatar 
        ? `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(this.user.discriminator || '0') % 5}.png`;
      document.getElementById('user-name').textContent = this.user.global_name || this.user.username;
      document.getElementById('user-tag').textContent = `@${this.user.username}`;

      if (this.isOwner) {
        ownerNav.style.display = 'block';
      }

      this.populateGuildSelect();
    } else {
      loginBtn.style.display = 'flex';
      logoutBtn.style.display = 'none';
      userInfo.style.display = 'none';
      guildSelector.style.display = 'none';
      guildNav.style.display = 'none';
      ownerNav.style.display = 'none';
    }
  }

  async populateGuildSelect() {
    const select = document.getElementById('guild-select');
    select.innerHTML = '<option value="">Select a server...</option>';
    
    // Fetch bot-available guilds
    try {
      const res = await fetch('/api/guilds');
      if (res.ok) {
        const data = await res.json();
        this.guilds = data.guilds;
        
        for (const guild of this.guilds) {
          const option = document.createElement('option');
          option.value = guild.id;
          option.textContent = `${guild.name}${guild.botPresent ? '' : ' (Invite Bot)'}`;
          option.disabled = !guild.botPresent;
          select.appendChild(option);
        }
      }
    } catch (error) {
      console.error('Failed to load guilds:', error);
    }
  }

  async loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        this.stats = await res.json();
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async loadCommands() {
    if (this.commands) return this.commands;
    try {
      const res = await fetch('/api/commands');
      if (res.ok) {
        const data = await res.json();
        this.commands = data;
        return data;
      }
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
    return { commands: [], categories: {}, total: 0 };
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) {
          document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.loadPage(page);
        }
      });
    });

    // Guild selector
    document.getElementById('guild-select').addEventListener('change', (e) => {
      this.selectedGuild = e.target.value;
      if (this.selectedGuild) {
        this.loadGuildData();
      }
    });
  }

  async loadGuildData() {
    if (!this.selectedGuild) return;
    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}`);
      if (res.ok) {
        this.guildData = await res.json();
      }
    } catch (error) {
      console.error('Failed to load guild data:', error);
    }
  }

  loadPage(page) {
    const content = document.getElementById('content');
    
    switch (page) {
      case 'overview':
        this.renderOverview(content);
        break;
      case 'commands':
        this.renderCommands(content);
        break;
      case 'guild-settings':
        this.renderGuildSettings(content);
        break;
      case 'guild-moderation':
        this.renderGuildModeration(content);
        break;
      case 'guild-tickets':
        this.renderGuildTickets(content);
        break;
      case 'guild-invites':
        this.renderGuildInvites(content);
        break;
      case 'guild-music':
        this.renderGuildMusic(content);
        break;
      case 'premium':
        this.renderPremium(content);
        break;
      case 'blacklist':
        this.renderBlacklist(content);
        break;
      default:
        content.innerHTML = '<p>Page not found</p>';
    }
  }

  renderOverview(container) {
    const stats = this.stats || { status: 'offline', guilds: 0, users: 0, commands: 0, uptime: 0 };
    const uptime = this.formatUptime(stats.uptime);
    
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Dashboard Overview</h1>
        <p class="page-subtitle">Monitor your bot's status and performance</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-value">${stats.guilds.toLocaleString()}</div>
          <div class="stat-label">Servers</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-value">${stats.users.toLocaleString()}</div>
          <div class="stat-label">Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </div>
          <div class="stat-value">${stats.commands || 0}</div>
          <div class="stat-label">Commands</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${stats.status === 'online' ? 'green' : 'red'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-value">${uptime}</div>
          <div class="stat-label">Uptime</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Bot Status</h2>
            <p class="card-subtitle">Current status and metrics</p>
          </div>
          <span class="badge ${stats.status === 'online' ? 'badge-success' : 'badge-danger'}">
            ${stats.status === 'online' ? '● Online' : '○ Offline'}
          </span>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.ping || 0}ms</div>
            <div class="stat-label">Latency</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.shards || 1}</div>
            <div class="stat-label">Shards</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.slashCommands || 0}</div>
            <div class="stat-label">Slash Commands</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.memory ? Math.round(stats.memory.heapUsed / 1024 / 1024) : 0}MB</div>
            <div class="stat-label">Memory Usage</div>
          </div>
        </div>
      </div>

      ${!this.user ? `
        <div class="card">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <h3>Login Required</h3>
            <p>Login with Discord to manage your servers</p>
            <a href="/auth/login" class="btn btn-primary" style="margin-top: 16px;">Login with Discord</a>
          </div>
        </div>
      ` : ''}
    `;
  }

  async renderCommands(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    const data = await this.loadCommands();
    const categories = Object.keys(data.categories).sort();
    
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Commands</h1>
        <p class="page-subtitle">${data.total} commands across ${categories.length} categories</p>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" id="command-search" placeholder="Search commands...">
        </div>
      </div>

      <div class="tabs">
        <button class="tab active" data-category="all">All</button>
        ${categories.map(cat => `<button class="tab" data-category="${cat}">${this.formatCategory(cat)}</button>`).join('')}
      </div>

      <div class="commands-grid" id="commands-grid">
        ${this.renderCommandCards(data.commands)}
      </div>
    `;

    // Event listeners
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.dataset.category;
        const filtered = category === 'all' 
          ? data.commands 
          : data.commands.filter(c => c.category.split('/')[0].toLowerCase() === category.toLowerCase());
        document.getElementById('commands-grid').innerHTML = this.renderCommandCards(filtered);
      });
    });

    document.getElementById('command-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = data.commands.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.description.toLowerCase().includes(query) ||
        c.aliases.some(a => a.toLowerCase().includes(query))
      );
      document.getElementById('commands-grid').innerHTML = this.renderCommandCards(filtered);
    });
  }

  renderCommandCards(commands) {
    if (!commands.length) {
      return '<div class="empty-state"><h3>No commands found</h3></div>';
    }
    return commands.map(cmd => `
      <div class="command-card">
        <div class="command-name">
          ${cmd.name}
          ${cmd.enabledSlash ? '<span class="badge badge-info">Slash</span>' : ''}
        </div>
        <div class="command-desc">${cmd.description}</div>
        <div class="command-meta">
          <span class="badge badge-secondary">${this.formatCategory(cmd.category)}</span>
          ${cmd.aliases.length ? `<span class="badge badge-secondary">Aliases: ${cmd.aliases.join(', ')}</span>` : ''}
          <span class="badge badge-secondary">${cmd.cooldown}s cooldown</span>
        </div>
      </div>
    `).join('');
  }

  async renderGuildSettings(container) {
    if (!this.selectedGuild) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>No Server Selected</h3>
            <p>Please select a server from the dropdown above</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}`);
      const guild = await res.json();
      
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">${guild.name}</h1>
          <p class="page-subtitle">Manage server settings and configuration</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${guild.memberCount.toLocaleString()}</div>
            <div class="stat-label">Members</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${guild.channels}</div>
            <div class="stat-label">Channels</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${guild.roles}</div>
            <div class="stat-label">Roles</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${guild.settings.ticketPanels}</div>
            <div class="stat-label">Ticket Panels</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Prefix Settings</h2>
              <p class="card-subtitle">Configure command prefixes for this server</p>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Current Prefixes</label>
            <input type="text" class="form-input" id="prefix-input" value="${guild.settings.prefixes.join(', ')}" placeholder="Enter prefixes separated by commas">
          </div>
          <button class="btn btn-primary" onclick="dashboard.savePrefix()">Save Prefixes</button>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Server Status</h2>
              <p class="card-subtitle">Current server feature status</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge ${guild.settings.isPremium ? 'badge-premium' : 'badge-secondary'}">
                ${guild.settings.isPremium ? '★ Premium' : 'Free'}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge ${guild.settings.isBlacklisted ? 'badge-danger' : 'badge-success'}">
                ${guild.settings.isBlacklisted ? 'Blacklisted' : 'Active'}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge ${guild.settings.inviteTracking ? 'badge-success' : 'badge-secondary'}">
                Invite Tracking: ${guild.settings.inviteTracking ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="alert alert-error">Failed to load guild data: ${error.message}</div>`;
    }
  }

  async savePrefix() {
    const input = document.getElementById('prefix-input');
    const prefixes = input.value.split(',').map(p => p.trim()).filter(Boolean);
    
    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}/prefix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes })
      });
      
      if (res.ok) {
        this.showNotification('Prefixes saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      this.showNotification('Failed to save prefixes', 'error');
    }
  }

  async renderGuildModeration(container) {
    if (!this.selectedGuild) {
      container.innerHTML = this.renderNoGuildSelected();
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Moderation</h1>
        <p class="page-subtitle">Manage warnings, mutes, and moderation logs</p>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">User Lookup</h2>
            <p class="card-subtitle">Search for a user to view their moderation history</p>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">User ID</label>
          <div style="display: flex; gap: 12px;">
            <input type="text" class="form-input" id="mod-user-id" placeholder="Enter user ID">
            <button class="btn btn-primary" onclick="dashboard.lookupUser()">Lookup</button>
          </div>
        </div>
        <div id="mod-user-result"></div>
      </div>
    `;
  }

  async lookupUser() {
    const userId = document.getElementById('mod-user-id').value;
    if (!userId) return;

    const resultDiv = document.getElementById('mod-user-result');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}/users/${userId}/moderation`);
      const data = await res.json();

      resultDiv.innerHTML = `
        <div style="margin-top: 20px;">
          <h3 style="margin-bottom: 16px;">Moderation History for ${userId}</h3>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${data.warnCount}</div>
              <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${data.muteHistory?.length || 0}</div>
              <div class="stat-label">Mutes</div>
            </div>
          </div>

          ${data.activeMute ? `
            <div class="alert alert-warning">
              <strong>Active Mute:</strong> ${data.activeMute.reason || 'No reason'}
            </div>
          ` : ''}

          ${data.warns.length ? `
            <div class="table-container" style="margin-top: 16px;">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Moderator</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.warns.map(w => `
                    <tr>
                      <td>${new Date(w.created_at).toLocaleDateString()}</td>
                      <td>${w.reason}</td>
                      <td>${w.moderator_id}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted); margin-top: 16px;">No warnings found</p>'}

          <div style="margin-top: 16px; display: flex; gap: 12px;">
            <button class="btn btn-danger btn-sm" onclick="dashboard.resetWarns('${userId}')">Reset Warnings</button>
            <button class="btn btn-danger btn-sm" onclick="dashboard.resetMutes('${userId}')">Reset Mutes</button>
          </div>
        </div>
      `;
    } catch (error) {
      resultDiv.innerHTML = `<div class="alert alert-error">Failed to lookup user: ${error.message}</div>`;
    }
  }

  async resetWarns(userId) {
    if (!confirm('Are you sure you want to reset all warnings for this user?')) return;
    
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/users/${userId}/warns`, { method: 'DELETE' });
      this.showNotification('Warnings reset successfully', 'success');
      this.lookupUser();
    } catch (error) {
      this.showNotification('Failed to reset warnings', 'error');
    }
  }

  async resetMutes(userId) {
    if (!confirm('Are you sure you want to reset all mutes for this user?')) return;
    
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/users/${userId}/mutes`, { method: 'DELETE' });
      this.showNotification('Mutes reset successfully', 'success');
      this.lookupUser();
    } catch (error) {
      this.showNotification('Failed to reset mutes', 'error');
    }
  }

  async renderGuildTickets(container) {
    if (!this.selectedGuild) {
      container.innerHTML = this.renderNoGuildSelected();
      return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}/tickets`);
      const data = await res.json();

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Tickets</h1>
          <p class="page-subtitle">Manage ticket system and panels</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.stats?.total || 0}</div>
            <div class="stat-label">Total Tickets</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.openTickets?.length || 0}</div>
            <div class="stat-label">Open Tickets</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.panels?.length || 0}</div>
            <div class="stat-label">Ticket Panels</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.stats?.avgRating?.toFixed(1) || 'N/A'}</div>
            <div class="stat-label">Avg Rating</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Ticket Panels</h2>
              <p class="card-subtitle">Configure your ticket panels</p>
            </div>
          </div>
          ${data.panels?.length ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Panel ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.panels.map(p => `
                    <tr>
                      <td>${p.panel_id}</td>
                      <td>${p.title || 'Unnamed Panel'}</td>
                      <td>${p.category_id || 'Not set'}</td>
                      <td>
                        <button class="btn btn-danger btn-sm" onclick="dashboard.deletePanel('${p.panel_id}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted);">No ticket panels configured</p>'}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="alert alert-error">Failed to load tickets: ${error.message}</div>`;
    }
  }

  async deletePanel(panelId) {
    if (!confirm('Are you sure you want to delete this panel?')) return;

    try {
      await fetch(`/api/guilds/${this.selectedGuild}/tickets/panels/${panelId}`, { method: 'DELETE' });
      this.showNotification('Panel deleted successfully', 'success');
      this.renderGuildTickets(document.getElementById('content'));
    } catch (error) {
      this.showNotification('Failed to delete panel', 'error');
    }
  }

  async renderGuildInvites(container) {
    if (!this.selectedGuild) {
      container.innerHTML = this.renderNoGuildSelected();
      return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}/invites`);
      const data = await res.json();

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Invite Tracking</h1>
          <p class="page-subtitle">Track and manage member invites</p>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Settings</h2>
            </div>
            <label class="toggle">
              <input type="checkbox" id="invite-tracking-toggle" ${data.enabled ? 'checked' : ''} onchange="dashboard.toggleInviteTracking()">
              <span class="toggle-switch"></span>
              <span>Invite Tracking</span>
            </label>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Invite Leaderboard</h2>
              <p class="card-subtitle">Top inviters in this server</p>
            </div>
          </div>
          ${data.leaderboard?.length ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User ID</th>
                    <th>Total Invites</th>
                    <th>Regular</th>
                    <th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.leaderboard.map((u, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${u.user_id}</td>
                      <td><strong>${u.total || 0}</strong></td>
                      <td>${u.regular || 0}</td>
                      <td>${u.bonus || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted);">No invite data available</p>'}
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Invite Ranks</h2>
              <p class="card-subtitle">Roles awarded based on invite count</p>
            </div>
          </div>
          ${data.ranks?.length ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Role ID</th>
                    <th>Invites Required</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.ranks.map(r => `
                    <tr>
                      <td>${r.role_id}</td>
                      <td>${r.invites_required}</td>
                      <td>
                        <button class="btn btn-danger btn-sm" onclick="dashboard.removeInviteRank('${r.role_id}')">Remove</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted);">No invite ranks configured</p>'}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="alert alert-error">Failed to load invites: ${error.message}</div>`;
    }
  }

  async toggleInviteTracking() {
    const enabled = document.getElementById('invite-tracking-toggle').checked;
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/invites/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      this.showNotification(`Invite tracking ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      this.showNotification('Failed to update setting', 'error');
    }
  }

  async removeInviteRank(roleId) {
    if (!confirm('Remove this invite rank?')) return;
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/invites/ranks/${roleId}`, { method: 'DELETE' });
      this.showNotification('Invite rank removed', 'success');
      this.renderGuildInvites(document.getElementById('content'));
    } catch (error) {
      this.showNotification('Failed to remove rank', 'error');
    }
  }

  async renderGuildMusic(container) {
    if (!this.selectedGuild) {
      container.innerHTML = this.renderNoGuildSelected();
      return;
    }

    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const res = await fetch(`/api/guilds/${this.selectedGuild}/music`);
      const data = await res.json();

      if (!data.active) {
        container.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Music Player</h1>
            <p class="page-subtitle">Control music playback</p>
          </div>
          <div class="card">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>
                <path d="M8 17V5l12-2v12"/>
              </svg>
              <h3>No Active Player</h3>
              <p>Start playing music in a voice channel to use the controls</p>
            </div>
          </div>
        `;
        return;
      }

      const current = data.current?.info || {};
      
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Music Player</h1>
          <p class="page-subtitle">Control music playback</p>
        </div>

        <div class="player-card">
          <div class="player-info">
            <img class="player-artwork" src="${current.artworkUrl || current.thumbnail || '/assets/default-artwork.png'}" alt="Artwork" onerror="this.src='/assets/default-artwork.png'">
            <div class="player-details">
              <div class="player-title">${current.title || 'Unknown Track'}</div>
              <div class="player-artist">${current.author || 'Unknown Artist'}</div>
              <div class="player-controls">
                <button class="player-btn secondary" onclick="dashboard.musicAction('skip')">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <button class="player-btn" onclick="dashboard.musicAction('pause')">
                  ${data.paused ? 
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><polygon points="5 3 19 12 5 21 5 3"/></svg>' :
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                  }
                </button>
                <button class="player-btn secondary" onclick="dashboard.musicAction('stop')">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="6" width="12" height="12"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div class="volume-slider" style="display: flex; align-items: center; gap: 12px; margin-top: 16px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <input type="range" min="0" max="150" value="${data.volume || 100}" onchange="dashboard.setVolume(this.value)">
            <span id="volume-value">${data.volume || 100}%</span>
          </div>
        </div>

        <div class="card" style="margin-top: 24px;">
          <div class="card-header">
            <div>
              <h2 class="card-title">Queue</h2>
              <p class="card-subtitle">${data.queueSize} tracks in queue</p>
            </div>
          </div>
          ${data.queue?.length ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.queue.map((track, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${track.info?.title || 'Unknown'}</td>
                      <td>${this.formatDuration(track.info?.duration || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--text-muted);">Queue is empty</p>'}
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="alert alert-error">Failed to load music: ${error.message}</div>`;
    }
  }

  async musicAction(action) {
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/music/${action}`, { method: 'POST' });
      setTimeout(() => this.renderGuildMusic(document.getElementById('content')), 500);
    } catch (error) {
      this.showNotification(`Failed to ${action}`, 'error');
    }
  }

  async setVolume(value) {
    document.getElementById('volume-value').textContent = `${value}%`;
    try {
      await fetch(`/api/guilds/${this.selectedGuild}/music/volume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: parseInt(value) })
      });
    } catch (error) {
      this.showNotification('Failed to set volume', 'error');
    }
  }

  renderPremium(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Premium Management</h1>
        <p class="page-subtitle">Grant and revoke premium access</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Grant User Premium</h2>
        </div>
        <div class="form-group">
          <label class="form-label">User ID</label>
          <input type="text" class="form-input" id="premium-user-id" placeholder="Enter user ID">
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <input type="text" class="form-input" id="premium-user-reason" placeholder="Reason for premium">
        </div>
        <button class="btn btn-primary" onclick="dashboard.grantUserPremium()">Grant Premium</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Grant Server Premium</h2>
        </div>
        <div class="form-group">
          <label class="form-label">Server ID</label>
          <input type="text" class="form-input" id="premium-guild-id" placeholder="Enter server ID">
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <input type="text" class="form-input" id="premium-guild-reason" placeholder="Reason for premium">
        </div>
        <button class="btn btn-primary" onclick="dashboard.grantGuildPremium()">Grant Premium</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Revoke Premium</h2>
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div class="form-group">
              <label class="form-label">User ID to Revoke</label>
              <input type="text" class="form-input" id="revoke-user-id" placeholder="User ID">
            </div>
            <button class="btn btn-danger" onclick="dashboard.revokeUserPremium()">Revoke User</button>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <div class="form-group">
              <label class="form-label">Server ID to Revoke</label>
              <input type="text" class="form-input" id="revoke-guild-id" placeholder="Server ID">
            </div>
            <button class="btn btn-danger" onclick="dashboard.revokeGuildPremium()">Revoke Server</button>
          </div>
        </div>
      </div>
    `;
  }

  async grantUserPremium() {
    const userId = document.getElementById('premium-user-id').value;
    const reason = document.getElementById('premium-user-reason').value;
    if (!userId) return this.showNotification('User ID required', 'error');

    try {
      await fetch('/api/premium/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });
      this.showNotification('Premium granted to user', 'success');
    } catch (error) {
      this.showNotification('Failed to grant premium', 'error');
    }
  }

  async grantGuildPremium() {
    const guildId = document.getElementById('premium-guild-id').value;
    const reason = document.getElementById('premium-guild-reason').value;
    if (!guildId) return this.showNotification('Server ID required', 'error');

    try {
      await fetch('/api/premium/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, reason })
      });
      this.showNotification('Premium granted to server', 'success');
    } catch (error) {
      this.showNotification('Failed to grant premium', 'error');
    }
  }

  async revokeUserPremium() {
    const userId = document.getElementById('revoke-user-id').value;
    if (!userId) return;

    try {
      await fetch(`/api/premium/user/${userId}`, { method: 'DELETE' });
      this.showNotification('User premium revoked', 'success');
    } catch (error) {
      this.showNotification('Failed to revoke', 'error');
    }
  }

  async revokeGuildPremium() {
    const guildId = document.getElementById('revoke-guild-id').value;
    if (!guildId) return;

    try {
      await fetch(`/api/premium/guild/${guildId}`, { method: 'DELETE' });
      this.showNotification('Server premium revoked', 'success');
    } catch (error) {
      this.showNotification('Failed to revoke', 'error');
    }
  }

  renderBlacklist(container) {
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Blacklist Management</h1>
        <p class="page-subtitle">Manage blacklisted users and servers</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Blacklist User</h2>
        </div>
        <div class="form-group">
          <label class="form-label">User ID</label>
          <input type="text" class="form-input" id="blacklist-user-id" placeholder="Enter user ID">
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <input type="text" class="form-input" id="blacklist-user-reason" placeholder="Reason for blacklist">
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-danger" onclick="dashboard.blacklistUser()">Blacklist User</button>
          <button class="btn btn-success" onclick="dashboard.unblacklistUser()">Unblacklist User</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Blacklist Server</h2>
        </div>
        <div class="form-group">
          <label class="form-label">Server ID</label>
          <input type="text" class="form-input" id="blacklist-guild-id" placeholder="Enter server ID">
        </div>
        <div class="form-group">
          <label class="form-label">Reason</label>
          <input type="text" class="form-input" id="blacklist-guild-reason" placeholder="Reason for blacklist">
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-danger" onclick="dashboard.blacklistGuild()">Blacklist Server</button>
          <button class="btn btn-success" onclick="dashboard.unblacklistGuild()">Unblacklist Server</button>
        </div>
      </div>
    `;
  }

  async blacklistUser() {
    const userId = document.getElementById('blacklist-user-id').value;
    const reason = document.getElementById('blacklist-user-reason').value;
    if (!userId) return this.showNotification('User ID required', 'error');

    try {
      await fetch('/api/blacklist/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });
      this.showNotification('User blacklisted', 'success');
    } catch (error) {
      this.showNotification('Failed to blacklist', 'error');
    }
  }

  async unblacklistUser() {
    const userId = document.getElementById('blacklist-user-id').value;
    if (!userId) return;

    try {
      await fetch(`/api/blacklist/user/${userId}`, { method: 'DELETE' });
      this.showNotification('User unblacklisted', 'success');
    } catch (error) {
      this.showNotification('Failed to unblacklist', 'error');
    }
  }

  async blacklistGuild() {
    const guildId = document.getElementById('blacklist-guild-id').value;
    const reason = document.getElementById('blacklist-guild-reason').value;
    if (!guildId) return this.showNotification('Server ID required', 'error');

    try {
      await fetch('/api/blacklist/guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, reason })
      });
      this.showNotification('Server blacklisted', 'success');
    } catch (error) {
      this.showNotification('Failed to blacklist', 'error');
    }
  }

  async unblacklistGuild() {
    const guildId = document.getElementById('blacklist-guild-id').value;
    if (!guildId) return;

    try {
      await fetch(`/api/blacklist/guild/${guildId}`, { method: 'DELETE' });
      this.showNotification('Server unblacklisted', 'success');
    } catch (error) {
      this.showNotification('Failed to unblacklist', 'error');
    }
  }

  // Utility methods
  renderNoGuildSelected() {
    return `
      <div class="card">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>No Server Selected</h3>
          <p>Please select a server from the dropdown above</p>
        </div>
      </div>
    `;
  }

  formatUptime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  formatCategory(cat) {
    return cat.split('/')[0].charAt(0).toUpperCase() + cat.split('/')[0].slice(1).toLowerCase();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning'}`;
    notification.style.cssText = 'position: fixed; top: 80px; right: 24px; z-index: 1001; max-width: 400px; animation: slideIn 0.3s ease;';
    notification.innerHTML = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

// Initialize dashboard
const dashboard = new Dashboard();
