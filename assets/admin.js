(() => {
  'use strict';

  const DATA = window.WIT_DATA || { places: [], categories: [] };
  const OWNER_PASSCODE = 'Krishnateja@';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const FALLBACK_ADMIN_IMAGE = '../../assets/images/fallback-food.svg';

  const store = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const slugify = value => String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clone = value => {
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
  };

  let overrides = store.get('wit-admin-places', []) || [];
  let deleted = new Set(store.get('wit-admin-deleted', []) || []);
  let query = '';
  let currentSlug = '';

  function allPlaces() {
    const map = new Map((DATA.places || []).map(place => [place.slug, clone(place)]));
    overrides.forEach(place => {
      if (!place?.slug) return;
      map.set(place.slug, { ...(map.get(place.slug) || {}), ...clone(place) });
    });
    deleted.forEach(slug => map.delete(slug));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function categories() {
    return [...new Set([
      ...(DATA.categories || []).map(category => category.name),
      ...allPlaces().flatMap(place => place.categories || [])
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function adminImage(path) {
    if (!path) return FALLBACK_ADMIN_IMAGE;
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (path.startsWith('assets/')) return `../../${path}`;
    if (path.startsWith('../../')) return path;
    return path;
  }

  function imageElement(place) {
    const path = place.customImage || place.image || FALLBACK_ADMIN_IMAGE;
    return `<img class="admin-thumb" src="${esc(adminImage(path))}" data-admin-fallback="${FALLBACK_ADMIN_IMAGE}" alt="">`;
  }

  function installImageFallbacks(root = document) {
    $$('img[data-admin-fallback]', root).forEach(image => image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied === '1') return;
      image.dataset.fallbackApplied = '1';
      image.src = image.dataset.adminFallback || FALLBACK_ADMIN_IMAGE;
    }, { once: true }));
  }

  function isAuthenticated() {
    return sessionStorage.getItem('wit-owner-auth') === '1';
  }

  function showAdmin() {
    $('#login-view').hidden = true;
    const shell = $('#admin-shell');
    shell.hidden = false;
    shell.classList.add('visible');
    populateCategories();
    render();
  }

  function normalizePasscode(value) {
    return String(value || '').normalize('NFKC').trim();
  }

  $('#login-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const value = normalizePasscode($('#passcode').value);
    if (value === OWNER_PASSCODE || value.toLowerCase() === OWNER_PASSCODE.toLowerCase()) {
      sessionStorage.setItem('wit-owner-auth', '1');
      $('#login-error').textContent = '';
      showAdmin();
    } else {
      $('#login-error').textContent = 'Incorrect passcode. Enter Krishnateja@ exactly.';
      $('#passcode').focus();
      $('#passcode').select();
    }
  });

  $('#toggle-password')?.addEventListener('click', () => {
    const input = $('#passcode');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    $('#toggle-password').textContent = showing ? 'Show' : 'Hide';
    $('#toggle-password').setAttribute('aria-label', showing ? 'Show passcode' : 'Hide passcode');
    input.focus();
  });

  if (isAuthenticated()) showAdmin();

  function populateCategories() {
    const select = $('#add-category');
    if (!select) return;
    const selected = select.value;
    select.innerHTML = categories().map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
    if (selected && categories().includes(selected)) select.value = selected;
  }

  function populateEditSelect(preferredSlug = currentSlug) {
    const select = $('#edit-place');
    const list = allPlaces();
    if (!select) return;
    select.innerHTML = list.map(place => `<option value="${esc(place.slug)}">${esc(place.name)}${place.city ? ` — ${esc(place.city)}` : ''}</option>`).join('');
    currentSlug = list.some(place => place.slug === preferredSlug) ? preferredSlug : (list[0]?.slug || '');
    select.value = currentSlug;
    loadEdit(currentSlug);
  }

  function parseDishes(text, place, existing = []) {
    const names = String(text || '').split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    const existingByName = new Map(existing.map(dish => [dish.name.toLowerCase(), dish]));
    return names.map((name, index) => {
      const old = existingByName.get(name.toLowerCase()) || {};
      const slug = old.slug || slugify(`${name}-${place.name}-${place.city || ''}-${index}`);
      return {
        ...old,
        id: old.id || slug,
        slug,
        name,
        originalText: old.originalText || name,
        group: old.group || 'Dishes tried',
        recommendation: old.recommendation || null,
        spicy: Boolean(old.spicy),
        sourceSheet: old.sourceSheet || 'Owner Admin'
      };
    });
  }

  function ratingData(value, existing = {}) {
    if (value === '' || value == null || !Number.isFinite(Number(value))) {
      const copy = { ...existing };
      delete copy.overall;
      return { overallNormalized: null, ratings: copy };
    }
    const number = Math.max(0, Math.min(5, Number(value)));
    return {
      overallNormalized: number,
      ratings: { ...existing, overall: { value: number, scale: 5, normalized5: number } }
    };
  }

  function saveOverride(item) {
    overrides = overrides.filter(place => place.slug !== item.slug);
    overrides.push(item);
    store.set('wit-admin-places', overrides);
    deleted.delete(item.slug);
    store.set('wit-admin-deleted', [...deleted]);
  }

  function uniqueSlug(name) {
    const base = slugify(name) || `restaurant-${Date.now()}`;
    const used = new Set(allPlaces().map(place => place.slug));
    if (!used.has(base)) return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  $('#add-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#add-name').value.trim();
    const city = $('#add-city').value.trim();
    if (!name || !city) return;
    const slug = uniqueSlug(name);
    const review = $('#add-review').value.trim();
    const rating = ratingData($('#add-rating').value);
    const draft = {
      id: `${slug}::${slugify(city)}`,
      slug,
      name,
      originalNames: [name],
      city,
      categories: [$('#add-category').value].filter(Boolean),
      recommendation: $('#add-recommendation').value || null,
      summary: review || 'Newly added through Owner Admin.',
      review,
      notes: review ? [review] : [],
      customImage: $('#add-image').value.trim(),
      image: $('#add-image').value.trim() || 'assets/images/fallback-food.svg',
      imageType: $('#add-image').value.trim() ? 'owner-added' : 'category-placeholder',
      ratings: rating.ratings,
      overallNormalized: rating.overallNormalized,
      sourceSheets: ['Owner Admin'],
      dishes: [],
      topDishes: []
    };
    draft.dishes = parseDishes($('#add-dishes').value, draft, []);
    draft.dishCount = draft.dishes.length;
    draft.topDishes = draft.dishes.slice(0, 3).map(dish => dish.name);
    saveOverride(draft);
    currentSlug = slug;
    $('#add-form').reset();
    $('#add-city').value = 'Hyderabad';
    populateCategories();
    $('#add-status').innerHTML = `Added <strong>${esc(name)}</strong>. <a href="../../place.html?slug=${encodeURIComponent(slug)}" target="_blank">Open it on the site</a>.`;
    render();
  });

  function loadEdit(slug) {
    const place = allPlaces().find(item => item.slug === slug);
    if (!place) return;
    currentSlug = place.slug;
    $('#edit-place').value = place.slug;
    $('#edit-name').value = place.name || '';
    $('#edit-city').value = place.city || '';
    $('#edit-category').value = (place.categories || []).join(', ');
    $('#edit-rating').value = place.overallNormalized ?? '';
    $('#edit-recommendation').value = place.recommendation || '';
    $('#edit-review').value = place.review || (place.notes || []).join(' · ') || place.summary || '';
    $('#edit-image').value = place.customImage || place.image || '';
    $('#edit-dishes').value = (place.dishes || []).map(dish => dish.name).join('\n');
    $('#edit-status').textContent = '';
  }

  $('#edit-place')?.addEventListener('change', event => loadEdit(event.target.value));

  $('#edit-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const existing = allPlaces().find(place => place.slug === currentSlug);
    if (!existing) return;
    const name = $('#edit-name').value.trim();
    const city = $('#edit-city').value.trim();
    const review = $('#edit-review').value.trim();
    const rating = ratingData($('#edit-rating').value, existing.ratings || {});
    const image = $('#edit-image').value.trim();
    const updated = {
      ...existing,
      slug: existing.slug,
      name,
      city,
      categories: $('#edit-category').value.split(',').map(value => value.trim()).filter(Boolean),
      recommendation: $('#edit-recommendation').value || null,
      summary: review || existing.summary || '',
      review,
      notes: review ? [review] : [],
      customImage: image,
      image: image || existing.image || 'assets/images/fallback-food.svg',
      imageType: image ? 'owner-added' : (existing.imageType || 'category-placeholder'),
      ratings: rating.ratings,
      overallNormalized: rating.overallNormalized
    };
    updated.dishes = parseDishes($('#edit-dishes').value, updated, existing.dishes || []);
    updated.dishCount = updated.dishes.length;
    updated.topDishes = updated.dishes.slice(0, 3).map(dish => dish.name);
    saveOverride(updated);
    render({ keepSelection: true });
    $('#edit-status').innerHTML = `Saved <strong>${esc(updated.name)}</strong>. <a href="../../place.html?slug=${encodeURIComponent(updated.slug)}" target="_blank">View the updated page</a>.`;
  });

  $('#delete-place')?.addEventListener('click', () => {
    const place = allPlaces().find(item => item.slug === currentSlug);
    if (!place || !confirm(`Delete ${place.name} from this browser?`)) return;
    deleted.add(place.slug);
    store.set('wit-admin-deleted', [...deleted]);
    overrides = overrides.filter(item => item.slug !== place.slug);
    store.set('wit-admin-places', overrides);
    currentSlug = '';
    render();
  });

  function renderTable() {
    const list = allPlaces().filter(place => [place.name, place.city, (place.categories || []).join(' ')]
      .join(' ').toLowerCase().includes(query.toLowerCase()));
    $('#admin-rows').innerHTML = list.map(place => `<tr>
      <td>${imageElement(place)}</td><td><strong>${esc(place.name)}</strong><div class="muted">${esc(place.slug)}</div></td>
      <td>${esc(place.city || '')}</td><td>${esc((place.categories || []).join(', '))}</td>
      <td>${place.overallNormalized != null ? Number(place.overallNormalized).toFixed(1) : '—'}</td>
      <td>${(place.dishes || []).length}</td><td><button class="btn admin-row-edit" data-edit="${esc(place.slug)}" type="button">Edit</button></td></tr>`).join('');
    $$('[data-edit]').forEach(button => button.addEventListener('click', () => {
      currentSlug = button.dataset.edit;
      $('#edit-place').value = currentSlug;
      loadEdit(currentSlug);
      $('.admin-editor-card:nth-child(2)')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    installImageFallbacks($('#admin-rows'));
  }

  function render(options = {}) {
    const list = allPlaces();
    const submissions = store.get('wit-contact-submissions', []) || [];
    $('#count-places').textContent = list.length;
    $('#count-dishes').textContent = list.reduce((total, place) => total + (place.dishes || []).length, 0);
    $('#count-favs').textContent = list.filter(place => place.recommendation === 'favourite').length;
    $('#count-submissions').textContent = submissions.length;
    $('#submission-badge').textContent = submissions.length;
    populateCategories();
    populateEditSelect(options.keepSelection ? currentSlug : currentSlug);
    renderTable();
  }

  $('#admin-search')?.addEventListener('input', event => {
    query = event.target.value;
    renderTable();
  });

  $('#export-data')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(), places: allPlaces(),
      submissions: store.get('wit-contact-submissions', []) || []
    }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'what-i-tried-owner-export.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  $('#reset-data')?.addEventListener('click', () => {
    if (!confirm('Reset every local restaurant edit, addition and deletion?')) return;
    localStorage.removeItem('wit-admin-places');
    localStorage.removeItem('wit-admin-deleted');
    overrides = [];
    deleted = new Set();
    currentSlug = '';
    render();
  });

  $('#logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('wit-owner-auth');
    location.reload();
  });

  $('#view-submissions')?.addEventListener('click', () => {
    const rows = store.get('wit-contact-submissions', []) || [];
    $('#submissions-body').innerHTML = rows.length ? rows.map(item => `<div class="story-panel">
      <strong>${esc(item.name || 'Anonymous')}</strong><p>${esc(item.restaurant || '')}</p>
      <p class="muted">${esc(item.message || '')}</p><small>${esc(item.createdAt || '')}</small></div>`).join('')
      : '<div class="notice">No submissions saved in this browser.</div>';
    $('#submissions-dialog').showModal();
  });
  $('#close-submissions')?.addEventListener('click', () => $('#submissions-dialog').close());

  window.addEventListener('storage', event => {
    if (['wit-admin-places', 'wit-admin-deleted', 'wit-contact-submissions'].includes(event.key)) {
      overrides = store.get('wit-admin-places', []) || [];
      deleted = new Set(store.get('wit-admin-deleted', []) || []);
      if (isAuthenticated()) render({ keepSelection: true });
    }
  });
})();
