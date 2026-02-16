import { BASE_URL, USER_AGENT } from './constants.js';
import { isBotDetection, parsePage } from './parser.js';

export async function fetchPage(url, postData, fetchImpl = fetch, signal) {
  const opts = {
    headers: { 'User-Agent': USER_AGENT },
  };

  if (postData) {
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = new URLSearchParams(postData).toString();
  }

  if (signal) {
    opts.signal = signal;
  }

  const resp = await fetchImpl(url, opts);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  return resp.text();
}

export function randomDelay() {
  const ms = 800 + Math.random() * 2100;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function search(
  query,
  {
    maxPages,
    maxResults,
    region,
    time,
    signal,
    fetchImpl = fetch,
    delay = randomDelay,
    stderr = process.stderr,
  },
) {
  const allResults = [];
  let spelling = null;
  let zeroClick = null;
  let page = 0;
  const showProgress = stderr.isTTY;
  const limit = maxResults != null ? maxResults : Infinity;

  const params = new URLSearchParams({ q: query });
  if (region) params.set('kl', region);
  if (time) params.set('df', time);

  const firstHtml = await fetchPage(`${BASE_URL}?${params}`, null, fetchImpl, signal);

  if (isBotDetection(firstHtml)) {
    throw new Error('Anti-bot detection triggered on first request. Try again later.');
  }

  let parsed = parsePage(firstHtml);
  allResults.push(...parsed.results);
  spelling = parsed.spelling;
  zeroClick = parsed.zeroClick;
  page++;

  if (showProgress) {
    stderr.write(`\rPage ${page}: ${parsed.results.length} results (${allResults.length} total)`);
  }

  while (
    parsed.nextPageData &&
    !parsed.noMoreResults &&
    page < maxPages &&
    allResults.length < limit
  ) {
    await delay();

    const html = await fetchPage(BASE_URL, parsed.nextPageData, fetchImpl, signal);

    if (isBotDetection(html)) {
      if (showProgress) {
        stderr.write('\n');
        stderr.write('Anti-bot detection hit. Returning results collected so far.\n');
      }
      break;
    }

    parsed = parsePage(html);
    allResults.push(...parsed.results);
    page++;

    if (showProgress) {
      stderr.write(`\rPage ${page}: ${parsed.results.length} results (${allResults.length} total)`);
    }
  }

  if (showProgress) {
    stderr.write('\n');
  }

  const finalResults = allResults.length > limit ? allResults.slice(0, limit) : allResults;

  return { results: finalResults, spelling, zeroClick, pagesScraped: page, query };
}
