import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BASE_URL,
  USER_AGENT,
  escapeCsv,
  escapeXml,
  formatCompact,
  formatCsv,
  formatJson,
  formatJsonl,
  formatMarkdown,
  formatOpenSearch,
  fetchPage,
  isBotDetection,
  main,
  parseCliArgs,
  parsePage,
  randomDelay,
  search,
  usage,
} from '../src/index.js';

const readFixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const sampleData = {
  query: 'example query',
  pagesScraped: 2,
  spelling: { corrected: 'exam ple', original: 'example' },
  results: [
    {
      title: 'Result One',
      url: 'https://one.test',
      description: 'First snippet',
      displayUrl: 'one.test',
    },
    {
      title: 'Result Two',
      url: 'https://two.test',
      description: 'Second snippet',
      displayUrl: 'two.test',
    },
  ],
};

test('usage exits with code 1', () => {
  const exitFn = (code) => {
    throw new Error(`exit ${code}`);
  };
  assert.throws(() => usage(exitFn), /exit 1/);
});

test('parseCliArgs parses defaults and overrides', () => {
  const args = parseCliArgs(['-f', 'csv', '-p', '3', '-r', 'us-en', '-t', 'm', 'hello world']);
  assert.equal(args.query, 'hello world');
  assert.equal(args.maxPages, 3);
  assert.equal(args.format, 'csv');
  assert.equal(args.region, 'us-en');
  assert.equal(args.time, 'm');
});

test('parseCliArgs treats zero pages as infinite', () => {
  const args = parseCliArgs(['-p', '0', 'infinite']);
  assert.equal(args.maxPages, Infinity);
});

test('parseCliArgs parses --max-results', () => {
  const args = parseCliArgs(['-n', '5', 'hello']);
  assert.equal(args.maxResults, 5);
});

test('parseCliArgs leaves maxResults undefined when not provided', () => {
  const args = parseCliArgs(['hello']);
  assert.equal(args.maxResults, undefined);
});

test('parseCliArgs rejects invalid --max-results', () => {
  const exitFn = (code) => {
    throw new Error(`exit ${code}`);
  };
  assert.throws(() => parseCliArgs(['-n', '0', 'hi'], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['-n', '-3', 'hi'], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['-n', 'abc', 'hi'], exitFn), /exit 1/);
});

test('parseCliArgs rejects bad inputs', () => {
  const exitFn = (code) => {
    throw new Error(`exit ${code}`);
  };

  assert.throws(() => parseCliArgs([], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['-f', 'weird', 'hi'], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['--pages=-1', 'hi'], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['-t', 'z', 'hi'], exitFn), /exit 1/);
  assert.throws(() => parseCliArgs(['-p'], exitFn), /exit 1/);
});

test('isBotDetection identifies challenge markers', () => {
  assert.equal(isBotDetection('<div>anomaly-modal</div>'), true);
  assert.equal(isBotDetection('<html><body>No issues</body></html>'), false);
});

test('parsePage extracts results, spelling, and pagination', () => {
  const html = `
    <div id="did_you_mean">
      <a>Corrected Term</a>
      <a>"original term"</a>
    </div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/a">Title A</a>
      <div class="result__snippet">Snippet A</div>
      <span class="result__url">example.com/a</span>
    </div>
    <div class="result web-result result--ad">
      <a class="result__a" href="https://ad.test">Ad</a>
    </div>
    <div class="nav-link">
      <form>
        <input type="hidden" name="s" value="30" />
        <input type="hidden" name="token" value="abc" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  const parsed = parsePage(html);
  assert.equal(parsed.results.length, 1);
  assert.deepEqual(parsed.spelling, { corrected: 'Corrected Term', original: 'original term' });
  assert.equal(parsed.noMoreResults, false);
  assert.deepEqual(parsed.nextPageData, { s: '30', token: 'abc' });
});

test('parsePage skips incomplete results and nameless inputs', () => {
  const html = `
    <div class="result web-result">
      <a class="result__a">Missing href</a>
      <div class="result__snippet">Snippet</div>
      <span class="result__url">example.com</span>
    </div>
    <div class="nav-link">
      <form>
        <input type="hidden" value="no-name" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  const parsed = parsePage(html);
  assert.equal(parsed.results.length, 0);
  assert.deepEqual(parsed.nextPageData, {});
});

