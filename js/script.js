/*
 * script.js
 *
 * Provides client-side functionality for the Yay or Ney wine tracking app.
 * All data is stored locally in the browser's localStorage, so there's no
 * backend required. Images are encoded as base64 data URIs when saved.
 */

// Namespace key for storing wine entries in localStorage
const STORAGE_KEY = 'wine_entries';

/**
 * Load existing wine entries from localStorage.
 *
 * @returns {Array<Object>} An array of wine entry objects.
 */
function loadEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse stored wine entries:', e);
    return [];
  }
}

/**
 * Save an array of entries back to localStorage.
 *
 * @param {Array<Object>} entries The array of entries to persist.
 */
function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save wine entries:', e);
  }
}

/**
 * Handle the form submission on the add wine page. Reads the image file,
 * converts it into a data URL, constructs a new entry and stores it.
 * After saving it redirects the user to the list page.
 *
 * @param {SubmitEvent} event The submit event from the form.
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const fileInput = document.getElementById('image');
  const labelInput = document.querySelector('input[name="label"]:checked');
  const colorInput = document.getElementById('color');
  const varietalInput = document.getElementById('varietal');
  const priceInput = document.getElementById('price');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert('Please select an image file.');
    return;
  }
  const file = fileInput.files[0];
  const label = labelInput ? labelInput.value : null;
  const color = colorInput ? colorInput.value : '';
  const varietal = varietalInput ? varietalInput.value.trim() : '';
  const price = priceInput && priceInput.value !== '' ? parseFloat(priceInput.value).toFixed(2) : null;

  if (!label) {
    alert('Please select whether the wine was a Yay or a Ney.');
    return;
  }

  // Read the image file as DataURL
  const reader = new FileReader();
  reader.onload = () => {
    const imageData = reader.result;
    const entries = loadEntries();
    const newEntry = {
      id: Date.now(),
      imageData,
      label,
      color,
      varietal,
      price,
    };
    entries.push(newEntry);
    saveEntries(entries);
    // Redirect to list page after saving
    window.location.href = 'list.html';
  };
  reader.onerror = () => {
    console.error('Error reading file:', reader.error);
    alert('There was an error reading the file. Please try again.');
  };
  reader.readAsDataURL(file);
}

/**
 * Render the list of wines on the list page. Accepts an optional array of
 * entries; if none is provided it will load entries from localStorage.
 * Creates card elements for each entry and inserts them into the DOM.
 * If there are no entries it displays an empty state message instead.
 *
 * @param {Array<Object>} entries Array of wine entries to render (optional)
 */
function renderWineList(entries) {
  const listContainer = document.getElementById('wineList');
  const emptyState = document.getElementById('emptyState');
  if (!listContainer) return;
  // Determine entries: load from storage if not provided
  const data = Array.isArray(entries) ? entries : loadEntries();
  if (!data || data.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    listContainer.innerHTML = '';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  // Clear existing content
  listContainer.innerHTML = '';
  data.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'wine-card ' + (entry.label === 'Yay' ? 'yay-card' : 'ney-card');
    // Image wrapper
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'image-wrapper';
    const img = document.createElement('img');
    img.src = entry.imageData;
    img.alt = 'Wine label';
    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);
    // Details
    const details = document.createElement('div');
    details.className = 'wine-details';
    const heading = document.createElement('h3');
    heading.className = 'wine-rating';
    heading.textContent = entry.label;
    details.appendChild(heading);
    // Colour
    const pColor = document.createElement('p');
    pColor.innerHTML = `<strong>Colour:</strong> ${entry.color || 'N/A'}`;
    details.appendChild(pColor);
    // Varietal
    const pVarietal = document.createElement('p');
    pVarietal.innerHTML = `<strong>Varietal:</strong> ${entry.varietal || 'N/A'}`;
    details.appendChild(pVarietal);
    // Price
    const pPrice = document.createElement('p');
    pPrice.innerHTML = `<strong>Price:</strong> ${entry.price ? entry.price : 'N/A'}`;
    details.appendChild(pPrice);
    card.appendChild(details);
    listContainer.appendChild(card);
  });
}

/**
 * Apply filters based on the values selected in the filter controls. This
 * reads the values of rating, colour, varietal and price range fields,
 * filters the stored entries accordingly and re-renders the list.
 */
function applyFilters() {
  const ratingSelect = document.getElementById('filterRating');
  const colourSelect = document.getElementById('filterColor');
  const varietalInput = document.getElementById('filterVarietal');
  const minPriceInput = document.getElementById('filterMinPrice');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  // Read values
  const selectedRating = ratingSelect ? ratingSelect.value : '';
  const selectedColour = colourSelect ? colourSelect.value : '';
  const varietalQuery = varietalInput ? varietalInput.value.trim().toLowerCase() : '';
  const minPriceStr = minPriceInput && minPriceInput.value !== '' ? minPriceInput.value : null;
  const maxPriceStr = maxPriceInput && maxPriceInput.value !== '' ? maxPriceInput.value : null;
  const minPrice = minPriceStr !== null ? parseFloat(minPriceStr) : null;
  const maxPrice = maxPriceStr !== null ? parseFloat(maxPriceStr) : null;
  const entries = loadEntries();
  // Filter entries
  const filtered = entries.filter((entry) => {
    const matchesRating = !selectedRating || entry.label === selectedRating;
    const matchesColour = !selectedColour || entry.color === selectedColour;
    const matchesVarietal = !varietalQuery || (entry.varietal && entry.varietal.toLowerCase().includes(varietalQuery));
    const priceValue = entry.price !== null && entry.price !== undefined ? parseFloat(entry.price) : null;
    const matchesMinPrice = minPrice === null || (priceValue !== null && priceValue >= minPrice);
    const matchesMaxPrice = maxPrice === null || (priceValue !== null && priceValue <= maxPrice);
    return matchesRating && matchesColour && matchesVarietal && matchesMinPrice && matchesMaxPrice;
  });
  renderWineList(filtered);
}

// Attach event listeners depending on the page
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('wineForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  // If we're on the list page render the wines
  const listElement = document.getElementById('wineList');
  if (listElement) {
    // Render initial list
    renderWineList();
    // Set up filter controls if they exist
    const ratingSelect = document.getElementById('filterRating');
    const colourSelect = document.getElementById('filterColor');
    const varietalInput = document.getElementById('filterVarietal');
    const minPriceInput = document.getElementById('filterMinPrice');
    const maxPriceInput = document.getElementById('filterMaxPrice');
    const clearBtn = document.getElementById('clearFilters');
    const controls = [ratingSelect, colourSelect, varietalInput, minPriceInput, maxPriceInput];
    controls.forEach((el) => {
      if (el) {
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        // Reset filter values
        if (ratingSelect) ratingSelect.value = '';
        if (colourSelect) colourSelect.value = '';
        if (varietalInput) varietalInput.value = '';
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';
        renderWineList();
      });
    }
  }
});
