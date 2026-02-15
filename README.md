# ddg-search

DuckDuckGo HTML search scraper with multiple output formats. Provides a CLI and small library helpers to fetch result pages, handle pagination, and emit OpenSearch-style structured data.

## Requirements
- Node.js 22 or newer

## Installation
- Local dev: `npm install`
- Global CLI (from this repo): `npm install -g .` or `npm link`
- One-off run without install: `npx ./bin/ddg-search.js --help`

## CLI usage
```
Usage: ddg-search [options] <query>

Search DuckDuckGo and output results in structured formats.

Options:
  -f, --format <fmt>   Output format (default: json). See formats below.
  -p, --pages <n>      Maximum pages to scrape, 0 for unlimited (default: 5)
  -r, --region <code>  Region code, e.g. us-en, uk-en (default: all regions)
  -t, --time <range>   Time filter: d (day), w (week), m (month), y (year)
  -h, --help           Show this help message

Formats:
  json        OpenSearch 1.1 response conventions in JSON
  jsonl       One JSON object per result line (streaming-friendly)
  csv         CSV with headers
  opensearch  OpenSearch 1.1 Atom XML
  markdown    Numbered markdown list (LLM-friendly)
  compact     Minimal token format for LLM context windows

Results are written to stdout; progress is written to stderr.
```

## Examples
- `ddg-search "node.js tutorial"`
- `ddg-search -f csv -p 3 "linux kernel"`
- `ddg-search -f opensearch "rust programming" > results.xml`
- `ddg-search -f compact "api docs" | llm "summarize these results"`
- `ddg-search -p 0 "scrape everything"`
- `ddg-search -r us-en -t w "recent news"`
- `ddg-search "rust programming" | jq '.items[].link'`

## Programmatic usage
```js
import { search, formatJson } from 'ddg-search-cli';

const { results, spelling, zeroClick } = await search('rust programming', {
  maxPages: 2,
  region: 'us-en',
  time: 'w',
});

// Convert to OpenSearch-style JSON
const output = formatJson({ results, spelling, zeroClick });
console.log(output);
```
Exports also include `fetchPage`, `parsePage`, and formatters like `formatCsv`, `formatJsonl`, `formatMarkdown`, `formatOpenSearch`, and `formatCompact`.

## Notes
- DuckDuckGo may present bot-detection. The scraper stops early and returns collected results if that happens.
- Respect site terms of use and rate-limit your requests; `search()` inserts random delays between pages by default.

## Development
- Run tests: `npm test`
- Coverage: `npm run coverage`
- Lint: `npm run lint`
- Format check: `npm run format`; auto-fix: `npm run format:write`
