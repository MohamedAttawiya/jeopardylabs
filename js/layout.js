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

document.addEventListener('DOMContentLoaded', () => {
  includePartials();
});
