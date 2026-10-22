/**
 * KAWA STORE — Main Application Engine
 * Dynamic Data-Driven Rendering, Category Filters, Instant Search, & Variant Switcher
 */

let productsData = [];
let appConfig = null;
let currentFilter = 'all';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAppData();
  setupEventListeners();
  renderProducts();
  setupScrollEffects();
});

async function loadAppData() {
  try {
    // Muat konfigurasi toko
    const configRes = await fetch('/data/config.json');
    appConfig = await configRes.json();
    initCheckout(appConfig);
    applyConfig(appConfig);
  } catch (err) {
    console.error('Gagal memuat config:', err);
  }

  try {
    // Muat data produk
    const prodRes = await fetch('/data/products.json');
    productsData = await prodRes.json();
  } catch (err) {
    console.error('Gagal memuat products:', err);
  }
}

function applyConfig(config) {
  // Set foto logo di profil header
  const avatarImg = document.getElementById('header-logo-img');
  if (avatarImg && config.logo) {
    avatarImg.src = config.logo;
  }

  const footerAvatar = document.getElementById('footer-logo-img');
  if (footerAvatar && config.logo) {
    footerAvatar.src = config.logo;
  }

  const footerSlogan = document.querySelector('.footer-slogan');
  if (footerSlogan && config.slogan) {
    footerSlogan.textContent = config.slogan;
  }

  // Set hero WA link
  const heroWaBtn = document.getElementById('btn-hero-wa');
  if (heroWaBtn && config.contact && config.contact.whatsapp) {
    const phone = String(config.contact.whatsapp).replace(/\D/g, '');
    const welcomeMsg = `Halo KAWA STORE, saya ingin tanya-tanya mengenai layanan server/bot.`;
    heroWaBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(welcomeMsg)}`;
  }

  // Populate payment method dropdown di modal checkout (wajib pilih QRIS / DANA)
  const methodSelect = document.getElementById('payment-method');
  if (methodSelect && config.paymentMethods) {
    methodSelect.innerHTML = '';
    
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Pilih Pembayaran (QRIS / DANA) --';
    placeholder.disabled = true;
    placeholder.selected = true;
    methodSelect.appendChild(placeholder);

    config.paymentMethods.forEach(method => {
      const opt = document.createElement('option');
      opt.value = method;
      opt.textContent = method;
      methodSelect.appendChild(opt);
    });
  }
}

function setupEventListeners() {
  // Category tabs
  const catChips = document.querySelectorAll('.cat-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-category');
      renderProducts();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // SPA View Routing Setup
  initRouter();

  // Client-Side Anti-Inspect Shield
  setupAntiInspectShield();
}

/**
 * SPA ROUTER BERBASIS HASH
 * Mendukung URL langsung: #store, #sc-free, #komunitas
 * Sinkron dengan Desktop Top Nav & Mobile Bottom Nav
 */
const VALID_VIEWS = ['store', 'sc-free', 'komunitas'];

function initRouter() {
  // 1. Tangani klik desktop navigation
  const desktopLinks = document.querySelectorAll('.desktop-nav-link');
  desktopLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      switchView(targetView, true);
    });
  });

  // 2. Tangani klik mobile bottom navigation
  const mobileNavItems = document.querySelectorAll('.nav-item');
  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-target');
      switchView(targetView, true);
    });
  });

  // 3. Listener perubahan URL hash (tombol Back / Forward di browser)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (VALID_VIEWS.includes(hash)) {
      switchView(hash, false);
    }
  });

  // 4. Inisialisasi rute saat halaman pertama kali dibuka
  const initialHash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (VALID_VIEWS.includes(initialHash)) {
    switchView(initialHash, false);
  } else {
    switchView('store', false);
  }
}

function switchView(viewId, updateHash = true) {
  const targetId = VALID_VIEWS.includes(viewId) ? viewId : 'store';

  // Sembunyikan semua view, tampilkan view aktif
  const views = document.querySelectorAll('.app-view');
  views.forEach(v => {
    const isTarget = v.getAttribute('data-view') === targetId || v.id === `view-${targetId}`;
    if (isTarget) {
      v.classList.add('active');
    } else {
      v.classList.remove('active');
    }
  });

  // Sinkronkan Desktop Nav
  const desktopLinks = document.querySelectorAll('.desktop-nav-link');
  desktopLinks.forEach(link => {
    if (link.getAttribute('data-view') === targetId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Sinkronkan Mobile Bottom Nav
  const mobileNavItems = document.querySelectorAll('.nav-item');
  mobileNavItems.forEach(item => {
    if (item.getAttribute('data-target') === targetId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update hash pada URL tanpa reload
  if (updateHash) {
    if (window.location.hash !== `#${targetId}`) {
      window.location.hash = targetId;
    }
  }

  // Auto scroll ke paling atas dengan mulus
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function focusSearchInput() {
  // Pindah ke tab store jika belum di store
  switchView('store', true);
  setTimeout(() => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

/**
 * CLIENT-SIDE ANTI-INSPECT SHIELD
 * Mencegah inspect element, view-source shortcut, dan download kode sembarangan
 */
function setupAntiInspectShield() {
  // 1. Blokir Klik Kanan (Context Menu)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // 2. Blokir Shortcut Keyboard Terkait Inspect & View Source
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl + Shift + I (Inspect)
    // Ctrl + Shift + J (Console)
    // Ctrl + Shift + C (Element Inspect)
    if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
    // Ctrl + U (View Source)
    // Ctrl + S (Save Page)
    if (e.ctrlKey && ['U', 'u', 'S', 's'].includes(e.key)) {
      e.preventDefault();
      return false;
    }
  });

  // Pesan keamanan di console untuk orang yang memaksa buka devtools
  try {
    console.clear();
    console.log(
      '%c[KAWA STORE SHIELD] Akses kode sumber dilindungi. Seluruh transaksi resmi tercatat di sistem kami.',
      'color: #FF4655; font-size: 14px; font-weight: bold;'
    );
  } catch (err) {}
}

