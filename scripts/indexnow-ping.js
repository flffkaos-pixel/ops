const https = require('https');
const sites = require('../sites.json').sites;

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

// ponytail: Bing sitemap ping (410 Gone) and Naver IndexNow (422) removed —
// IndexNow API covers Bing/Yandex/Seznam/Naver(지원 시). Re-add direct APIs if they return.
async function fetchSitemap(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('error', () => resolve(''));
      res.on('end', () => resolve(data));
    }).on('error', e => reject(e));
  });
}

function extractUrls(xml) {
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) urls.push(m[1]);
  return urls;
}

async function pingIndexNow(urls, siteUrl) {
  return new Promise(resolve => {
    if (!INDEXNOW_KEY) return resolve({ status: 0, body: 'no key' });
    const body = JSON.stringify({
      host: new URL(siteUrl).host,
      key: INDEXNOW_KEY,
      keyLocation: `${siteUrl}${siteUrl.endsWith('/') ? '' : '/'}${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000)
    });
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  let total = 0, ok = 0, failed = 0;
  for (const site of sites) {
    try {
      const xml = await fetchSitemap(site.sitemap);
      const urls = extractUrls(xml);
      total += urls.length;

      const r = await pingIndexNow(urls, site.url);
      if (r.status >= 200 && r.status < 300) ok++; else failed++;
      console.log(`[${site.name}] ${urls.length} URLs | IndexNow:${r.status || 'ERR'} ${r.body || ''}`);
    } catch (e) {
      failed++;
      console.error(`[${site.name}] FAILED: ${e.message}`);
    }
  }
  console.log(`\nTotal URLs across ${sites.length} sites: ${total} | submitted OK: ${ok} | failed/skipped: ${failed}`);

  if (process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_urls=${total}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_sites=${sites.length}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
