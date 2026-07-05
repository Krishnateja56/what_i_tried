(() => {
  'use strict';

  const DATA = window.WIT_DATA || { places: [], dishes: [], categories: [], cities: [], stats: {} };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const params = new URLSearchParams(location.search);
  const FALLBACK_IMAGE = 'assets/images/fallback-food.svg';

  const store = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const attr = esc;
  const slugify = value => String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const recLabel = value => ({
    skip: 'Skip', average: 'Average', good: 'Good', favourite: 'My Favourite',
    'beyond-perfect': 'Beyond Perfect'
  }[value] || 'Recorded');
  const badge = value => value ? `<span class="badge ${attr(value)}">${esc(recLabel(value))}</span>` : '';
  const rating = place => place.overallNormalized != null && Number.isFinite(Number(place.overallNormalized))
    ? `${Number(place.overallNormalized).toFixed(1)}/5` : 'Not rated';

  function mergedPlaces() {
    const overrides = store.get('wit-admin-places', []) || [];
    const deleted = new Set(store.get('wit-admin-deleted', []) || []);
    const map = new Map((DATA.places || []).map(place => [place.slug, structuredCloneSafe(place)]));
    overrides.forEach(place => {
      if (!place || !place.slug) return;
      const original = map.get(place.slug) || {};
      map.set(place.slug, { ...original, ...structuredCloneSafe(place) });
    });
    deleted.forEach(slug => map.delete(slug));
    return [...map.values()];
  }

  function structuredCloneSafe(value) {
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
  }

  function mergedDishes(places) {
    const map = new Map();
    places.forEach(place => {
      (place.dishes || []).forEach((dish, index) => {
        const dishSlug = dish.slug || slugify(`${dish.name}-${place.name}-${place.city || ''}-${index}`);
        map.set(dishSlug, {
          ...dish,
          slug: dishSlug,
          id: dish.id || dishSlug,
          placeName: place.name,
          placeSlug: place.slug,
          city: place.city,
          category: dish.category || (place.categories || [])[0] || '',
          image: dish.customImage || dish.image || place.customImage || place.image,
          imageType: dish.imageType || place.imageType
        });
      });
    });
    (DATA.dishes || []).forEach(dish => {
      if (!map.has(dish.slug) && places.some(place => place.slug === dish.placeSlug)) map.set(dish.slug, dish);
    });
    return [...map.values()];
  }

  const places = mergedPlaces();
  const dishes = mergedDishes(places);
  const favourites = new Set(store.get('wit-favourites', []) || []);

  function hash(value) {
    const str = String(value || 'food');
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const imageBank = {
    breakfast: [
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1630409351217-bc4fa6422075?auto=format&fit=crop&w=1400&q=82'
    ],
    biryani: [
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1642821373181-696a54913e93?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1400&q=82'
    ],
    cafe: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=82'
    ],
    dessert: [
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1400&q=82'
    ],
    veg: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1615937691194-97dbd3f3dc29?auto=format&fit=crop&w=1400&q=82'
    ],
    shawarma: [
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=1400&q=82'
    ],
    bar: [
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=82'
    ],
    mandi: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=82'
    ],
    general: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=82',
      'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1400&q=82'
    ]
  };

  function themeKey(item) {
    const text = [item.name, item.category, ...(item.categories || []), ...(item.topDishes || []), item.group]
      .join(' ').toLowerCase();
    if (/breakfast|dosa|idli|tiffin|poori|pancake/.test(text)) return 'breakfast';
    if (/biryani|pulao/.test(text)) return 'biryani';
    if (/café|cafe|coffee|chocolate|danish/.test(text)) return 'cafe';
    if (/dessert|ice cream|pastry|cake|gelato|sweet/.test(text)) return 'dessert';
    if (/vegetarian|\bveg\b|paneer|chaap/.test(text)) return 'veg';
    if (/shawarma/.test(text)) return 'shawarma';
    if (/bar|brew|pub|restro|cocktail/.test(text)) return 'bar';
    if (/mandi|alfaham|al faham/.test(text)) return 'mandi';
    return 'general';
  }

  function localSpecialImage(item) {
    if (item.slug === 'amro-cafe' || /amro café|amro cafe/i.test(item.name || '')) return 'assets/images/amro-cafe.svg';
    if (item.slug === 'forge' || /^forge$/i.test(item.name || '')) return 'assets/images/forge.svg';
    return '';
  }

  function smartImage(item = {}) {
    const special = localSpecialImage(item);
    if (item.customImage) return item.customImage;
    if (special) return special;
    if (item.image) return item.image;
    const bank = imageBank[themeKey(item)] || imageBank.general;
    return bank[hash(item.slug || item.name) % bank.length];
  }

  function imageHtml(item, altText, className = '', loading = 'lazy') {
    return `<img${className ? ` class="${attr(className)}"` : ''} src="${attr(smartImage(item))}" data-fallback="${FALLBACK_IMAGE}" alt="${attr(altText)}" loading="${attr(loading)}">`;
  }

  function installImageFallbacks(root = document) {
    $$('img[data-fallback]', root).forEach(image => {
      const fallback = image.dataset.fallback || FALLBACK_IMAGE;
      const apply = () => {
        if (image.dataset.fallbackApplied === '1') return;
        image.dataset.fallbackApplied = '1';
        image.src = fallback;
      };
      image.addEventListener('error', apply, { once: true });
      if (image.complete && image.naturalWidth === 0) apply();
    });
  }

  function youtubeUrl(place, dishName = '') {
    const query = [place.name, dishName, place.city, 'review'].filter(Boolean).join(' ');
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }
  function mapsUrl(place) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.name, place.city].filter(Boolean).join(' '))}`;
  }
  function placeHref(place) { return `place.html?slug=${encodeURIComponent(place.slug)}`; }
  function dishHref(dish) { return `dish.html?slug=${encodeURIComponent(dish.slug)}`; }

  function toggleFav(slug) {
    const key = `place:${slug}`;
    favourites.has(key) ? favourites.delete(key) : favourites.add(key);
    store.set('wit-favourites', [...favourites]);
  }

  function placeCard(place) {
    const active = favourites.has(`place:${place.slug}`);
    const href = placeHref(place);
    return `<article class="card" data-place="${attr(place.slug)}">
      <a class="card-media-link" href="${href}" aria-label="Open ${attr(place.name)}">
        ${imageHtml(place, `Editorial food visual associated with ${place.name}`)}
        <span class="card-overlay"></span><span class="card-badge">${badge(place.recommendation)}</span>
        <span class="editorial-label">Editorial visual</span>
      </a>
      <div class="card-body">
        <div class="card-title"><div><a href="${href}"><h3>${esc(place.name)}</h3></a>
          <div class="meta">${esc(place.city || 'City not added')} · ${esc((place.categories || []).join(' · '))}</div></div>
          <small>★ ${rating(place)}</small></div>
        <p class="muted">${esc(place.summary || (place.notes || []).join(' · ') || 'Dish details available inside.')}</p>
        <div class="dish-chips">${(place.topDishes || []).slice(0, 3).map(dish => `<span>${esc(dish)}</span>`).join('')}</div>
        <div class="card-actions"><a class="btn btn-primary" href="${href}">Explore dishes</a>
          <a class="btn btn-youtube" href="${youtubeUrl(place)}" target="_blank" rel="noopener">YouTube reviews</a>
          <button class="btn fav ${active ? 'active' : ''}" data-fav="${attr(place.slug)}" aria-label="${active ? 'Remove from' : 'Add to'} favourites">${active ? 'Saved' : 'Save'}</button></div>
      </div></article>`;
  }

  function bindFavs(root = document) {
    $$('[data-fav]', root).forEach(button => button.addEventListener('click', () => {
      toggleFav(button.dataset.fav);
      button.classList.toggle('active');
      button.textContent = button.classList.contains('active') ? 'Saved' : 'Save';
    }));
  }

  function header() {
    const page = document.body.dataset.page || '';
    $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page));
    const saved = store.get('wit-theme', 'dark');
    document.documentElement.dataset.theme = saved;
    $('#theme-toggle')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('wit-theme', next);
    });
    $('#menu-toggle')?.addEventListener('click', () => $('#mobile-menu')?.classList.toggle('open'));
  }

  function dynamicStats() {
    const allDishes = mergedDishes(places);
    return {
      places: places.length,
      dishes: allDishes.length,
      categories: new Set(places.flatMap(place => place.categories || [])).size,
      ratedPlaces: places.filter(place => place.overallNormalized != null).length,
      beyondPerfect: places.filter(place => place.recommendation === 'beyond-perfect').length
    };
  }

  function renderHome() {
    const stats = dynamicStats();
    if ($('#stats')) $('#stats').innerHTML = [
      ['Places', stats.places], ['Dishes', stats.dishes], ['Categories', stats.categories],
      ['Rated places', stats.ratedPlaces], ['Beyond perfect', stats.beyondPerfect]
    ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
    const picks = [...places].sort((a, b) => (b.overallNormalized || 0) - (a.overallNormalized || 0)).slice(0, 3);
    if ($('#featured-grid')) {
      $('#featured-grid').innerHTML = picks.map(placeCard).join('');
      bindFavs($('#featured-grid'));
      installImageFallbacks($('#featured-grid'));
    }
    renderRandom();
  }

  function renderRandom() {
    const holder = $('#random-grid');
    if (!holder) return;
    const shuffled = [...places].sort(() => Math.random() - 0.5).slice(0, 5);
    holder.innerHTML = shuffled.map(place => `<a class="random-tile" href="${placeHref(place)}">
      ${imageHtml({ ...place, slug: `${place.slug}-random` }, `Editorial food visual for ${place.name}`)}
      <span class="random-copy"><h3>${esc(place.name)}</h3><span>${esc(place.city || '')} · ${esc((place.topDishes || [])[0] || (place.categories || [])[0] || 'Explore')}</span></span></a>`).join('');
    installImageFallbacks(holder);
  }

  function currentCategories() {
    const map = new Map((DATA.categories || []).map(category => [category.name, { ...category }]));
    places.forEach(place => (place.categories || []).forEach(name => {
      if (!map.has(name)) map.set(name, { name, slug: slugify(name), description: `Explore ${name} places and dishes.`, image: smartImage(place) });
    }));
    map.forEach(category => {
      const categoryPlaces = places.filter(place => (place.categories || []).includes(category.name));
      category.placeCount = categoryPlaces.length;
      category.dishCount = categoryPlaces.reduce((total, place) => total + (place.dishes || []).length, 0);
    });
    return [...map.values()];
  }

  function currentCities() {
    const map = new Map((DATA.cities || []).map(city => [city.name, { ...city }]));
    places.forEach(place => {
      if (place.city && !map.has(place.city)) map.set(place.city, { name: place.city, slug: slugify(place.city), image: smartImage(place) });
    });
    map.forEach(city => {
      const cityPlaces = places.filter(place => place.city === city.name);
      city.placeCount = cityPlaces.length;
      city.dishCount = cityPlaces.reduce((total, place) => total + (place.dishes || []).length, 0);
      city.inProgress = cityPlaces.length === 0;
    });
    return [...map.values()];
  }

  function renderExplore(customList = null) {
    const grid = $('#place-grid');
    const search = $('#search-input');
    const category = $('#category-filter');
    const city = $('#city-filter');
    if (!grid) return;
    const categoryFrom = params.get('category') || '';
    const cityFrom = params.get('city') || '';
    const queryFrom = params.get('q') || '';
    currentCategories().filter(item => !item.inProgress && item.placeCount > 0).forEach(item => category?.insertAdjacentHTML('beforeend', `<option value="${attr(item.name)}">${esc(item.name)}</option>`));
    currentCities().filter(item => item.placeCount > 0).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => city?.insertAdjacentHTML('beforeend', `<option value="${attr(item.name)}">${esc(item.name)}</option>`));
    if (category) category.value = categoryFrom;
    if (city) city.value = cityFrom;
    if (search) search.value = queryFrom;
    let limit = 18;
    function draw() {
      const query = (search?.value || '').trim().toLowerCase();
      const selectedCategory = category?.value || '';
      const selectedCity = city?.value || '';
      let list = customList || places;
      list = list.filter(place => {
        const text = [place.name, place.city, (place.categories || []).join(' '), place.summary,
          (place.notes || []).join(' '), (place.topDishes || []).join(' '),
          (place.dishes || []).map(dish => dish.name).join(' ')].join(' ').toLowerCase();
        return (!query || text.includes(query)) && (!selectedCategory || (place.categories || []).includes(selectedCategory)) && (!selectedCity || place.city === selectedCity);
      });
      grid.innerHTML = list.length ? list.slice(0, limit).map(placeCard).join('') : `<div class="empty" style="grid-column:1/-1"><h3>Nothing matched that craving.</h3><p>Try another dish, place, category or city.</p></div>`;
      bindFavs(grid);
      installImageFallbacks(grid);
      const more = $('#load-more');
      if (more) more.hidden = limit >= list.length;
    }
    search?.addEventListener('input', () => { limit = 18; draw(); });
    category?.addEventListener('change', () => { limit = 18; draw(); });
    city?.addEventListener('change', () => { limit = 18; draw(); });
    $('#load-more')?.addEventListener('click', () => { limit += 18; draw(); });
    draw();
  }

  function renderCategories() {
    const grid = $('#category-grid');
    if (!grid) return;
    grid.innerHTML = currentCategories().map(category => `<a class="category-card" href="explore.html?category=${encodeURIComponent(category.name)}">
      ${imageHtml(category, `Editorial visual for ${category.name}`)}
      <span class="tile-copy"><span class="eyebrow">${category.inProgress || !category.placeCount ? 'Guide in progress' : `${category.placeCount} places · ${category.dishCount} dishes`}</span>
      <h3>${esc(category.name)}</h3><p>${esc(category.description || `Explore ${category.name}.`)}</p></span></a>`).join('');
    installImageFallbacks(grid);
  }

  function renderCities() {
    const grid = $('#city-grid');
    if (!grid) return;
    grid.innerHTML = currentCities().map(city => `<a class="city-card" href="explore.html?city=${encodeURIComponent(city.name)}">
      ${imageHtml(city, `Editorial food visual for ${city.name}`)}
      <span class="tile-copy"><span class="eyebrow">${city.inProgress ? 'Guide in progress' : 'City guide'}</span><h2>${esc(city.name)}</h2>
      <p>${city.inProgress ? 'Discoveries are being prepared.' : `${city.placeCount} places · ${city.dishCount} dishes`}</p></span></a>`).join('');
    installImageFallbacks(grid);
  }

  function renderPlace() {
    const slug = params.get('slug');
    const place = places.find(item => item.slug === slug);
    if (!place) {
      if ($('#place-main')) $('#place-main').innerHTML = '<section class="section"><div class="container empty"><h2>Place not found.</h2><a class="btn btn-primary" href="explore.html">Return to Explore</a></div></section>';
      return;
    }
    document.title = `${place.name} | What I Tried`;
    const hero = $('#place-hero');
    if (hero) {
      hero.style.backgroundImage = `linear-gradient(0deg,rgba(8,8,8,.18),rgba(8,8,8,.18)),url("${smartImage(place).replace(/"/g, '%22')}"),url("${FALLBACK_IMAGE}")`;
      hero.dataset.fallbackBackground = FALLBACK_IMAGE;
    }
    if ($('#place-hero-copy')) $('#place-hero-copy').innerHTML = `<span class="eyebrow">${esc((place.categories || []).join(' · '))}</span><h1>${esc(place.name)}</h1>
      <p class="lead">${esc(place.summary || (place.notes || []).join(' · ') || 'Explore the dishes recorded for this place.')}</p>
      <div class="cluster">${badge(place.recommendation)}<span class="badge">★ ${rating(place)}</span></div>`;
    const metrics = Object.entries(place.ratings || {});
    if ($('#metrics')) $('#metrics').innerHTML = metrics.length ? metrics.map(([key, value]) => `<div class="metric"><div class="metric-head"><strong>${esc(key.replace(/([A-Z])/g, ' $1'))}</strong><span>${esc(value.value)}/${esc(value.scale)}</span></div><div class="bar"><span style="width:${Math.max(0, Math.min(100, value.normalized5 / 5 * 100))}%"></span></div></div>`).join('') : '<div class="notice">No score categories were recorded.</div>';
    if ($('#experience')) $('#experience').textContent = (place.notes || []).length ? place.notes.join(' · ') : (place.review || place.summary || 'No written review note was included.');
    if ($('#dish-grid')) {
      $('#dish-grid').innerHTML = (place.dishes || []).map(dish => `<a class="dish-card" href="${dishHref(dish)}">
        ${imageHtml({ ...dish, category: (place.categories || [])[0], image: dish.image || place.customImage || place.image }, `Editorial food visual for ${dish.name}`)}
        <span class="dish-card-copy"><span>${badge(dish.recommendation)}</span><h3>${esc(dish.name)}</h3><span class="meta">${esc(dish.group || 'Recorded dish')}</span></span></a>`).join('') || '<div class="notice">No dish entries were recorded.</div>';
      installImageFallbacks($('#dish-grid'));
    }
    const active = favourites.has(`place:${place.slug}`);
    if ($('#place-side')) {
      $('#place-side').innerHTML = `<button class="btn ${active ? 'btn-primary' : ''}" id="place-fav">${active ? 'Saved' : 'Save this place'}</button>
        <a class="btn btn-youtube" href="${youtubeUrl(place)}" target="_blank" rel="noopener">Search reviews on YouTube</a>
        <a class="btn btn-primary" href="${mapsUrl(place)}" target="_blank" rel="noopener">Search on Google Maps</a>
        ${place.city ? `<div><span class="eyebrow">Location</span><p>${esc(place.location || place.city)}</p></div>` : ''}
        <div><span class="eyebrow">Categories</span><p>${esc((place.categories || []).join(', '))}</p></div>`;
      $('#place-fav').onclick = () => { toggleFav(place.slug); location.reload(); };
    }
  }

  function renderDish() {
    const slug = params.get('slug');
    const dish = dishes.find(item => item.slug === slug);
    if (!dish) {
      if ($('#dish-main')) $('#dish-main').innerHTML = '<section class="section"><div class="container empty"><h2>Dish not found.</h2><a class="btn btn-primary" href="explore.html">Return to Explore</a></div></section>';
      return;
    }
    const place = places.find(item => item.slug === dish.placeSlug);
    document.title = `${dish.name} | What I Tried`;
    if ($('#dish-hero')) $('#dish-hero').style.backgroundImage = `linear-gradient(0deg,rgba(8,8,8,.18),rgba(8,8,8,.18)),url("${smartImage({ ...dish, image: dish.image || place?.customImage || place?.image }).replace(/"/g, '%22')}"),url("${FALLBACK_IMAGE}")`;
    if ($('#dish-hero-copy')) $('#dish-hero-copy').innerHTML = `<span class="eyebrow">${esc(dish.category || dish.group || '')}</span><h1>${esc(dish.name)}</h1>
      <p class="lead">Recorded at <a style="text-decoration:underline" href="${place ? placeHref(place) : '#'}">${esc(dish.placeName || place?.name || '')}</a>${dish.city ? ` in ${esc(dish.city)}` : ''}.</p>
      <div class="cluster">${badge(dish.recommendation)}${dish.spicy ? '<span class="badge good">Spicy</span>' : ''}</div>`;
    if ($('#dish-info')) $('#dish-info').innerHTML = `<div class="story-panel"><span class="eyebrow">Dish record</span><h2 style="margin:14px 0">${esc(dish.originalText || dish.name)}</h2><p class="muted">Group: ${esc(dish.group || 'Not specified')}</p></div>
      <div class="story-panel"><span class="eyebrow">Continue exploring</span><h3 style="margin:14px 0">${esc(dish.placeName || place?.name || '')}</h3><div class="cluster">
      <a class="btn btn-primary" href="${place ? placeHref(place) : 'explore.html'}">Open restaurant</a>
      <a class="btn btn-youtube" target="_blank" rel="noopener" href="${youtubeUrl(place || { name: dish.placeName, city: dish.city }, dish.name)}">YouTube reviews</a></div></div>`;
  }

  function renderTop() {
    renderExplore([...places].filter(place => place.overallNormalized != null).sort((a, b) => b.overallNormalized - a.overallNormalized));
  }
  function renderMust() {
    renderExplore([...places].filter(place => ['favourite', 'beyond-perfect', 'good'].includes(place.recommendation)).sort((a, b) => (b.overallNormalized || 0) - (a.overallNormalized || 0)));
  }
  function renderFavourites() { renderExplore(places.filter(place => favourites.has(`place:${place.slug}`))); }
  function renderContact() {
    const form = $('#contact-form');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form));
      const submissions = store.get('wit-contact-submissions', []) || [];
      submissions.unshift({ ...payload, id: Date.now(), createdAt: new Date().toISOString() });
      store.set('wit-contact-submissions', submissions);
      $('#form-status').textContent = 'Thank you. Your recommendation has been saved and can be viewed in Owner Admin → Submissions on this browser.';
      form.reset();
    });
  }
  function renderSearch() { renderExplore(); }

  header();
  installImageFallbacks();
  const page = document.body.dataset.page;
  ({
    home: renderHome, explore: renderExplore, categories: renderCategories, cities: renderCities,
    place: renderPlace, dish: renderDish, 'top-rated': renderTop, 'must-try': renderMust,
    favourites: renderFavourites, contact: renderContact, search: renderSearch
  }[page] || (() => {}))();
  $('#shuffle')?.addEventListener('click', renderRandom);

  window.addEventListener('storage', event => {
    if (['wit-admin-places', 'wit-admin-deleted'].includes(event.key)) location.reload();
  });
})();