function renderProducts() {
  const container = document.getElementById('product-grid-container');
  if (!container) return;

  container.innerHTML = '';

  const filtered = productsData.filter(p => {
    const matchCategory = currentFilter === 'all' || p.category === currentFilter;
    const matchSearch = !currentSearch || 
      p.name.toLowerCase().includes(currentSearch) || 
      (p.subtitle && p.subtitle.toLowerCase().includes(currentSearch)) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(currentSearch));
    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'glass-panel';
    emptyBox.style.padding = '30px';
    emptyBox.style.textAlign = 'center';
    emptyBox.style.borderRadius = '16px';
    emptyBox.innerHTML = `
      <p style="font-size: 1rem; font-weight: 700; color: #94A3B8; margin-bottom: 6px;">Produk tidak ditemukan</p>
      <p style="font-size: 0.8rem; color: #64748B;">Coba gunakan kata kunci pencarian yang lain.</p>
    `;
    container.appendChild(emptyBox);
    return;
  }

  filtered.forEach((product, idx) => {
    const card = createProductCard(product, idx);
    container.appendChild(card);
  });
}

function createProductCard(product, index = 0) {
  const card = document.createElement('div');
  card.className = `product-card card-type-${product.categoryType || 'do'}`;
  card.style.animationDelay = `${index * 60}ms`;

  // Default selected variant
  let currentVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;

  // 1. Top Row: Badges
  const topRow = document.createElement('div');
  topRow.className = 'card-top-row';

  const catBadge = document.createElement('span');
  catBadge.className = `badge-category badge-${product.categoryType || 'do'}`;
  catBadge.textContent = product.categoryLabel || 'KAWA STORE';
  topRow.appendChild(catBadge);

  const statusBadge = document.createElement('span');
  const isReady = product.status === 'ready';
  statusBadge.className = `badge-status ${isReady ? 'ready' : 'habis'}`;
  statusBadge.innerHTML = `<span class="badge-dot"></span> ${isReady ? 'Ready' : 'Habis'}`;
  topRow.appendChild(statusBadge);

  card.appendChild(topRow);

  // 2. Title & Subtitle
  const title = document.createElement('h3');
  title.className = 'card-product-title';
  title.textContent = (product.name || '').replace('(Versi Terbaru)', '(Versi\u00A0Terbaru)');
  card.appendChild(title);

  const sub = document.createElement('p');
  sub.className = 'card-product-subtitle';
  sub.textContent = product.subtitle || '';
  card.appendChild(sub);

  // 3. Price Display
  const priceRow = document.createElement('div');
  priceRow.className = 'card-price-row';

  const priceVal = document.createElement('span');
  priceVal.className = 'card-price-value';
  priceVal.textContent = currentVariant ? currentVariant.priceFormatted : (product.priceFormatted || 'Rp 0');

  const pricePeriod = document.createElement('span');
  pricePeriod.className = 'card-price-period';
  pricePeriod.textContent = (currentVariant && currentVariant.period) ? `/ ${currentVariant.period}` : '';

  priceRow.appendChild(priceVal);
  priceRow.appendChild(pricePeriod);
  card.appendChild(priceRow);

  // 4. Variant Selector Chips
  if (product.variants && product.variants.length > 1) {
    const variantBox = document.createElement('div');
    variantBox.className = 'variant-selector-box';

    const vLabel = document.createElement('span');
    vLabel.className = 'variant-label';
    vLabel.textContent = 'Pilih Varian:';
    variantBox.appendChild(vLabel);

    const isRoleGrid = product.categoryType === 'script' || (product.variants.length <= 4 && product.variants.some(v => v.name.length > 8));
    const chipsGrid = document.createElement('div');
    chipsGrid.className = `variant-chips-grid ${isRoleGrid ? 'grid-2-cols' : ''}`;

    product.variants.forEach(variant => {
      const chipBtn = document.createElement('button');
      chipBtn.type = 'button';
      chipBtn.className = `variant-chip-btn ${variant.id === currentVariant.id ? 'active' : ''} ${variant.badge ? 'has-badge' : ''}`;

      let labelHtml = '';
      const match = variant.name.match(/^(.+?)\s*\((.+?)\)$/);
      if (match && isRoleGrid) {
        labelHtml = `<span>${escapeHtml(match[1])}</span> <span class="chip-price-tag">(${escapeHtml(match[2])})</span>`;
      } else {
        labelHtml = `<span>${escapeHtml(variant.name)}</span>`;
      }

      if (variant.badge) {
        labelHtml += `<span class="chip-floating-badge">${escapeHtml(variant.badge)}</span>`;
      }

      chipBtn.innerHTML = labelHtml;

      chipBtn.addEventListener('click', () => {
        // Update active variant
        currentVariant = variant;
        chipsGrid.querySelectorAll('.variant-chip-btn').forEach(btn => btn.classList.remove('active'));
        chipBtn.classList.add('active');

        // Update harga di kartu secara instan
        priceVal.textContent = variant.priceFormatted;
        pricePeriod.textContent = variant.period ? `/ ${variant.period}` : '';

        // Update feature box (specs atau benefits) secara instan
        renderFeatureBox(featureBox, variant);
      });

      chipsGrid.appendChild(chipBtn);
    });

    variantBox.appendChild(chipsGrid);
    card.appendChild(variantBox);
  }

  // 5. Specs / Benefits Box
  const featureBox = document.createElement('div');
  renderFeatureBox(featureBox, currentVariant);
  card.appendChild(featureBox);

  // 6. Action Button: Pesan via WhatsApp
  const orderBtn = document.createElement('button');
  orderBtn.type = 'button';
  orderBtn.className = 'btn-card-order';
  orderBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.073.377-.044c.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/>
    </svg>
    Pesan via WhatsApp
  `;
  orderBtn.addEventListener('click', () => {
    openModalCheckout(product, currentVariant ? currentVariant.id : null);
  });
  card.appendChild(orderBtn);

  // Tambahkan tombol preview HANYA jika produk memiliki preview_url (atau berdasarkan ID tertentu)
if (product.preview_url) {
    const previewBtn = document.createElement('a');
    previewBtn.href = product.preview_url;
    previewBtn.className = 'preview-btn';
    previewBtn.target = '_blank';
    previewBtn.innerText = 'Preview Website';
    card.appendChild(previewBtn);
}

  return card;
}

function renderFeatureBox(boxElement, variant) {
  boxElement.innerHTML = '';
  if (!variant) return;

  // JIKA VARIAN MEMILIKI BENEFIT (Reseller, Admin, PT Panel, dan Script Bot)
  if (variant.benefits && Array.isArray(variant.benefits) && variant.benefits.length > 0) {
    boxElement.className = 'benefits-grid-2x2';
    variant.benefits.forEach(text => {
      const cell = document.createElement('div');
      cell.className = 'benefit-cell';
      cell.innerHTML = `
        <svg class="benefit-cell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="benefit-cell-text">${escapeHtml(text)}</span>
      `;
      boxElement.appendChild(cell);
    });
    return;
  }

  // JIKA VARIAN HARDWARE (RAM, CPU, DISK, DUKUNGAN)
  if (variant.specs) {
    boxElement.className = 'specs-grid-2x2';
    const specKeys = [
      { key: 'ram', label: 'RAM', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>` },
      { key: 'cpu', label: 'CPU', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>` },
      { key: 'disk', label: 'Disk', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16"/>` },
      { key: 'support', label: 'Dukungan', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>` }
    ];

    specKeys.forEach(item => {
      const val = variant.specs[item.key] || '-';
      const cell = document.createElement('div');
      cell.className = 'spec-cell';
      cell.innerHTML = `
        <svg class="spec-cell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${item.icon}
        </svg>
        <div class="spec-cell-texts">
          <span class="spec-cell-label">${item.label}</span>
          <span class="spec-cell-value">${escapeHtml(val)}</span>
        </div>
      `;
      boxElement.appendChild(cell);
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Red-Tech Scroll Effects & Intersection Observer
 */
function setupScrollEffects() {
  // 1. Header Solidification on Scroll
  const header = document.querySelector('.app-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 24) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. IntersectionObserver for Reveal Elements (Smooth Scroll Reveal)
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-visible'));
  }

  // 3. Cinematic Red Reveal Auto-Cleanup (eliminasi overhead DOM)
  const sweepEl = document.getElementById('cinematic-sweep');
  if (sweepEl) {
    setTimeout(() => {
      sweepEl.remove();
    }, 1400);
  }
}

