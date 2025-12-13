// layout.js — hardened dropdown control
// - Loads header/footer partials
// - Injects CSS override to disable hover-open and inline forced display
// - Force-closes any pre-open states (<details open>, .is-open, inline styles)
// - Delegated dropdowns for both div.dropdown and details.dropdown
// - MutationObserver to neutralize late DOM/CSS forcing

// --------------- Partials ---------------
async function includePartials() {
  const includeTargets = document.querySelectorAll('[data-include]');
  const tasks = Array.from(includeTargets).map(async (el) => {
    const name = el.dataset.include;
    try {
      const res = await fetch(`/partials/${name}.html`, { credentials: 'same-origin' });
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error(`Failed to load partial: ${name}`, err);
    }
  });
  await Promise.all(tasks);
}

// --------------- Active nav ---------------
function setActiveNav() {
  const body = document.body;
  const activeKey =
    body.dataset.nav ||
    Array.from(body.classList).find((c) => c.startsWith('page-'))?.replace('page-', '') ||
    '';

  const map = { home: 'home', boards: 'all-games', create: 'all-games' };
  const target = map[activeKey] || activeKey;
  if (!target) return;

  const links = document.querySelectorAll('.nav-links a[data-nav]');
  links.forEach((link) => {
    const isMatch = link.dataset.nav === target;
    link.classList.toggle('is-active', isMatch);
    if (isMatch) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// --------------- Header interactions ---------------
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
      if (willOpen && menuToggle) menuToggle.checked = false;
      searchPanel.classList.toggle('is-open', willOpen);
      searchToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) searchInput?.focus();
    });
  }

  if (menuToggle && searchPanel) {
    menuToggle.addEventListener('change', () => {
      if (menuToggle.checked) closeSearch();
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      if (menuToggle) menuToggle.checked = false;
      closeSearch();
    }
  });
}

// --------------- CSS override (runtime) ---------------
function injectDropdownCSS() {
  if (document.getElementById('dropdown-fix-style')) return;
  const css = `
    /* default closed */
    .dropdown .dropdown-menu { display: none !important; }
    /* open only via JS state */
    .dropdown.is-open > .dropdown-menu { display: block !important; }
    /* kill hover-open behavior if present */
    .dropdown:hover > .dropdown-menu { display: none !important; }
    /* details fallback */
    details.dropdown .dropdown-menu { display: none !important; }
    details.dropdown.is-open > .dropdown-menu { display: block !important; }
  `;
  const style = document.createElement('style');
  style.id = 'dropdown-fix-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// --------------- Hard reset of open state ---------------
function forceCloseAllDropdowns(root = document) {
  // <details open>
  root.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
  // .is-open classes
  root.querySelectorAll('.dropdown.is-open').forEach((d) => d.classList.remove('is-open'));
  // inline display/visibility forcing on menus
  root.querySelectorAll('.dropdown-menu[style]').forEach((m) => {
    m.style.removeProperty('display');
    m.style.removeProperty('visibility');
    m.style.removeProperty('opacity');
    m.style.removeProperty('height');
  });
  // ARIA
  root.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach((t) =>
    t.setAttribute('aria-expanded', 'false')
  );
}

// --------------- Delegated dropdowns (div.dropdown) ---------------
function initDropdowns() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.dropdown-toggle');
    const dropdown = trigger?.closest('.dropdown');

    if (trigger && dropdown) {
      e.preventDefault();
      e.stopPropagation();

      const opening = !dropdown.classList.contains('is-open');

      // close others
      document.querySelectorAll('.dropdown.is-open').forEach((d) => {
        if (d !== dropdown) d.classList.remove('is-open');
      });
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach((t) =>
        t.setAttribute('aria-expanded', 'false')
      );

      dropdown.classList.toggle('is-open', opening);
      trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
      return;
    }

    // outside click closes all
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.is-open').forEach((d) => d.classList.remove('is-open'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach((t) =>
        t.setAttribute('aria-expanded', 'false')
      );
    }
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown.is-open').forEach((d) => d.classList.remove('is-open'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach((t) =>
        t.setAttribute('aria-expanded', 'false')
      );
    }
  });

  // Desktop resize closes
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      document.querySelectorAll('.dropdown.is-open').forEach((d) => d.classList.remove('is-open'));
      document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach((t) =>
        t.setAttribute('aria-expanded', 'false')
      );
    }
  });
}

// --------------- Delegated details-dropdowns ---------------
function initDetailsDropdowns() {
  document.addEventListener('click', (e) => {
    const summary = e.target.closest('summary');
    const details = summary?.closest('details.dropdown');
    if (!summary || !details) return;

    e.preventDefault();
    const opening = !details.classList.contains('is-open');

    // close others
    document.querySelectorAll('details.dropdown.is-open').forEach((d) => {
      if (d !== details) {
        d.classList.remove('is-open');
        d.removeAttribute('open');
      }
    });

    details.classList.toggle('is-open', opening);
    if (opening) details.setAttribute('open', '');
    else details.removeAttribute('open');
  });

  // outside click closes
  document.addEventListener('click', (e) => {
    if (!e.target.closest('details.dropdown')) {
      document.querySelectorAll('details.dropdown.is-open').forEach((d) => {
        d.classList.remove('is-open');
        d.removeAttribute('open');
      });
    }
  });

  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('details.dropdown.is-open').forEach((d) => {
        d.classList.remove('is-open');
        d.removeAttribute('open');
      });
    }
  });
}

// --------------- Mutation observer to sanitize late changes ---------------
let dropdownObserverStarted = false;
function startDropdownObserver() {
  if (dropdownObserverStarted) return;
  dropdownObserverStarted = true;

  const observer = new MutationObserver((mutations) => {
    let needsSanitize = false;
    for (const m of mutations) {
      if (
        m.type === 'attributes' &&
        (m.attributeName === 'open' ||
          m.attributeName === 'style' ||
          m.attributeName === 'class')
      ) {
        needsSanitize = true;
        break;
      }
      if (m.type === 'childList') needsSanitize = true;
    }
    if (needsSanitize) {
      // neutralize any attempt to force menus open
      forceCloseAllDropdowns(document);
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open', 'style', 'class'],
  });
}

// --------------- Boot ---------------
async function boot() {
  await includePartials();                             // inject header/footer (where the menu lives) :contentReference[oaicite:0]{index=0}
  injectDropdownCSS();                                 // runtime CSS override
  forceCloseAllDropdowns();                            // start from a clean closed state
  setActiveNav();
  initHeaderInteractions();
  initDropdowns();
  initDetailsDropdowns();
  startDropdownObserver();
}

// Single, non-duplicated startup
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