test('parsePage defaults missing hidden values to empty string', () => {
  const html = `
    <div class="nav-link">
      <form>
        <input type="hidden" name="token" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  const parsed = parsePage(html);
  assert.deepEqual(parsed.nextPageData, { token: '' });
});

test('parsePage detects end of results', () => {
  const html = `
    <div class="result--no-result"></div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/b">Title B</a>
      <div class="result__snippet">Snippet B</div>
      <span class="result__url">example.com/b</span>
    </div>
  `;
  const parsed = parsePage(html);
  assert.equal(parsed.noMoreResults, true);
  assert.equal(parsed.results.length, 1);
});

test('parsePage reads real first page fixture with pagination', () => {
  const html = readFixture('qDuckDuckGo.s0.html');
  const parsed = parsePage(html);

  assert.equal(parsed.spelling, null);
  assert.equal(parsed.noMoreResults, false);
  assert.equal(parsed.nextPageData.s, '10');
  assert.equal(parsed.results.length >= 10, true);
  assert.equal(
    parsed.results[0].title.includes('DuckDuckGo - Protection. Privacy. Peace of mind.'),
    true,
  );
});

test('parsePage flags terminal page fixture', () => {
  const html = readFixture('qDuckDuckGo.s265.html');
  const parsed = parsePage(html);

  assert.equal(parsed.noMoreResults, true);
  assert.equal(parsed.nextPageData, null);
  assert.equal(parsed.results.length, 0);
});

test('parsePage captures spelling suggestion from fixture', () => {
  const html = readFixture('qNikolii_Tesla.html');
  const parsed = parsePage(html);

  assert.deepEqual(parsed.spelling, { corrected: 'Nikola Tesla', original: 'Nikolii" Tesla' });
  assert.equal(parsed.results.length > 0, true);
  assert.equal(parsed.results[0].title.includes('Nikola Tesla - Wikipedia'), true);
});

test('parsePage drops ads and keeps organic results', () => {
  const html = readFixture('qMicrosoft.html');
  const parsed = parsePage(html);

  assert.equal(
    parsed.results.some((r) => r.title.includes('Official Site')),
    false,
  );
  assert.equal(parsed.results[0].title.includes('Microsoft - AI'), true);
});

test('parsePage extracts zero click result from fixture', () => {
  const html = readFixture('qMicrosoft.html');
  const parsed = parsePage(html);

  assert.notEqual(parsed.zeroClick, null);
  assert.equal(parsed.zeroClick.heading, 'Microsoft');
  assert.equal(parsed.zeroClick.url, 'https://en.wikipedia.org/wiki/Microsoft');
  assert.equal(
    parsed.zeroClick.abstract.includes('American multinational technology conglomerate'),
    true,
  );
  assert.equal(parsed.zeroClick.image, 'https://i.duckduckgo.com/i/e8be2f834e440d99.png');
  assert.equal(parsed.zeroClick.source, 'Wikipedia');
});

test('parsePage returns null zeroClick when absent', () => {
  const html = readFixture('qX.html');
  const parsed = parsePage(html);

  assert.equal(parsed.zeroClick, null);
});

test('formatters produce expected structures', () => {
  const json = formatJson(sampleData);
  const parsedJson = JSON.parse(json);
  assert.equal(parsedJson['opensearch:totalResults'], 2);
  assert.equal(parsedJson.items[0].position, 1);

  const jsonl = formatJsonl(sampleData).split('\n');
  assert.equal(jsonl.length, 2);
  const firstItem = JSON.parse(jsonl[0]);
  assert.equal(firstItem.title, 'Result One');

  const csv = formatCsv(sampleData);
  assert.equal(csv.split('\n')[1].startsWith('1,'), true);

  const md = formatMarkdown(sampleData);
  assert.equal(md.includes('# Search: example query'), true);
  assert.equal(md.includes('Did you mean'), true);

  const compact = formatCompact(sampleData);
  assert.equal(compact.includes('[1] Result One'), true);
});

test('formatters include zeroClick when present', () => {
  const dataWithZc = {
    ...sampleData,
    zeroClick: {
      heading: 'Test Topic',
      url: 'https://en.wikipedia.org/wiki/Test',
      abstract: 'Test is a thing.',
      image: 'https://example.com/img.png',
      source: 'Wikipedia',
    },
  };

  const json = formatJson(dataWithZc);
  const parsedJson = JSON.parse(json);
  assert.equal(parsedJson.zeroClick.heading, 'Test Topic');
  assert.equal(parsedJson.zeroClick.source, 'Wikipedia');

  const jsonl = formatJsonl(dataWithZc).split('\n');
  assert.equal(jsonl.length, 3);
  const zcLine = JSON.parse(jsonl[0]);
  assert.equal(zcLine.type, 'zeroClick');
  assert.equal(zcLine.heading, 'Test Topic');

  const md = formatMarkdown(dataWithZc);
  assert.equal(md.includes('**Test Topic**'), true);
  assert.equal(md.includes('(Wikipedia)'), true);

  const compact = formatCompact(dataWithZc);
  assert.equal(compact.includes('zero_click: Test Topic'), true);
  assert.equal(compact.includes('Test is a thing.'), true);

  const xml = formatOpenSearch(dataWithZc);
  assert.equal(xml.includes('category term="zeroClick"'), true);
  assert.equal(xml.includes('Test Topic'), true);
});

test('escaping helpers handle quotes and XML chars', () => {
  assert.equal(escapeCsv('hello'), 'hello');
  assert.equal(escapeCsv('he,llo'), '"he,llo"');
  assert.equal(escapeCsv('he"llo'), '"he""llo"');

  const xml = escapeXml('<tag attr="1">&</tag>');
  assert.equal(xml, '&lt;tag attr=&quot;1&quot;&gt;&amp;&lt;/tag&gt;');
});

test('formatOpenSearch escapes XML and includes entries', () => {
  const data = {
    query: 'x & y',
    pagesScraped: 1,
    results: [
      {
        title: '<T>',
        url: 'https://example.com/?a=1&b=2',
        description: '<desc>',
        displayUrl: 'example.com',
      },
    ],
  };
  const xml = formatOpenSearch(data);
  assert.equal(xml.includes('DuckDuckGo: x &amp; y'), true);
  assert.equal(xml.includes('&lt;T&gt;'), true);
  assert.equal(xml.includes('https://html.duckduckgo.com/html/?q=x%20%26%20y'), true);
});

test('search paginates, aggregates, and stops on no-more-results', async () => {
  const htmlFirst = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/1">Title 1</a>
      <div class="result__snippet">Snippet 1</div>
      <span class="result__url">example.com/1</span>
    </div>
    <div class="nav-link">
      <form>
        <input type="hidden" name="s" value="1" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  const htmlSecond = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/2">Title 2</a>
      <div class="result__snippet">Snippet 2</div>
      <span class="result__url">example.com/2</span>
    </div>
    <div class="result--no-result"></div>
  `;

  const pages = [htmlFirst, htmlSecond];
  const fetchImpl = async (url, opts) => {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => pages.shift(),
      url,
      opts,
    };
  };

  const data = await search('demo', {
    maxPages: 5,
    region: '',
    time: '',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: {
      buffer: '',
      isTTY: true,
      write(chunk) {
        this.buffer += chunk;
      },
    },
  });

  assert.equal(data.pagesScraped, 2);
  assert.equal(data.results.length, 2);
  assert.equal(data.results[0].title, 'Title 1');
  assert.equal(data.results[1].title, 'Title 2');
});

