import { read, save } from './storage.js';

// Shared ratings can use a separate adapter once the server is configured.
export function mountRating(form, storyId) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = 'How much did you enjoy this story?';
  const stars = document.createElement('div');
  stars.className = 'stars';
  const status = document.createElement('p');
  status.className = 'rating-status';
  status.setAttribute('role', 'status');
  let rating = read('ratings', storyId) ?? 0;

  function display(message) {
    for (const [index, star] of [...stars.querySelectorAll('span')].entries()) {
      star.textContent = index < rating ? '★' : '☆';
    }
    status.textContent = message;
  }

  for (let value = 1; value <= 5; value++) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const star = document.createElement('span');
    input.type = 'radio';
    input.name = 'stars';
    input.value = value;
    input.checked = value === rating;
    input.setAttribute('aria-label', value === 1 ? '1 star' : `${value} stars`);
    star.setAttribute('aria-hidden', 'true');
    label.append(input, star);
    stars.append(label);
  }

  stars.addEventListener('change', event => {
    rating = Number(event.target.value);
    const persisted = save('ratings', storyId, rating);
    display(persisted ? `Your rating: ${rating} of 5 · Saved in this browser` : `Your rating: ${rating} of 5 · Saved for this session`);
  });

  fieldset.append(legend, stars);
  form.replaceChildren(fieldset, status);
  display(rating ? `Your rating: ${rating} of 5` : 'Your rating is personal.');
}
