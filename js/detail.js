const gridPreview = document.getElementById('grid-preview');
const tabButtons = document.querySelectorAll('.tab-chip');
const tabPanels = document.querySelectorAll('.tab-panel');
const categoryCountEl = document.getElementById('category-count');

const sampleBoard = {
  categories: ['Voyages', 'Space Race', 'Legends', 'Landmarks', 'Polar Expeditions'],
  points: [100, 200, 300, 400, 500],
  grid: [
    ['Mercator routes', 'Sputnik launch', 'King Arthur', 'Eiffel Tower', 'Amundsen base'],
    ['Pacific currents', 'Apollo 11', 'Odysseus', 'Machu Picchu', 'Falklands'],
    ['Silk Road', 'Hubble', 'Joan of Arc', 'Chichen Itza', 'Aurora science'],
    ['Magellan strait', 'Voyager probes', 'Robin Hood', 'Petra', 'Northwest Passage'],
    ['Polynesian stars', 'James Webb', 'Hercules', 'Angkor Wat', 'South Pole trek'],
  ],
};

function renderGridPreview() {
  if (!gridPreview) return;
  gridPreview.innerHTML = '';
  categoryCountEl.textContent = sampleBoard.categories.length;

  sampleBoard.points.forEach((points, rowIdx) => {
    sampleBoard.categories.forEach((cat, colIdx) => {
      const tile = document.createElement('div');
      tile.className = 'grid-tile';
      const header = document.createElement('h4');
      header.textContent = `${cat} · ${points}`;
      const body = document.createElement('p');
      body.textContent = sampleBoard.grid[rowIdx][colIdx];
      tile.appendChild(header);
      tile.appendChild(body);
      gridPreview.appendChild(tile);
    });
  });
}

function setActiveTab(tabKey) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabKey;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  tabPanels.forEach((panel) => {
    const visible = panel.dataset.panel === tabKey;
    panel.hidden = !visible;
  });
}

function bindTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });
}

function init() {
  renderGridPreview();
  bindTabs();
}

document.addEventListener('DOMContentLoaded', init);
