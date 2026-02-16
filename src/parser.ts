import * as cheerio from 'cheerio';
import type { ParsedPage, SearchResult, SpellingCorrection, ZeroClick } from '@/types.js';

export function isBotDetection(html: string): boolean {
  return html.includes('anomaly-modal') || html.includes('challenge-form');
}

export function parsePage(html: string): ParsedPage {
  const $ = cheerio.load(html);

  let spelling: SpellingCorrection | null = null;
  const didYouMean = $('#did_you_mean');
  if (didYouMean.length) {
    const links = didYouMean.find('a');
    const correctedLink = links.first();
    if (correctedLink.length) {
      spelling = { corrected: correctedLink.text().trim() };
      const originalLink = links.eq(1);
      if (originalLink.length) {
        spelling.original = originalLink.text().trim().replace(/^"|"$/g, '');
      }
    }
  }

  let zeroClick: ZeroClick | null = null;
  const zciEl = $('.zci-wrapper .zci');
  if (zciEl.length) {
    const headingAnchor = zciEl.find('.zci__heading a');
    const abstractEl = zciEl.find('#zero_click_abstract');
    const imageEl = abstractEl.find('.zci__image');
    const sourceLink = abstractEl.find('a q');

    const heading = headingAnchor.text().trim();
    const url = headingAnchor.attr('href') ?? '';

    const abstractClone = abstractEl.clone();
    abstractClone.find('a').remove();
    const abstract = abstractClone.text().trim();

    if (heading) {
      zeroClick = { heading, url, abstract };
      const imageSrc = imageEl.attr('src');
      if (imageSrc) zeroClick.image = imageSrc;
      const sourceName = sourceLink.text().trim();
      if (sourceName) zeroClick.source = sourceName;
    }
  }

  const results: SearchResult[] = [];
  $('.result.web-result')
    .not('.result--ad')
    .not('.result--no-result')
    .each((_i, el) => {
      const $el = $(el);
      const titleEl = $el.find('.result__a');
      const snippetEl = $el.find('.result__snippet');
      const urlEl = $el.find('.result__url');

      const title = titleEl.text().trim();
      const url = titleEl.attr('href') ?? '';
      const description = snippetEl.text().trim();
      const displayUrl = urlEl.text().trim();

      if (title && url) {
        results.push({ title, url, description, displayUrl });
      }
    });

  const noMoreResults = $('.result--no-result').length > 0;

  let nextPageData: Record<string, string> | null = null;
  $('.nav-link').each((_i, el) => {
    const $form = $(el).find('form');
    const submitBtn = $form.find('input[type="submit"]');
    if (submitBtn.val() === 'Next') {
      const data: Record<string, string> = {};
      $form.find('input[type="hidden"]').each((_j, input) => {
        const $input = $(input);
        const name = $input.attr('name');
        if (name) {
          data[name] = $input.attr('value') ?? '';
        }
      });
      nextPageData = data;
    }
  });

  return { results, spelling, zeroClick, noMoreResults, nextPageData };
}
