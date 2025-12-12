async function includePartials() {
  const includeTargets = document.querySelectorAll('[data-include]');
  const tasks = Array.from(includeTargets).map(async (el) => {
    const name = el.dataset.include;
    try {
      const res = await fetch(`/partials/${name}.html`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error(`Failed to load partial: ${name}`, err);
    }
  });

  await Promise.all(tasks);
}

function setActiveNav() {
  const body = document.body;
  const activeKey = body.dataset.nav || Array.from(body.classList).find((cls) => cls.startsWith('page-'))?.replace('page-', '') || '';
  const map = {
    home: 'home',
    boards: 'all-games',
    create: 'all-games',
  };
  const target = map[activeKey] || activeKey;
  if (!target) return;
  const links = document.querySelectorAll('.nav-links a[data-nav]');
  links.forEach((link) => {
    const isMatch = link.dataset.nav === target;
    link.classList.toggle('is-active', isMatch);
  });
}

function initHeaderInteractions() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const menuToggle = header.querySelector('#menu-toggle');
  const searchToggle = header.querySelector('.search-toggle');
  const searchPanel = header.querySelector('.nav-search');
  const searchInput = searchPanel?.querySelector('input[type="search"]');

  const closeSearch = () => {
    if (!searchPanel || !searchToggle) return;
    searchPanel.classList.remove('is-open');
    searchToggle.setAttribute('aria-expanded', 'false');
  };

  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', () => {
      const willOpen = !searchPanel.classList.contains('is-open');
      if (willOpen && menuToggle) {
        menuToggle.checked = false;
      }
      searchPanel.classList.toggle('is-open', willOpen);
      searchToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        searchInput?.focus();
      }
    });
  }

  if (menuToggle && searchPanel) {
    menuToggle.addEventListener('change', () => {
      if (menuToggle.checked) {
        closeSearch();
      }
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      if (menuToggle) menuToggle.checked = false;
      closeSearch();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await includePartials();
  setActiveNav();
  initHeaderInteractions();
});