test('search respects maxResults and stops pagination early', async () => {
  const htmlPage = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/1">Title 1</a>
      <div class="result__snippet">Snippet 1</div>
      <span class="result__url">example.com/1</span>
    </div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/2">Title 2</a>
      <div class="result__snippet">Snippet 2</div>
      <span class="result__url">example.com/2</span>
    </div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/3">Title 3</a>
      <div class="result__snippet">Snippet 3</div>
      <span class="result__url">example.com/3</span>
    </div>
    <div class="nav-link">
      <form>
        <input type="hidden" name="s" value="10" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount++;
    return { ok: true, status: 200, statusText: 'OK', text: async () => htmlPage };
  };

  const data = await search('demo', {
    maxPages: 5,
    maxResults: 2,
    region: '',
    time: '',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: { isTTY: false, write() {} },
  });

  assert.equal(data.results.length, 2);
  assert.equal(fetchCount, 1, 'should not fetch page 2 since maxResults already met');
});

test('search slices results to maxResults when page returns more', async () => {
  const html = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/1">Title 1</a>
      <div class="result__snippet">Snippet 1</div>
      <span class="result__url">example.com/1</span>
    </div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/2">Title 2</a>
      <div class="result__snippet">Snippet 2</div>
      <span class="result__url">example.com/2</span>
    </div>
    <div class="result web-result">
      <a class="result__a" href="https://example.com/3">Title 3</a>
      <div class="result__snippet">Snippet 3</div>
      <span class="result__url">example.com/3</span>
    </div>
  `;

  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => html,
  });

  const data = await search('demo', {
    maxPages: 1,
    maxResults: 1,
    region: '',
    time: '',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: { isTTY: false, write() {} },
  });

  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].title, 'Title 1');
});

test('search rejects on bot detection', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '<div class="anomaly-modal">block</div>',
  });

  await assert.rejects(
    () =>
      search('blocked', {
        maxPages: 1,
        region: '',
        time: '',
        fetchImpl,
        delay: () => Promise.resolve(),
        stderr: { isTTY: false, write() {} },
      }),
    /Anti-bot detection triggered/,
  );
});

test('search shows progress and stops after anti-bot mid-run', async () => {
  const htmlFirst = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/1">Title 1</a>
      <div class="result__snippet">Snippet 1</div>
      <span class="result__url">example.com/1</span>
    </div>
    <div class="nav-link">
      <form>
        <input type="hidden" name="s" value="1" />
        <input type="submit" value="Next" />
      </form>
    </div>
  `;

  const htmlSecond = '<div class="challenge-form">blocked</div>';

  const pages = [htmlFirst, htmlSecond];
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => pages.shift(),
  });

  const stderr = {
    buffer: '',
    isTTY: true,
    write(chunk) {
      this.buffer += chunk;
    },
  };

  const data = await search('demo', {
    maxPages: 5,
    region: '',
    time: '',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr,
  });

  assert.equal(data.pagesScraped, 1);
  assert.equal(stderr.buffer.includes('Anti-bot detection hit'), true);
  assert.equal(stderr.buffer.includes('Page 1'), true);
});

