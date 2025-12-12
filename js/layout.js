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

document.addEventListener('DOMContentLoaded', async () => {
  await includePartials();
  setActiveNav();
});
