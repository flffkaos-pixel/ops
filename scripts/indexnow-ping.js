const https = require('https');
const sites = require('../sites.json').sites;

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

async function fetchSitemap(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
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
  const body = JSON.stringify({
    host: new URL(siteUrl).host,
    key: INDEXNOW_KEY,
    keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10000)
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function pingBing(siteUrl) {
  const sitemap = siteUrl + '/sitemap.xml';
  const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`;
  return new Promise((resolve, reject) => {
    https.get(url, res => resolve({ status: res.statusCode }));
  });
}

async function pingNaver(siteUrl) {
  // Naver IndexNow endpoint
  const sitemap = siteUrl + '/sitemap.xml';
  const url = `https://searchadvisor.naver.com/indexnow?url=${encodeURIComponent(sitemap)}`;
  return new Promise((resolve, reject) => {
    https.get(url, res => resolve({ status: res.statusCode }));
  });
}

async function main() {
  let total = 0;
  for (const site of sites) {
    try {
      const xml = await fetchSitemap(site.sitemap);
      const urls = extractUrls(xml);
      total += urls.length;

      // Bing & Naver direct ping (no key needed)
      const bing = await pingBing(site.url);
      const naver = await pingNaver(site.url);

      // IndexNow API (if key is set)
      let indexnow = null;
      if (INDEXNOW_KEY) {
        indexnow = await pingIndexNow(urls, site.url);
      }

      console.log(`[${site.name}] ${urls.length} URLs | Bing:${bing.status} Naver:${naver.status}${indexnow ? ' IndexNow:'+indexnow.status : ' (no key)'}`);
    } catch (e) {
      console.error(`[${site.name}] FAILED: ${e.message}`);
    }
  }
  console.log(`\nTotal URLs pinged across ${sites.length} sites: ${total}`);

  // GitHub Actions output
  if (process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_urls=${total}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_sites=${sites.length}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