test('search applies region and time parameters', async () => {
  const html = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/rt">Title RT</a>
      <div class="result__snippet">Snippet RT</div>
      <span class="result__url">example.com/rt</span>
    </div>
  `;

  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: true, status: 200, statusText: 'OK', text: async () => html };
  };

  await search('demo', {
    maxPages: 1,
    region: 'us-en',
    time: 'w',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: { isTTY: false, write() {} },
  });

  const firstCall = calls[0];
  assert.equal(firstCall.includes('kl=us-en'), true);
  assert.equal(firstCall.includes('df=w'), true);
});

test('search walks fixtures across pagination', async () => {
  const firstHtml = readFixture('qDuckDuckGo.s0.html');
  const secondHtml = readFixture('qDuckDuckGo.s265.html');
  const calls = [];

  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts });
    const html = calls.length === 1 ? firstHtml : secondHtml;
    return { ok: true, status: 200, statusText: 'OK', text: async () => html };
  };

  const data = await search('DuckDuckGo', {
    maxPages: 5,
    region: '',
    time: '',
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: { isTTY: false, write() {} },
  });

  const expectedResults = parsePage(firstHtml).results.length;
  assert.equal(data.pagesScraped, 2);
  assert.equal(data.results.length, expectedResults);
  assert.equal(calls[0].url.includes('DuckDuckGo'), true);
  assert.equal(calls[0].opts.headers['User-Agent'], USER_AGENT);
  assert.equal(calls[1].url, BASE_URL);
  assert.equal(calls[1].opts.method, 'POST');
  assert.equal(String(calls[1].opts.body).includes('s=10'), true);
});

test('main writes output using injected search', async () => {
  const stdout = {
    buffer: '',
    write(chunk) {
      this.buffer += chunk;
    },
  };
  const searchImpl = async (query) => ({
    query,
    pagesScraped: 1,
    results: [
      {
        title: 'Single',
        url: 'https://single.test',
        description: 'One',
        displayUrl: 'single.test',
      },
    ],
  });

  await main(['-f', 'compact', 'single'], {
    searchImpl,
    stdout,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    },
  });
  assert.equal(stdout.buffer.includes('[1] Single'), true);
});

test('main renders each format path', async () => {
  const formats = ['json', 'jsonl', 'csv', 'opensearch', 'markdown'];
  const stdout = {
    buffer: '',
    write(chunk) {
      this.buffer += chunk;
    },
  };
  const searchImpl = async (query) => ({
    query,
    pagesScraped: 1,
    spelling: null,
    results: [{ title: 'A', url: 'https://a.test', description: 'Alpha', displayUrl: 'a.test' }],
  });

  for (const format of formats) {
    stdout.buffer = '';
    await main(['-f', format, 'demo'], {
      searchImpl,
      stdout,
      exit: (code) => {
        throw new Error(`exit ${code}`);
      },
    });
    assert.equal(stdout.buffer.length > 0, true);
  }
});

test('main passes maxResults to search', async () => {
  let capturedOpts;
  const searchImpl = async (query, opts) => {
    capturedOpts = opts;
    return {
      query,
      pagesScraped: 1,
      results: [
        { title: 'A', url: 'https://a.test', description: 'Alpha', displayUrl: 'a.test' },
      ],
    };
  };
  const stdout = { buffer: '', write(chunk) { this.buffer += chunk; } };

  await main(['-n', '3', 'demo'], {
    searchImpl,
    stdout,
    exit: (code) => { throw new Error(`exit ${code}`); },
  });

  assert.equal(capturedOpts.maxResults, 3);
});

test('main exits when search fails', async () => {
  const stdout = { write() {} };
  const exitCalls = [];
  const exitFn = (code) => {
    exitCalls.push(code);
    throw new Error(`exit ${code}`);
  };
  await assert.rejects(
    () =>
      main(['-f', 'json', 'demo'], {
        searchImpl: async () => {
          throw new Error('boom');
        },
        stdout,
        exit: exitFn,
      }),
    /exit 1/,
  );
  assert.equal(exitCalls.includes(1), true);
});

test('BASE_URL and USER_AGENT are exported', () => {
  assert.equal(typeof BASE_URL, 'string');
  assert.equal(typeof USER_AGENT, 'string');
});

test('randomDelay resolves using timers', async () => {
  const original = globalThis.setTimeout;
  let scheduled = 0;
  globalThis.setTimeout = (fn) => {
    scheduled += 1;
    fn();
    return 0;
  };
  try {
    await randomDelay();
    assert.equal(scheduled > 0, true);
  } finally {
    globalThis.setTimeout = original;
  }
});

test('fetchPage passes signal to fetch', async () => {
  const controller = new AbortController();
  let capturedOpts;
  const fetchImpl = async (url, opts) => {
    capturedOpts = opts;
    return { ok: true, status: 200, statusText: 'OK', text: async () => 'html' };
  };
  await fetchPage('https://example.com', null, fetchImpl, controller.signal);
  assert.equal(capturedOpts.signal, controller.signal);
});

test('fetchPage omits signal when not provided', async () => {
  let capturedOpts;
  const fetchImpl = async (url, opts) => {
    capturedOpts = opts;
    return { ok: true, status: 200, statusText: 'OK', text: async () => 'html' };
  };
  await fetchPage('https://example.com', null, fetchImpl);
  assert.equal(capturedOpts.signal, undefined);
});

test('search passes signal through to fetchPage', async () => {
  const controller = new AbortController();
  const capturedSignals = [];
  const html = `
    <div class="result web-result">
      <a class="result__a" href="https://example.com/1">Title 1</a>
      <div class="result__snippet">Snippet 1</div>
      <span class="result__url">example.com/1</span>
    </div>
  `;
  const fetchImpl = async (url, opts) => {
    capturedSignals.push(opts.signal);
    return { ok: true, status: 200, statusText: 'OK', text: async () => html };
  };

  await search('demo', {
    maxPages: 1,
    region: '',
    time: '',
    signal: controller.signal,
    fetchImpl,
    delay: () => Promise.resolve(),
    stderr: { isTTY: false, write() {} },
  });

  assert.equal(capturedSignals[0], controller.signal);
});

test('search aborts when signal is triggered', async () => {
  const controller = new AbortController();
  let fetchCount = 0;
  const fetchImpl = async (url, opts) => {
    fetchCount++;
    if (opts.signal && opts.signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    if (fetchCount === 1) {
      // Abort after first fetch completes
      controller.abort();
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => `
        <div class="result web-result">
          <a class="result__a" href="https://example.com/${fetchCount}">Title ${fetchCount}</a>
          <div class="result__snippet">Snippet</div>
          <span class="result__url">example.com</span>
        </div>
        <div class="nav-link">
          <form>
            <input type="hidden" name="s" value="10" />
            <input type="submit" value="Next" />
          </form>
        </div>
      `,
    };
  };

  await assert.rejects(
    () =>
      search('demo', {
        maxPages: 5,
        region: '',
        time: '',
        signal: controller.signal,
        fetchImpl,
        delay: () => Promise.resolve(),
        stderr: { isTTY: false, write() {} },
      }),
    /aborted/i,
  );
});

test('fetchPage throws on HTTP errors', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    statusText: 'Boom',
    text: async () => '',
  });
  await assert.rejects(() => fetchPage('https://example.com', null, fetchImpl), /HTTP 500 Boom/);
});
