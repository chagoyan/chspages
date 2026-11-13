import { read } from './storage.js';

const el = id => document.getElementById(id);
const format = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function storyLink(story) {
  return `#read/${encodeURIComponent(story.id)}`;
}

export function readingTime(story) {
  return `${Math.max(1, Math.ceil(story.words / 220))} min read`;
}

function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function card(story) {
  const available = story.status === 'available';
  const article = node('article', '', 'card');
  article.dataset.volume = story.volume;
  const cover = node('div', '', 'cover');
  cover.setAttribute('aria-hidden', 'true');
  const details = node('div', '');
  const title = node('h4', '');
  if (available) {
    const link = node('a', story.title);
    link.href = storyLink(story);
    title.append(link);
  } else {
    title.textContent = story.title;
  }
  const meta = [story.author, story.genre];
  if (story.words) meta.push(readingTime(story));
  details.append(title, node('p', meta.join(' · ')),
    node('p', available ? 'Available to read' : 'Coming soon', available ? 'availability ready' : 'availability'));
  article.append(cover, details);
  return article;
}

export function setupLibrary({ volumes, stories }) {
  const available = stories.filter(story => story.status === 'available');
  const featured = available.find(story => story.featured) ?? available[0];
  if (featured) {
    el('feature-title').textContent = featured.title;
    el('feature-meta').textContent = `${featured.author} · ${readingTime(featured)}`;
    el('feature-description').textContent = featured.description;
    el('feature-link').href = storyLink(featured);
  } else {
    el('feature-title').closest('section').hidden = true;
  }

  const comingSoon = stories.length - available.length;
  el('catalog-summary').textContent = comingSoon
    ? `${available.length} available · ${comingSoon} coming soon`
    : `${available.length} stories available`;
  for (const volume of volumes) {
    const book = node('a', '', 'volume-book');
    book.href = '#library';
    book.dataset.volume = volume.id;
    const emblem = document.createElement('img');
    emblem.src = './icons/icon-192.png';
    emblem.alt = '';
    emblem.width = 52;
    emblem.height = 52;
    book.append(node('span', `Volume ${volume.id}`, 'volume-book-number'),
      emblem, node('strong', volume.title),
      node('span', volume.description, 'volume-book-description'));
    book.addEventListener('click', () => {
      el('volume').value = volume.id;
      el('genre').value = '';
      el('search').value = '';
      filter();
      if (location.hash === '#library') {
        el('library').focus();
        el('library').scrollIntoView();
      }
    });
    el('volume-books').append(book);
    el('volume').add(new Option(`Volume ${volume.id} · ${volume.title}`, volume.id));
  }
  for (const genre of [...new Set(stories.map(story => story.genre))].sort()) {
    el('genre').add(new Option(genre, genre));
  }

  function filter() {
    const query = format(el('search').value.trim());
    const selectedVolume = el('volume').value;
    const genre = el('genre').value;
    const matching = stories.filter(story => format(`${story.title} ${story.author}`).includes(query)
      && (!selectedVolume || story.volume === selectedVolume)
      && (!genre || story.genre === genre));
    el('results-status').textContent = matching.length
      ? `${matching.length} ${matching.length === 1 ? 'story' : 'stories'}`
      : 'No stories match your search.';
    const sections = [];
    for (const volume of volumes) {
      const titles = matching.filter(story => story.volume === volume.id);
      if (!titles.length) continue;
      const section = node('section', '', 'volume');
      const heading = node('div', '', 'volume-heading');
      const title = node('h3', volume.title);
      title.id = `volume-${volume.id}`;
      section.setAttribute('aria-labelledby', title.id);
      heading.append(node('p', `Volume ${volume.id}`, 'eyebrow'), title,
        node('p', volume.description, 'volume-description'));
      const grid = node('div', '', 'books');
      grid.append(...titles.map(card));
      section.append(heading, grid);
      sections.push(section);
    }
    el('volumes').replaceChildren(...sections);
  }

  el('search').closest('form').addEventListener('submit', event => event.preventDefault());
  el('search').addEventListener('input', filter);
  el('volume').addEventListener('change', filter);
  el('genre').addEventListener('change', filter);
  filter();

  return function updateContinue() {
    const started = available
      .filter(story => read('progress', story.id))
      .sort((a, b) => read('progress', b.id).updated - read('progress', a.id).updated);
    el('continue').hidden = !started.length;
    el('continue-list').replaceChildren(...started.map(story => {
      const progress = read('progress', story.id);
      const row = node('div', '', 'resume');
      const link = node('a', story.title);
      link.href = storyLink(story);
      row.append(link, node('p', progress.finished ? 'Final page' : `${progress.percent}% through · ${story.author}`));
      return row;
    }));
  };
}
