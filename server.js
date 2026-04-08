const express = require('express');
const fetch = require('node-fetch');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ignore self-signed SSL certs (common in Jira DC on-premise)
const agent = new https.Agent({ rejectUnauthorized: false });

const config = { url: '', token: '' };

function jiraFetch(config, path, params = {}) {
  const url = new URL(config.url.replace(/\/$/, '') + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
    },
    agent,
  });
}

// ── CONFIG ────────────────────────────────────────────────
app.post('/api/config', async (req, res) => {
  const { url, token } = req.body || {};
  if (!url || !token) return res.status(400).json({ status: 'error', message: 'URL and token are required.' });
  config.url = url.replace(/\/$/, '');
  config.token = token;
  try {
    const r = await jiraFetch(config, '/rest/api/2/myself');
    if (!r.ok) {
      const text = await r.text();
      return res.status(400).json({ status: 'error', message: `HTTP ${r.status}: ${text.slice(0, 200)}` });
    }
    const me = await r.json();
    res.json({ status: 'ok', user: me.displayName || me.name || 'Unknown' });
  } catch (e) {
    res.status(400).json({ status: 'error', message: e.message });
  }
});

// ── PROJECTS ──────────────────────────────────────────────
app.get('/api/projects', async (req, res) => {
  try {
    const r = await jiraFetch(config, '/rest/api/2/project');
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.json(data.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: (p.avatarUrls || {})['24x24'] || '',
      projectTypeKey: p.projectTypeKey || '',
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── BOARDS ────────────────────────────────────────────────
app.get('/api/boards', async (req, res) => {
  try {
    const r = await jiraFetch(config, '/rest/agile/1.0/board', {
      projectKeyOrId: req.query.projectKey || '',
      maxResults: 50,
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.json(data.values || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ACTIVE SPRINT ─────────────────────────────────────────
app.get('/api/sprint/active', async (req, res) => {
  try {
    const r = await jiraFetch(config, `/rest/agile/1.0/board/${req.query.boardId}/sprint`, { state: 'active' });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    const sprints = data.values || [];
    res.json(sprints[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SPRINT ISSUES ─────────────────────────────────────────
app.get('/api/sprint/issues', async (req, res) => {
  try {
    const r = await jiraFetch(config, `/rest/agile/1.0/sprint/${req.query.sprintId}/issue`, {
      maxResults: 100,
      fields: 'summary,status,assignee,priority,issuetype',
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.json((data.issues || []).map(mapIssue));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── BACKLOG ───────────────────────────────────────────────
app.get('/api/backlog', async (req, res) => {
  try {
    const r = await jiraFetch(config, `/rest/agile/1.0/board/${req.query.boardId}/backlog`, {
      maxResults: 50,
      fields: 'summary,status,assignee,priority,issuetype',
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.json((data.issues || []).map(mapIssue));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SERVE FRONTEND ────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function mapIssue(iss) {
  const f = iss.fields || {};
  const status = f.status || {};
  const assignee = f.assignee || {};
  const priority = f.priority || {};
  const issuetype = f.issuetype || {};
  return {
    key: iss.key,
    summary: f.summary || '',
    statusName: status.name || '',
    statusCategory: (status.statusCategory || {}).key || '',
    assignee: assignee.displayName || 'Unassigned',
    priority: priority.name || '',
    issueType: issuetype.name || '',
  };
}

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n  Jira Dashboard running at http://localhost:${PORT}\n`);
});
