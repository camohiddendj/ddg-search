import { parseCliArgs } from './args.js';
import {
  formatCompact,
  formatCsv,
  formatJson,
  formatJsonl,
  formatMarkdown,
  formatOpenSearch,
} from './formatters.js';
import { search } from './search.js';

export async function main(
  argv = process.argv.slice(2),
  { searchImpl = search, stdout = process.stdout, exit = process.exit } = {},
) {
  const { query, maxPages, format, region, time } = parseCliArgs(argv, exit);

  try {
    const data = await searchImpl(query, { maxPages, region, time });

    let output;
    switch (format) {
      case 'json':
        output = formatJson(data);
        break;
      case 'jsonl':
        output = formatJsonl(data);
        break;
      case 'csv':
        output = formatCsv(data);
        break;
      case 'opensearch':
        output = formatOpenSearch(data);
        break;
      case 'markdown':
        output = formatMarkdown(data);
        break;
      case 'compact':
        output = formatCompact(data);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    stdout.write(output + '\n');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    exit(1);
  }
}
