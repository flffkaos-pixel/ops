const https = require('https');
const sites = require('../sites.json').sites;

const GITHUB_TOKEN = process.env.GH_TOKEN || '';
const REPO = process.env.GITHUB_REPOSITORY || 'flffkaos-pixel/ops';

async function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ops-bot' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const item = m[1];
    const title = (item.match(/<title>(.*?)<\/title>/) || [,''])[1];
    const link = (item.match(/<link>(.*?)<\/link>/) || [,''])[1];
    const description = (item.match(/<description>(.*?)<\/description>/) || [,''])[1];
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [,''])[1];
    if (title && link) items.push({ title, link, description, pubDate: pubDate || new Date().toUTCString() });
  }
  return items;
}

async function createIssue(title, body, labels) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ title, body, labels });
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${REPO}/issues`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ops-bot',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const rssSites = sites.filter(s => s.rss);

  for (const site of rssSites) {
    try {
      const xml = await fetch(site.rss);
      const items = parseRSS(xml);

      if (items.length === 0) {
        console.log(`[${site.name}] No RSS items found`);
        continue;
      }

      console.log(`[${site.name}] ${items.length} items`);

      if (GITHUB_TOKEN) {
        const issueBody = items.slice(0, 5).map(item =>
          `- [${item.title}](${item.link}) — ${(item.description || '').slice(0, 100)}`
        ).join('\n');

        await createIssue(
          `📡 ${site.name} — ${items[0].title.slice(0, 60)}`,
          `## New content from ${site.name}\n\n${issueBody}\n\n---\n_Automated RSS check_`,
          ['rss', 'auto']
        );

        console.log(`  → Issue created: ${items[0].title.slice(0, 40)}`);
      }
    } catch (e) {
      console.error(`[${site.name}] Failed: ${e.message}`);
    }
  }

  if (process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `checked=${rssSites.length}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
