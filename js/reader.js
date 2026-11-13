import { readingTime } from './library.js';
import { read, save } from './storage.js';
import { mountRating } from './ratings.js';

const el = id => document.getElementById(id);
const page = el('page');
const controls = el('reader-controls');
const editionSelect = el('edition');
const options = {
  'font-size': ['18', '21', '25', '30'],
  spacing: ['1.45', '1.7', '2'],
  theme: ['light', 'paper', 'dark']
};
const defaults = { 'font-size': '21', spacing: '1.7', theme: 'paper' };

let story;
let edition;
let request;
let paragraphs = [];
let pageStarts = [];
let wordCount = 0;
let anchor = 0;
let current = 0;
let previousBudget = 0;

function preferences() {
  for (const [id, allowed] of Object.entries(options)) {
    const stored = read('preferences', id);
    el(id).value = allowed.includes(stored) ? stored : defaults[id];
  }
  applyPreferences();
}

function applyPreferences() {
  page.style.setProperty('--reading-size', `${el('font-size').value}px`);
  page.style.setProperty('--reading-spacing', el('spacing').value);
  document.documentElement.dataset.theme = el('theme').value;
}

// Store a word offset so a saved place survives repagination.
function paginate() {
  if (!wordCount || !page.clientWidth) return;
  const style = getComputedStyle(page);
  const width = page.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const fontSize = parseFloat(style.fontSize);
  const charactersPerLine = Math.min(72, width / (fontSize * .48));
  const lines = Math.max(8, Math.min(23, (window.innerHeight - 130) / parseFloat(style.lineHeight)));
  const budget = Math.max(34, Math.floor(charactersPerLine * lines / 7.2));

  if (budget !== previousBudget) {
    previousBudget = budget;
    pageStarts = [];
    for (let start = 0; start < wordCount; start += budget) pageStarts.push(start);
  }
  current = Math.min(pageStarts.length - 1, Math.floor(anchor / budget));
  render();
}

function bookmark() {
  return read('bookmarks', story.id)?.[edition.id] ?? null;
}

function render() {
  const start = pageStarts[current];
  const end = pageStarts[current + 1] ?? wordCount;
  const content = [];
  for (const paragraph of paragraphs) {
    const from = Math.max(0, start - paragraph.start);
    const to = Math.min(paragraph.words.length, end - paragraph.start);
    if (from >= to) continue;
    const p = document.createElement('p');
    p.textContent = paragraph.words.slice(from, to).join(' ');
    content.push(p);
  }
  page.replaceChildren(...content);

  el('previous').disabled = current === 0;
  el('next').disabled = current === pageStarts.length - 1;
  el('page-number').textContent = `Page ${current + 1} of ${pageStarts.length}`;
  el('story-end').hidden = !el('next').disabled;
  const saved = bookmark();
  const here = saved !== null && saved >= start && saved < end;
  el('bookmark').setAttribute('aria-pressed', String(here));
  el('bookmark').textContent = here ? 'Remove bookmark' : 'Bookmark this page';
  el('jump-bookmark').hidden = saved === null || here;
}

function record() {
  save('progress', story.id, {
    edition: edition.id,
    anchor,
    percent: Math.floor(anchor / wordCount * 100),
    finished: current === pageStarts.length - 1,
    updated: Date.now()
  });
}

function jump(offset) {
  if (!wordCount || !Number.isInteger(offset)) return;
  anchor = offset;
  paginate();
  record();
  page.focus();
}

async function loadEdition(selected, position) {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  edition = selected;
  wordCount = 0;
  previousBudget = 0;
  el('pagination').hidden = true;
  el('story-end').hidden = true;
  el('bookmark').disabled = true;
  el('jump-bookmark').hidden = true;
  el('bookmark-status').textContent = '';
  page.replaceChildren();
  el('reader-status').textContent = 'Loading story…';

  try {
    const response = await fetch(selected.path, { signal: controller.signal });
    if (!response.ok) throw new Error('Story unavailable');
    const text = (await response.text()).trim();
    if (controller.signal.aborted) return;
    if (!text || text.startsWith('<')) throw new Error('Story text missing');

    paragraphs = text.split(/\r?\n\s*\r?\n/).map(text => {
      const words = text.split(/\s+/);
      const start = wordCount;
      wordCount += words.length;
      return { words, start };
    });
    anchor = Math.max(0, Math.min(wordCount - 1, typeof position === 'number' && !Number.isNaN(position) ? position : 0));
    el('reader-status').textContent = '';
    el('pagination').hidden = false;
    el('bookmark').disabled = false;
    // Establish the reading area's width before measuring an empty article.
    page.textContent = ' ';
    paginate();
    record();
  } catch {
    if (!controller.signal.aborted) {
      el('reader-status').textContent = 'This story could not load. Return to the library and reopen it to try again.';
    }
  }
}

export function closeReader() {
  request?.abort();
  wordCount = 0;
  document.documentElement.removeAttribute('data-theme');
}

export function openReader(entry) {
  story = entry;
  el('story-title').textContent = entry.title;
  el('story-title').focus();
  el('story-meta').textContent = `${entry.author} · ${readingTime(entry)}`;
  el('story-source').href = entry.source.url;
  el('story-source').textContent = entry.source.edition;
  el('source-line').hidden = false;

  const progress = read('progress', entry.id);
  const selected = entry.editions.find(version => version.id === progress?.edition) ?? entry.editions[0];
  editionSelect.replaceChildren(...entry.editions.map(version => new Option(version.label, version.id)));
  editionSelect.value = selected.id;
  el('edition-label').hidden = entry.editions.length < 2;
  preferences();
  controls.hidden = false;
  mountRating(el('rating'), entry.id);
  loadEdition(selected, progress?.finished ? Infinity : progress?.anchor);
}

for (const id of Object.keys(options)) {
  el(id).addEventListener('change', () => {
    save('preferences', id, el(id).value);
    applyPreferences();
    paginate();
  });
}
editionSelect.addEventListener('change', () => {
  loadEdition(story.editions.find(version => version.id === editionSelect.value), 0);
});

el('previous').addEventListener('click', () => jump(pageStarts[current - 1]));
el('next').addEventListener('click', () => {
  const following = current + 1;
  jump(following === pageStarts.length - 1 ? wordCount - 1 : pageStarts[following]);
});
el('jump-bookmark').addEventListener('click', () => jump(bookmark()));
el('bookmark').addEventListener('click', () => {
  const removing = el('bookmark').getAttribute('aria-pressed') === 'true';
  const saved = save('bookmarks', story.id, {
    ...read('bookmarks', story.id),
    [edition.id]: removing ? null : anchor
  });
  el('bookmark-status').textContent = removing ? 'Bookmark removed.' : saved ? 'Bookmark saved.' : 'Bookmark saved for this session.';
  render();
});

let frame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(paginate);
});
