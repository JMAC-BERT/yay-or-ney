/*
 * script.js — Yay or Ney wine tracking app
 * All data persisted in localStorage as base64-encoded image entries.
 */

const STORAGE_KEY = 'wine_entries';

function loadEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save wine entries:', e);
  }
}

function colorEmoji(color) {
  return { Red: '🔴', White: '⚪', Rosé: '🌸', Sparkling: '✨', Other: '🍷' }[color] || '';
}

// ── Image preview ────────────────────────────────────────────
function initImagePreview() {
  const imageInput = document.getElementById('image');
  if (!imageInput) return;

  imageInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('previewImg');
      const zone = document.getElementById('fileDropZone');
      if (previewImg) previewImg.src = e.target.result;
      if (zone) zone.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  });
}

// ── Form submit ──────────────────────────────────────────────
function handleFormSubmit(event) {
  event.preventDefault();

  const fileInput     = document.getElementById('image');
  const labelInput    = document.querySelector('input[name="label"]:checked');
  const wineNameInput = document.getElementById('wineName');
  const colorInput    = document.getElementById('color');
  const varietalInput = document.getElementById('varietal');
  const priceInput    = document.getElementById('price');
  const notesInput    = document.getElementById('notes');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Please add a photo of the wine label.');
    return;
  }
  if (!labelInput) {
    alert('Please select Yay or Ney.');
    return;
  }

  const file     = fileInput.files[0];
  const label    = labelInput.value;
  const wineName = wineNameInput ? wineNameInput.value.trim() : '';
  const color    = colorInput    ? colorInput.value              : '';
  const varietal = varietalInput ? varietalInput.value.trim()   : '';
  const price    = priceInput && priceInput.value !== '' ? parseFloat(priceInput.value).toFixed(2) : null;
  const notes    = notesInput    ? notesInput.value.trim()       : '';
  const date     = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const reader = new FileReader();
  reader.onload = () => {
    const entries = loadEntries();
    entries.push({ id: Date.now(), imageData: reader.result, wineName, label, color, varietal, price, notes, date });
    saveEntries(entries);
    window.location.href = 'list.html';
  };
  reader.onerror = () => alert('Error reading the photo. Please try again.');
  reader.readAsDataURL(file);
}

// ── Sort ─────────────────────────────────────────────────────
function sortEntries(entries, sortBy) {
  const s = [...entries];
  switch (sortBy) {
    case 'oldest':     s.sort((a, b) => a.id - b.id); break;
    case 'price-asc':  s.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)); break;
    case 'price-desc': s.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0)); break;
    case 'yay-first':  s.sort((a) => (a.label === 'Yay' ? -1 : 1)); break;
    case 'ney-first':  s.sort((a) => (a.label === 'Ney' ? -1 : 1)); break;
    default:           s.sort((a, b) => b.id - a.id); // newest
  }
  return s;
}

