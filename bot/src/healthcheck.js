import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const docswebPath = path.join(__dirname, '..', 'docsweb');

const CACHE_TTL_MS = 60 * 1000;
let featuresCache = null;
let featuresCacheAt = 0;

const extractStringField = (content, fieldName) => {
  const head = content.slice(0, 12000);
  const regex = new RegExp(`${fieldName}\\s*:\\s*([\"'\`])([\\s\\S]*?)\\1`, 'm');
  const match = head.match(regex);
  if (!match) return null;
  return match[2].replace(/\s+/g, ' ').trim();
};

const extractAliases = (content) => {
  const head = content.slice(0, 12000);
  const match = head.match(/aliases\s*:\s*\[([\s\S]*?)\]/m);
  if (!match) return [];
  const aliases = [];
  const regex = /[\"'\`]([^\"'\`]+)[\"'\`]/g;
  let item;
  while ((item = regex.exec(match[1])) !== null) {
    aliases.push(item[1]);
  }
  return aliases;
};

const extractEnabledSlash = (content) => {
  const head = content.slice(0, 12000);
  const match = head.match(/enabledSlash\s*:\s*(true|false)/m);
  if (!match) return null;
  return match[1] === 'true';
};

const walkDir = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(entryPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
};

const buildFeaturesIndex = () => {
  const commandsRoot = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsRoot)) {
    return {
      generatedAt: new Date().toISOString(),
      summary: { totalCommands: 0, slashEnabled: 0, categories: 0, subcategories: 0 },
      categories: [],
    };
  }

  const commandFiles = walkDir(commandsRoot);
  const commands = [];

  for (const filePath of commandFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = extractStringField(content, 'name');
    const description = extractStringField(content, 'description');
    if (!name || !description) continue;

    const usage = extractStringField(content, 'usage');
    const categoryField = extractStringField(content, 'category');
    const aliases = extractAliases(content);
    const enabledSlash = extractEnabledSlash(content);

    const relativePath = path.relative(commandsRoot, filePath).split(path.sep);
    const category = categoryField || relativePath[0] || 'uncategorized';
    const subcategory = relativePath.length > 2 ? relativePath.slice(1, -1).join('/') : null;

    commands.push({
      name,
      description,
      usage: usage || null,
      aliases,
      enabledSlash: enabledSlash === null ? false : enabledSlash,
      category,
      subcategory,
      path: relativePath.join('/'),
    });
  }

  const categoryMap = new Map();
  for (const command of commands) {
    if (!categoryMap.has(command.category)) {
      categoryMap.set(command.category, { name: command.category, commands: [], subcategories: new Map() });
    }
    const categoryEntry = categoryMap.get(command.category);
    if (command.subcategory) {
      if (!categoryEntry.subcategories.has(command.subcategory)) {
        categoryEntry.subcategories.set(command.subcategory, []);
      }
      categoryEntry.subcategories.get(command.subcategory).push(command);
    } else {
      categoryEntry.commands.push(command);
    }
  }

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => ({
      name: category.name,
      commands: category.commands.sort((a, b) => a.name.localeCompare(b.name)),
      subcategories: Array.from(category.subcategories.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, commands]) => ({
          name,
          commands: commands.sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }));

  const slashEnabled = commands.filter((cmd) => cmd.enabledSlash).length;
  const subcategories = categories.reduce((acc, category) => acc + category.subcategories.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCommands: commands.length,
      slashEnabled,
      categories: categories.length,
      subcategories,
    },
    categories,
  };
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'AeroX Discord Music Bot is running',
      timestamp: new Date().toISOString(),
      dashboard: `http://localhost:${DASHBOARD_PORT}`,
    }));
    return;
  }

  if (req.url?.startsWith('/api/features')) {
    const refresh = req.url.includes('refresh=1');
    const now = Date.now();
    if (!featuresCache || refresh || now - featuresCacheAt > CACHE_TTL_MS) {
      featuresCache = buildFeaturesIndex();
      featuresCacheAt = now;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(featuresCache));
    return;
  }

  // Redirect root to the new dashboard
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(302, { 'Location': `http://localhost:${DASHBOARD_PORT}` });
    res.end();
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(docswebPath, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HealthCheck] Server running on port ${PORT}`);
  console.log(`[Dashboard] New dashboard available at http://localhost:${DASHBOARD_PORT}`);
});

server.on('error', (err) => {
  console.error('[HealthCheck] Error:', err);
});
