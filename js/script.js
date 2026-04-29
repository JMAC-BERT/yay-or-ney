/*
 * script.js — Yay or Ney wine tracking app
 * Data synced across devices via Firebase Firestore.
 * Access gated by shared password stored in localStorage.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// ── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCCYNdG6F1Fwp-7oUK2Qlo5gvdRb04AsBY',
  authDomain: 'yay-or-ney.firebaseapp.com',
  projectId: 'yay-or-ney',
  storageBucket: 'yay-or-ney.firebasestorage.app',
  messagingSenderId: '486687003301',
  appId: '1:486687003301:web:9ee9bdf63b5504901bb34c'
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Password gate ─────────────────────────────────────────────
const APP_PASSWORD = 'winetime';
const AUTH_KEY     = 'wine_auth';

function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === APP_PASSWORD;
}

function initPasswordGate() {
  if (isAuthenticated()) { initApp(); return; }

  const gate  = document.getElementById('passwordGate');
  const form  = document.getElementById('passwordForm');
  const input = document.getElementById('passwordInput');
  const error = document.getElementById('passwordError');
  if (gate) gate.style.display = 'flex';

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input && input.value === APP_PASSWORD) {
        localStorage.setItem(AUTH_KEY, APP_PASSWORD);
        if (gate) gate.style.display = 'none';
        initApp();
      } else {
        if (error) error.style.display = 'block';
        if (input) input.value = '';
      }
    });
  }
}

// ── In-memory store (kept in sync by onSnapshot) ──────────────
let _entries = [];

function loadEntries() {
  return _entries;
}

// ── Firestore helpers ─────────────────────────────────────────
async function saveEntryToDb(entry) {
  await setDoc(doc(db, 'wines', String(entry.id)), entry);
}

async function deleteEntryFromDb(id) {
  await deleteDoc(doc(db, 'wines', String(id)));
}

function startSync() {
  onSnapshot(collection(db, 'wines'), (snapshot) => {
    _entries = snapshot.docs.map(d => d.data());
    _entries.sort((a, b) => b.id - a.id);
    if (document.getElementById('wineList')) {
      updateStats();
      applyFilters();
    }
  });
}

// ── Image compression ─────────────────────────────────────────
function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 800;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = dataUrl;
  });
}

// ── Helpers ───────────────────────────────────────────────────
function colorEmoji(color) {
  return { Red: '🔴', White: '⚪', Rosé: '🌸', Sparkling: '✨', Other: '🍷' }[color] || '';
}

// ── Image preview ─────────────────────────────────────────────
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

// ── Form submit ───────────────────────────────────────────────
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

  const submitBtn = document.querySelector('.submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

  const reader = new FileReader();
  reader.onload = async () => {
    const imageData = await compressImage(reader.result);
    const entry = { id: Date.now(), imageData, wineName, label, color, varietal, price, notes, date };
    try {
      await saveEntryToDb(entry);
      window.location.href = 'list.html';
    } catch (err) {
      alert('Error saving wine. Please try again.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Wine 🍾'; }
    }
  };
  reader.onerror = () => {
    alert('Error reading the photo. Please try again.');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Wine 🍾'; }
  };
  reader.readAsDataURL(file);
}

// ── Sort ──────────────────────────────────────────────────────
function sortEntries(entries, sortBy) {
  const s = [...entries];
  switch (sortBy) {
    case 'oldest':     s.sort((a, b) => a.id - b.id); break;
    case 'price-asc':  s.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)); break;
    case 'price-desc': s.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0)); break;
    case 'yay-first':  s.sort((a) => (a.label === 'Yay' ? -1 : 1)); break;
    case 'ney-first':  s.sort((a) => (a.label === 'Ney' ? -1 : 1)); break;
    default:           s.sort((a, b) => b.id - a.id);
  }
  return s;
}

// ── Render wine list ──────────────────────────────────────────
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
          <div class="card-actions">
            <button class="edit-btn"   data-id="${entry.id}" title="Edit"   aria-label="Edit ${wineName}">✏️</button>
            <button class="delete-btn" data-id="${entry.id}" title="Remove" aria-label="Remove ${wineName}">🗑</button>
          </div>
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

// ── Stats ─────────────────────────────────────────────────────
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

// ── Apply filters + sort ──────────────────────────────────────
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

// ── Card actions (edit + delete) ──────────────────────────────
function initCardActions() {
  const listContainer = document.getElementById('wineList');
  if (!listContainer) return;

  listContainer.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      openEditModal(parseInt(editBtn.dataset.id, 10));
      return;
    }
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.id, 10);
      if (!confirm('Remove this wine from your list?')) return;
      await deleteEntryFromDb(id);
    }
  });
}

// ── Edit modal ────────────────────────────────────────────────
function openEditModal(id) {
  const entry = loadEntries().find(e => e.id === id);
  if (!entry) return;

  document.getElementById('editId').value        = entry.id;
  document.getElementById('editWineName').value  = entry.wineName || '';
  document.getElementById('editColor').value     = entry.color    || '';
  document.getElementById('editVarietal').value  = entry.varietal || '';
  document.getElementById('editPrice').value     = entry.price    || '';
  document.getElementById('editNotes').value     = entry.notes    || '';

  document.getElementById('editRatingYay').checked = entry.label === 'Yay';
  document.getElementById('editRatingNey').checked = entry.label === 'Ney';

  const zone = document.getElementById('editFileDropZone');
  const img  = document.getElementById('editPreviewImg');
  if (entry.imageData && zone && img) {
    img.src = entry.imageData;
    zone.classList.add('has-image');
  }

  const modal = document.getElementById('editModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';

  const zone       = document.getElementById('editFileDropZone');
  const editImage  = document.getElementById('editImage');
  if (zone)      zone.classList.remove('has-image');
  if (editImage) editImage.value = '';
}

async function handleEditSubmit(event) {
  event.preventDefault();

  const id        = parseInt(document.getElementById('editId').value, 10);
  const labelEl   = document.querySelector('input[name="editLabel"]:checked');
  const wineName  = document.getElementById('editWineName').value.trim();
  const color     = document.getElementById('editColor').value;
  const varietal  = document.getElementById('editVarietal').value.trim();
  const priceEl   = document.getElementById('editPrice');
  const price     = priceEl && priceEl.value !== '' ? parseFloat(priceEl.value).toFixed(2) : null;
  const notes     = document.getElementById('editNotes').value.trim();
  const label     = labelEl ? labelEl.value : null;

  if (!label) { alert('Please select Yay or Ney.'); return; }

  const existing = loadEntries().find(e => e.id === id);
  if (!existing) return;

  const applyUpdate = async (imageData) => {
    const updated = { ...existing, wineName, label, color, varietal, price, notes, imageData };
    await saveEntryToDb(updated);
    closeEditModal();
  };

  const fileInput = document.getElementById('editImage');
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload  = async (e) => {
      const compressed = await compressImage(e.target.result);
      applyUpdate(compressed);
    };
    reader.onerror = () => alert('Error reading the photo. Please try again.');
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    applyUpdate(existing.imageData);
  }
}

function initEditModal() {
  const modal    = document.getElementById('editModal');
  const closeBtn = document.getElementById('modalClose');
  const editForm = document.getElementById('editForm');
  if (!modal) return;

  if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') closeEditModal();
  });
  if (editForm) editForm.addEventListener('submit', handleEditSubmit);

  const editImageInput = document.getElementById('editImage');
  if (editImageInput) {
    editImageInput.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img  = document.getElementById('editPreviewImg');
        const zone = document.getElementById('editFileDropZone');
        if (img)  img.src = e.target.result;
        if (zone) zone.classList.add('has-image');
      };
      reader.readAsDataURL(file);
    });
  }
}

// ── Filter section toggle ─────────────────────────────────────
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

// ── Bottom nav active state ───────────────────────────────────
function initBottomNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav-item').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });
}

// ── App init (called after authentication) ────────────────────
function initApp() {
  startSync();

  const form = document.getElementById('wineForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
    initImagePreview();
  }

  if (document.getElementById('wineList')) {
    initCardActions();
    initEditModal();
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
      });
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();
  initPasswordGate();
});