// ── Render wine list ─────────────────────────────────────────
function renderWineList(entries) {
  const listContainer = document.getElementById('wineList');
  const emptyState    = document.getElementById('emptyState');
  if (!listContainer) return;

  const data = Array.isArray(entries) ? entries : loadEntries();

  if (!data || data.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    listContainer.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  listContainer.innerHTML = '';

  data.forEach((entry) => {
    const isYay     = entry.label === 'Yay';
    const wineName  = entry.wineName || 'Unknown Wine';
    const emoji     = colorEmoji(entry.color);
    const colorChip   = entry.color    ? `<span class="meta-chip">${emoji} ${entry.color}</span>` : '';
    const varietalChip = entry.varietal ? `<span class="meta-chip">${entry.varietal}</span>`       : '';
    const priceHTML    = entry.price    ? `<p class="wine-price">AU$${parseFloat(entry.price).toFixed(2)}</p>` : '';
    const notesHTML    = entry.notes    ? `<p class="wine-notes">"${entry.notes}"</p>`             : '';
    const dateHTML     = entry.date     ? `<p class="wine-date">Added ${entry.date}</p>`           : '';
    const metaHTML     = (colorChip || varietalChip) ? `<div class="wine-meta">${colorChip}${varietalChip}</div>` : '';

    const card = document.createElement('div');
    card.className = `wine-card ${isYay ? 'yay-card' : 'ney-card'}`;
    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${entry.imageData}" alt="Label — ${wineName}" loading="lazy" />
        <span class="rating-badge ${isYay ? 'yay-badge' : 'ney-badge'}">${isYay ? '👍 Yay' : '👎 Ney'}</span>
      </div>
      <div class="wine-body">
        <div class="wine-header">
          <h3 class="wine-name">${wineName}</h3>
          <button class="delete-btn" data-id="${entry.id}" title="Remove" aria-label="Remove ${wineName}">🗑</button>
        </div>
        ${metaHTML}
        ${priceHTML}
        ${notesHTML}
        ${dateHTML}
      </div>
    `;
    listContainer.appendChild(card);
  });
}

// ── Stats ────────────────────────────────────────────────────
function updateStats() {
  const entries = loadEntries();
  const yays    = entries.filter(e => e.label === 'Yay').length;
  const totalEl = document.getElementById('totalCount');
  const yayEl   = document.getElementById('yayCount');
  const neyEl   = document.getElementById('neyCount');
  if (totalEl) totalEl.textContent = entries.length;
  if (yayEl)   yayEl.textContent   = yays;
  if (neyEl)   neyEl.textContent   = entries.length - yays;
}

// ── Apply filters + sort ─────────────────────────────────────
function applyFilters() {
  const ratingSelect  = document.getElementById('filterRating');
  const colourSelect  = document.getElementById('filterColor');
  const varietalInput = document.getElementById('filterVarietal');
  const minPriceInput = document.getElementById('filterMinPrice');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  const sortSelect    = document.getElementById('sortBy');

  const selectedRating = ratingSelect  ? ratingSelect.value                    : '';
  const selectedColour = colourSelect  ? colourSelect.value                    : '';
  const varietalQuery  = varietalInput ? varietalInput.value.trim().toLowerCase() : '';
  const minPrice       = minPriceInput && minPriceInput.value !== '' ? parseFloat(minPriceInput.value) : null;
  const maxPrice       = maxPriceInput && maxPriceInput.value !== '' ? parseFloat(maxPriceInput.value) : null;
  const sortBy         = sortSelect    ? sortSelect.value                       : 'newest';

  let entries = loadEntries().filter((entry) => {
    const matchRating   = !selectedRating || entry.label === selectedRating;
    const matchColour   = !selectedColour || entry.color === selectedColour;
    const matchVarietal = !varietalQuery  || (entry.varietal && entry.varietal.toLowerCase().includes(varietalQuery));
    const pv            = entry.price != null ? parseFloat(entry.price) : null;
    const matchMin      = minPrice === null || (pv !== null && pv >= minPrice);
    const matchMax      = maxPrice === null || (pv !== null && pv <= maxPrice);
    return matchRating && matchColour && matchVarietal && matchMin && matchMax;
  });

  renderWineList(sortEntries(entries, sortBy));
}

// ── Delete entry ─────────────────────────────────────────────
function initDeleteListener() {
  const listContainer = document.getElementById('wineList');
  if (!listContainer) return;

  listContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (!confirm('Remove this wine from your list?')) return;
    saveEntries(loadEntries().filter(entry => entry.id !== id));
    applyFilters();
    updateStats();
  });
}

// ── Filter section toggle ────────────────────────────────────
function initFilterToggle() {
  const btn     = document.getElementById('filterToggle');
  const section = document.getElementById('filterSection');
  if (!btn || !section) return;

  const onDesktop = () => window.matchMedia('(min-width: 600px)').matches;
  section.style.display = onDesktop() ? 'block' : 'none';
  if (onDesktop()) btn.classList.add('open');

  btn.addEventListener('click', () => {
    const isOpen = section.style.display !== 'none';
    section.style.display = isOpen ? 'none' : 'block';
    btn.classList.toggle('open', !isOpen);
  });
}

// ── Bottom nav active state ──────────────────────────────────
function initBottomNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav-item').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();

  const form = document.getElementById('wineForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
    initImagePreview();
  }

  if (document.getElementById('wineList')) {
    updateStats();
    renderWineList();
    initDeleteListener();
    initFilterToggle();

    const filterControls = ['filterRating', 'filterColor', 'filterVarietal', 'filterMinPrice', 'filterMaxPrice', 'sortBy'];
    filterControls.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
      }
    });

    const clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ['filterRating', 'filterColor', 'filterVarietal', 'filterMinPrice', 'filterMaxPrice'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        const sortEl = document.getElementById('sortBy');
        if (sortEl) sortEl.value = 'newest';
        renderWineList(sortEntries(loadEntries(), 'newest'));
        updateStats();
      });
    }
  }
});
