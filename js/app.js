import { setupLibrary } from './library.js';
import { openReader, closeReader } from './reader.js';

const el = id => document.getElementById(id);

async function start() {
  const response = await fetch('./data/stories.json');
  if (!response.ok) throw new Error('Catalog unavailable');
  const catalog = await response.json();
  const updateContinue = setupLibrary(catalog);

  function route() {
    const hash = location.hash;
    const entry = catalog.stories.find(story => hash === `#read/${encodeURIComponent(story.id)}`
      && story.status === 'available');
    closeReader();
    el('reader').hidden = !entry;
    el('home').hidden = !!entry;
    el('library-link').href = '#library';
    el('loading').hidden = true;

    if (entry) {
      document.title = `${entry.title} · CHS Pages`;
      window.scrollTo(0, 0);
      openReader(entry);
    } else {
      document.title = 'CHS Pages';
      updateContinue();
      if (hash === '#library' || hash.startsWith('#read/')) {
        el('library').focus();
        el('library').scrollIntoView();
      }
    }
  }

  window.addEventListener('hashchange', () => {
    if (location.hash !== '#main') route();
  });
  route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('Offline setup could not complete.', error);
    });
  }
}

start().catch(error => {
  el('loading').textContent = 'The library could not load. Refresh to try again.';
  console.error(error);
});
