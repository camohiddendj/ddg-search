export interface SearchResult {
  title: string;
  url: string;
  description: string;
  displayUrl: string;
}

export interface ZeroClick {
  heading: string;
  url: string;
  abstract: string;
  image?: string;
  source?: string;
}

export interface SpellingCorrection {
  corrected: string;
  original?: string;
}

export interface ParsedPage {
  results: SearchResult[];
  spelling: SpellingCorrection | null;
  zeroClick: ZeroClick | null;
  noMoreResults: boolean;
  nextPageData: Record<string, string> | null;
}

export interface SearchOptions {
  maxPages: number;
  maxResults?: number;
  region: string;
  time: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  delay?: () => Promise<void>;
  stderr?: Writable;
}

export interface SearchResponse {
  results: SearchResult[];
  spelling: SpellingCorrection | null;
  zeroClick: ZeroClick | null;
  pagesScraped: number;
  query: string;
}

export interface CliArgs {
  query: string;
  maxPages: number;
  maxResults: number | undefined;
  format: OutputFormat;
  region: string;
  time: string;
}

export type OutputFormat = 'json' | 'jsonl' | 'csv' | 'opensearch' | 'markdown' | 'compact';

export type ExitFn = (code: number) => void;

export interface Writable {
  write(chunk: string): boolean;
  isTTY?: boolean;
}

export interface MainDeps {
  searchImpl?: (query: string, opts: SearchOptions) => Promise<SearchResponse>;
  stdout?: Pick<NodeJS.WriteStream, 'write'>;
  exit?: ExitFn;
}
