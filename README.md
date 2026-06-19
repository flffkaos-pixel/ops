# Marketing Ops

All 13 sites centralized monitoring & automation.

## What it does

| Workflow | Schedule | Description |
|---|---|---|
| `indexnow.yml` | 매일 06:00 KST | Bing, Naver, IndexNow에 sitemap 자동 제출 |
| `rss-monitor.yml` | 6시간마다 | RSS 피드 감지 → GitHub Issue 생성 |

## Cross-linking

각 사이트 footer에 아래 2줄을 추가:

```html
<link rel="stylesheet" href="https://freeutilities.pages.dev/crosslinks.css">
<script src="https://freeutilities.pages.dev/crosslinks.js" defer></script>
```

그리고 `crosslinks.json` + `crosslinks.js` + `crosslinks.css` 를
[freeutilities](https://github.com/flffkaos-pixel/utilities) 리포에 배포하세요.

## Sites

- freeaisite.pages.dev — Free AI / Agency / MCP / AI Engineering / 담타 / 펫트래블 / 사주 / GEO·SEO / 감정쓰레기통 / HealSense / SEO Toolkit / Everyone's Design / Free Utilities
