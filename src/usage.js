export function usage(exitFn = process.exit) {
  const text = `Usage: ddg-search [options] <query>

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
  markdown    Numbered markdown list (AI/LLM-friendly)
  compact     Minimal token format for LLM context windows

  Results are written to stdout; progress is written to stderr.

Examples:
  ddg-search "node.js tutorial"
  ddg-search -f csv -p 3 "linux kernel"
  ddg-search -f opensearch "rust programming" > results.xml
  ddg-search -f compact "api docs" | llm "summarize these results"
  ddg-search -p 0 "scrape everything"
  ddg-search -r us-en -t w "recent news"
  ddg-search "rust programming" | jq '.items[].link'`;
  console.error(text);
  exitFn(1);
}
