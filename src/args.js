import { parseArgs } from 'node:util';
import { usage } from './usage.js';

const SUPPORTED_FORMATS = ['json', 'jsonl', 'csv', 'opensearch', 'markdown', 'compact'];

export function parseCliArgs(argv = process.argv.slice(2), exitFn = process.exit) {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      args: argv,
      options: {
        format: { type: 'string', short: 'f', default: 'json' },
        pages: { type: 'string', short: 'p' },
        region: { type: 'string', short: 'r' },
        time: { type: 'string', short: 't' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (e) {
    console.error(`Error: ${e.message}`);
    exitFn(1);
    return { query: '', maxPages: 0, format: 'json', region: '', time: '' };
  }

  const { values, positionals } = parsed;

  if (values.help || positionals.length === 0) {
    usage(exitFn);
  }

  const query = positionals.join(' ');
  const parsedPages = values.pages != null ? parseInt(values.pages, 10) : 5;
  const maxPages = parsedPages === 0 ? Infinity : parsedPages;
  const format = values.format;
  const region = values.region || '';
  const time = values.time || '';

  if (!SUPPORTED_FORMATS.includes(format)) {
    console.error(`Unknown format: ${format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
    exitFn(1);
  }

  if (Number.isNaN(parsedPages) || parsedPages < 0) {
    console.error('--pages must be a non-negative integer (0 for unlimited)');
    exitFn(1);
  }

  if (time && !['d', 'w', 'm', 'y'].includes(time)) {
    console.error('Unknown time range: d, w, m, y');
    exitFn(1);
  }

  return { query, maxPages, format, region, time };
}

export { usage };
