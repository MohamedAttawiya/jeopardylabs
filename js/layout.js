async function includePartials() {
  const includeTargets = document.querySelectorAll('[data-include]');
  for (const el of includeTargets) {
    const name = el.dataset.include;
    try {
      const res = await fetch(`/partials/${name}.html`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      console.error(`Failed to load partial: ${name}`, err);
    }
  }
}

function setupNavToggle() {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.menu-toggle');

  if (!header || !toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && header.classList.contains('open')) {
      header.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  includePartials();
  setupNavToggle();
});
