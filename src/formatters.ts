import { BASE_URL } from '@/constants.js';
import type { SearchResponse } from '@/types.js';

export function escapeCsv(str: string): string {
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatJson(data: SearchResponse): string {
  const output: Record<string, unknown> = {
    'opensearch:totalResults': data.results.length,
    'opensearch:startIndex': 1,
    'opensearch:itemsPerPage': data.results.length,
    'opensearch:Query': {
      role: 'request',
      searchTerms: data.query,
    },
    pagesScraped: data.pagesScraped,
  };

  if (data.spelling) {
    output.spelling = data.spelling;
  }

  if (data.zeroClick) {
    output.zeroClick = data.zeroClick;
  }

  output.items = data.results.map((r, i) => ({
    position: i + 1,
    title: r.title,
    link: r.url,
    description: r.description,
    displayUrl: r.displayUrl,
  }));

  return JSON.stringify(output, null, 2);
}

export function formatJsonl(data: SearchResponse): string {
  const lines: string[] = [];
  if (data.zeroClick) {
    lines.push(JSON.stringify({ type: 'zeroClick', ...data.zeroClick }));
  }
  lines.push(
    ...data.results.map((r, i) =>
      JSON.stringify({
        position: i + 1,
        title: r.title,
        link: r.url,
        description: r.description,
      }),
    ),
  );
  return lines.join('\n');
}

export function formatCsv(data: SearchResponse): string {
  const lines = ['position,title,link,description'];
  for (let i = 0; i < data.results.length; i++) {
    const r = data.results[i];
    lines.push([i + 1, escapeCsv(r.title), escapeCsv(r.url), escapeCsv(r.description)].join(','));
  }
  return lines.join('\n');
}

export function formatOpenSearch(data: SearchResponse): string {
  const now = new Date().toISOString();
  const searchUrl = `${BASE_URL}?q=${encodeURIComponent(data.query)}`;

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<feed xmlns="http://www.w3.org/2005/Atom"\n';
  xml += '      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">\n';
  xml += `  <title>DuckDuckGo: ${escapeXml(data.query)}</title>\n`;
  xml += `  <link href="${escapeXml(searchUrl)}"/>\n`;
  xml += `  <updated>${now}</updated>\n`;
  xml += `  <id>${escapeXml(searchUrl)}</id>\n`;
  xml += `  <opensearch:totalResults>${data.results.length}</opensearch:totalResults>\n`;
  xml += '  <opensearch:startIndex>1</opensearch:startIndex>\n';
  xml += `  <opensearch:itemsPerPage>${data.results.length}</opensearch:itemsPerPage>\n`;
  xml += `  <opensearch:Query role="request" searchTerms="${escapeXml(data.query)}"/>\n`;

  if (data.zeroClick) {
    const zc = data.zeroClick;
    xml += '  <entry>\n';
    xml += `    <title type="text">${escapeXml(zc.heading)}</title>\n`;
    xml += `    <link href="${escapeXml(zc.url)}"/>\n`;
    xml += `    <id>${escapeXml(zc.url)}</id>\n`;
    xml += `    <summary>${escapeXml(zc.abstract)}</summary>\n`;
    xml += '    <category term="zeroClick"/>\n';
    xml += '  </entry>\n';
  }

  for (const r of data.results) {
    xml += '  <entry>\n';
    xml += `    <title>${escapeXml(r.title)}</title>\n`;
    xml += `    <link href="${escapeXml(r.url)}"/>\n`;
    xml += `    <id>${escapeXml(r.url)}</id>\n`;
    xml += `    <summary>${escapeXml(r.description)}</summary>\n`;
    xml += '  </entry>\n';
  }

  xml += '</feed>';
  return xml;
}

export function formatMarkdown(data: SearchResponse): string {
  const lines: string[] = [];
  lines.push(`# Search: ${data.query}`);
  lines.push(`${data.results.length} results from ${data.pagesScraped} page(s)\n`);

  if (data.spelling) {
    lines.push(`> **Did you mean:** ${data.spelling.corrected}\n`);
  }

  if (data.zeroClick) {
    const zc = data.zeroClick;
    lines.push(`> **${zc.heading}** — ${zc.abstract}`);
    const suffix = zc.source ? ` (${zc.source})` : '';
    lines.push(`> [Read more](${zc.url})${suffix}\n`);
  }

  for (let i = 0; i < data.results.length; i++) {
    const r = data.results[i];
    lines.push(`${i + 1}. [${r.title}](${r.url})`);
    if (r.description) {
      lines.push(`   ${r.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatCompact(data: SearchResponse): string {
  const lines: string[] = [];
  lines.push(`query: ${data.query}`);
  lines.push(`results: ${data.results.length}`);
  if (data.spelling) {
    lines.push(`did_you_mean: ${data.spelling.corrected}`);
  }
  if (data.zeroClick) {
    lines.push(`zero_click: ${data.zeroClick.heading}`);
    lines.push(`    ${data.zeroClick.url}`);
    lines.push(`    ${data.zeroClick.abstract}`);
  }
  lines.push('---');

  for (let i = 0; i < data.results.length; i++) {
    const r = data.results[i];
    lines.push(`[${i + 1}] ${r.title}`);
    lines.push(`    ${r.url}`);
    if (r.description) {
      lines.push(`    ${r.description}`);
    }
  }

  return lines.join('\n');
}
