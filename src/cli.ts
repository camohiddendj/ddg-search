import { parseCliArgs } from '@/args.js';
import {
  formatCompact,
  formatCsv,
  formatJson,
  formatJsonl,
  formatMarkdown,
  formatOpenSearch,
} from '@/formatters.js';
import { search } from '@/search.js';
import type { ExitFn, MainDeps } from '@/types.js';

const defaultExit: ExitFn = (code) => process.exit(code);

export async function main(
  argv: string[] = process.argv.slice(2),
  { searchImpl = search, stdout = process.stdout, exit = defaultExit }: MainDeps = {},
): Promise<void> {
  const { query, maxPages, maxResults, format, region, time } = parseCliArgs(argv, exit);

  try {
    const data = await searchImpl(query, { maxPages, maxResults, region, time });

    let output: string;
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
    console.error(`Error: ${(err as Error).message}`);
    exit(1);
  }
}
