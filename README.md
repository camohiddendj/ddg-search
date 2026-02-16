# ddg-search

DuckDuckGo HTML search scraper with multiple output formats. Provides a CLI and small library helpers to fetch result pages, handle pagination, and emit OpenSearch-style structured data.

## Requirements

- Node.js 22 or newer

## Installation

- Global CLI (npm): `npm install -g ddg-search`
- One-off run (npx): `npx ddg-search --help`
- Project dependency: `npm install ddg-search`
- Local dev from this repo: `pnpm install` then `pnpm link --global` or `pnpm install -g .` (enable via `corepack enable` if needed)

## CLI usage

```
Usage: ddg-search [options] <query>

Search DuckDuckGo and output results in structured formats.

Options:
  -f, --format <fmt>       Output format (default: json). See formats below.
  -p, --pages <n>          Maximum pages to scrape, 0 for unlimited (default: 5)
  -n, --max-results <n>    Maximum number of results to return
  -r, --region <code>      Region code, e.g. us-en, uk-en (default: all regions)
  -t, --time <range>       Time filter: d (day), w (week), m (month), y (year)
  -h, --help               Show this help message

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
- `ddg-search -n 5 "top results"`
- `ddg-search -r us-en -t w "recent news"`
- `ddg-search "rust programming" | jq '.items[].link'`

## Programmatic usage

```js
import { search, formatJson } from 'ddg-search';

const controller = new AbortController();

const { results, spelling, zeroClick } = await search('rust programming', {
  maxPages: 2,
  maxResults: 5, // stop early once 5 results are collected
  region: 'us-en',
  time: 'w',
  signal: controller.signal, // optional: cancel with controller.abort()
});

// Convert to OpenSearch-style JSON
const output = formatJson({ results, spelling, zeroClick });
console.log(output);
```

Exports also include `fetchPage`, `parsePage`, and formatters like `formatCsv`, `formatJsonl`, `formatMarkdown`, `formatOpenSearch`, and `formatCompact`. Full TypeScript type definitions are included.

## Notes

- DuckDuckGo may present bot-detection. The scraper stops early and returns collected results if that happens.
- Respect site terms of use and rate-limit your requests; `search()` inserts random delays between pages by default.

## Development

- Build: `pnpm run build`
- Run tests: `pnpm test`
- Coverage: `pnpm run coverage`
- Type check: `pnpm run typecheck`
- Lint: `pnpm run lint`
- Format check: `pnpm run format`; auto-fix: `pnpm run format:write`

## Links

- npm: https://www.npmjs.com/package/ddg-search
- GitHub: https://github.com/camohiddendj/ddg-search

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on issues and pull requests.
