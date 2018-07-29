import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores
    .map(store => {
      return dompurify.sanitize(`
      <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `);
    })
    .join('');
}

function typeAhead(search) {
  if (!search) return; // stops the queries if the search is empty
  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    // if no value, quit it
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    // else, show results!
    searchResults.style.display = 'block';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          const html = dompurify.sanitize(searchResultsHTML(res.data));
          searchResults.innerHTML = html;
          return;
        }
        // tell nothing came back
        searchResults.innerHTML = dompurify.sanitize(
          `<div class="search__result">No results for ${
            this.value
          } found!</div>`
        );
      })
      .catch(err => {
        console.error(err);
      });
  });

  // Handle keyboard inputs
  searchInput.on('keyup', e => {
    // check for arrows, if do not have these keycodes pressed on keyup
    if (![38, 40, 13].includes(e.keyCode)) {
      return; // skip it
    }
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (e.keyCode === 40 && current) {
      // if down and we are at some result
      // go to the next sibling or if last go to the first, cycling back up
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      // if down and not at some result yet
      // go to the first one as it is not on any result yet
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      // if up
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      // if enter is hit and is at some result
      window.location = current.href; // go to that actual page (the current href)
      return; // stop it when we hit enter!
    }
    // if there is a current class the remove all active class
    if (current) {
      current.classList.remove(activeClass);
    }
    // if not the add the active class
    next.classList.add(activeClass);
  });
}

export default typeAhead;
