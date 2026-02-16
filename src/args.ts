import { parseArgs } from 'node:util';
import { usage } from '@/usage.js';
import type { CliArgs, ExitFn, OutputFormat } from '@/types.js';

const SUPPORTED_FORMATS: OutputFormat[] = [
  'json',
  'jsonl',
  'csv',
  'opensearch',
  'markdown',
  'compact',
];

const defaultExit: ExitFn = (code) => process.exit(code);

export function parseCliArgs(
  argv: string[] = process.argv.slice(2),
  exitFn: ExitFn = defaultExit,
): CliArgs {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      args: argv,
      options: {
        format: { type: 'string', short: 'f', default: 'json' },
        pages: { type: 'string', short: 'p' },
        'max-results': { type: 'string', short: 'n' },
        region: { type: 'string', short: 'r' },
        time: { type: 'string', short: 't' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    exitFn(1);
    return { query: '', maxPages: 0, maxResults: undefined, format: 'json', region: '', time: '' };
  }

  const { values, positionals } = parsed;

  if (values.help || positionals.length === 0) {
    usage(exitFn);
  }

  const query = positionals.join(' ');
  const parsedPages = values.pages != null ? parseInt(values.pages, 10) : 5;
  const maxPages = parsedPages === 0 ? Infinity : parsedPages;
  const format = values.format;
  const region = values.region ?? '';
  const time = values.time ?? '';

  const rawMaxResults = values['max-results'];
  const parsedMaxResults = rawMaxResults != null ? parseInt(rawMaxResults, 10) : undefined;
  const maxResults = parsedMaxResults;

  if (!SUPPORTED_FORMATS.includes(format as OutputFormat)) {
    console.error(`Unknown format: ${format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    exitFn(1);
  }

  if (Number.isNaN(parsedPages) || parsedPages < 0) {
    console.error('--pages must be a non-negative integer (0 for unlimited)');
    exitFn(1);
  }

  if (parsedMaxResults != null && (Number.isNaN(parsedMaxResults) || parsedMaxResults < 1)) {
    console.error('--max-results must be a positive integer');
    exitFn(1);
  }

  if (time && !['d', 'w', 'm', 'y'].includes(time)) {
    console.error('Unknown time range: d, w, m, y');
    exitFn(1);
  }

  return { query, maxPages, maxResults, format, region, time };
}

export { usage };
