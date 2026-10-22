/**
 * KAWA STORE — Checkout & Order Generator Module
 * Validasi Wajib Nama & Metode Pembayaran (QRIS / DANA)
 * Format pesan anti-glitch (bebas tanda tanya berlian / diamond question mark di WhatsApp)
 */

let activeProduct = null;
let activeVariant = null;
let storeConfig = null;

function initCheckout(config) {
  storeConfig = config;
  
  const buyerInput = document.getElementById('buyer-name');
  const methodSelect = document.getElementById('payment-method');
  const notesInput = document.getElementById('buyer-notes');

  // Input listeners untuk update preview dan menghapus error class
  if (buyerInput) {
    buyerInput.addEventListener('input', () => {
      buyerInput.classList.remove('input-error');
      updateOrderPreview();
    });
  }

  if (methodSelect) {
    methodSelect.addEventListener('change', () => {
      methodSelect.classList.remove('input-error');
      updateOrderPreview();
    });
  }

  if (notesInput) {
    notesInput.addEventListener('input', updateOrderPreview);
  }

  // Accordion toggle untuk preview pesan
  const accordionHeader = document.getElementById('preview-accordion-header');
  if (accordionHeader) {
    accordionHeader.addEventListener('click', () => {
      const accordion = document.getElementById('preview-accordion');
      accordion.classList.toggle('open');
      const toggleLabel = document.getElementById('preview-toggle-label');
      toggleLabel.textContent = accordion.classList.contains('open') ? 'Tutup ▲' : 'Lihat ▼';
    });
  }

  // Intercept WhatsApp Click dengan Validasi Wajib
  const waBtn = document.getElementById('btn-modal-wa');
  if (waBtn) {
    waBtn.addEventListener('click', (e) => {
      if (!validateCheckoutForm()) {
        e.preventDefault();
        return false;
      }
      sendOrderNotification();
    });
  }

  // Telegram button handler dengan Validasi Wajib
  const teleBtn = document.getElementById('btn-modal-tele');
  if (teleBtn) {
    teleBtn.addEventListener('click', (e) => {
      if (handleTelegramCheckout(e)) {
        sendOrderNotification();
      }
    });
  }
}


function generateOrderCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KAWA-${code}`;
}

let currentOrderCode = generateOrderCode();

function openModalCheckout(product, selectedVariantId = null) {
  activeProduct = product;
  currentOrderCode = generateOrderCode();

  // Tentukan varian default
  if (selectedVariantId && product.variants) {
    activeVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  } else if (product.variants && product.variants.length > 0) {
    activeVariant = product.variants[0];
  } else {
    activeVariant = null;
  }

  // Update ringkasan produk di modal
  document.getElementById('modal-summary-title').textContent = product.name;
  document.getElementById('modal-summary-category').textContent = product.categoryLabel || 'Produk KAWA STORE';
  
  // Render variant chips di dalam modal
  renderModalVariantChips();

  // Reset form inputs & errors
  const buyerInput = document.getElementById('buyer-name');
  const methodSelect = document.getElementById('payment-method');
  const notesInput = document.getElementById('buyer-notes');

  if (buyerInput) {
    buyerInput.value = '';
    buyerInput.classList.remove('input-error');
  }

  if (methodSelect) {
    methodSelect.value = ''; // Awal selalu kosong
    methodSelect.classList.remove('input-error');
  }

  if (notesInput) {
    notesInput.value = '';
  }

  // Update harga dan preview
  updateOrderPreview();

  // Tampilkan modal
  const overlay = document.getElementById('modal-checkout-overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModalCheckout() {
  const overlay = document.getElementById('modal-checkout-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  activeProduct = null;
  activeVariant = null;
}

function renderModalVariantChips() {
  const container = document.getElementById('modal-variant-chips');
  container.innerHTML = '';

  if (!activeProduct.variants || activeProduct.variants.length <= 1) {
    document.getElementById('modal-variant-group').style.display = 'none';
    return;
  }

  document.getElementById('modal-variant-group').style.display = 'block';

  const isRoleGrid = activeProduct.categoryType === 'script' || (activeProduct.variants.length <= 4 && activeProduct.variants.some(v => v.name.length > 8));
  if (isRoleGrid) {
    container.classList.add('grid-2-cols');
  } else {
    container.classList.remove('grid-2-cols');
  }

  activeProduct.variants.forEach(variant => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `variant-chip-btn ${variant.id === activeVariant.id ? 'active' : ''} ${variant.badge ? 'has-badge' : ''}`;

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

    btn.innerHTML = labelHtml;

    btn.addEventListener('click', () => {
      activeVariant = variant;
      renderModalVariantChips();
      updateOrderPreview();
    });
    container.appendChild(btn);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Validasi form: Nama Pemesan Wajib & Metode Pembayaran Wajib (QRIS / DANA)
 */
function validateCheckoutForm() {
  const buyerInput = document.getElementById('buyer-name');
  const methodSelect = document.getElementById('payment-method');
  
  const buyerName = buyerInput ? buyerInput.value.trim() : '';
  const method = methodSelect ? methodSelect.value.trim() : '';

  if (!buyerName) {
    buyerInput.classList.add('input-error');
    buyerInput.focus();
    showToastNotice('⚠️ Mohon isi Nama Pemesan terlebih dahulu!');
    return false;
  }

  if (!method) {
    methodSelect.classList.add('input-error');
    methodSelect.focus();
    showToastNotice('⚠️ Mohon pilih Metode Pembayaran (QRIS / DANA)!');
    return false;
  }

  return true;
}

/**
 * Membersihkan emoji dan karakter surrogate yang merusak teks di WhatsApp Desktop/Web
 */
function stripEmojis(text) {
  if (!text) return '';
  return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, '').replace(/\s+/g, ' ').trim();
}

/**
 * Format Pesan: Menggunakan bullet bersih (•) untuk mencegah glitch diamond/tanda tanya di WhatsApp
 */
function getFormattedMessage() {
  if (!activeProduct) return '';

  const buyerNameRaw = document.getElementById('buyer-name')?.value.trim();
  const buyerName = buyerNameRaw ? stripEmojis(buyerNameRaw) : '[Nama Pemesan]';
  const methodRaw = document.getElementById('payment-method')?.value;
  const method = methodRaw ? stripEmojis(methodRaw) : '[Pilih Pembayaran: QRIS / DANA]';
  const notesRaw = document.getElementById('buyer-notes')?.value.trim();
  const notes = notesRaw ? stripEmojis(notesRaw) : '-';
  const variantName = activeVariant ? stripEmojis(activeVariant.name) : '-';
  const productName = stripEmojis(activeProduct.name);
  const priceText = activeVariant ? activeVariant.priceFormatted : (activeProduct.priceFormatted || '-');
  const periodText = (activeVariant && activeVariant.period) ? `/${activeVariant.period}` : '';

  const lines = [
    `Halo KAWA STORE, saya ingin order:`,
    `----------------------------------------`,
    `• Kode Order : #${currentOrderCode}`,
    `• Produk     : ${productName}`,
    `• Varian     : ${variantName}`,
    `• Harga      : ${priceText} ${periodText}`,
    `• Pemesan    : ${buyerName}`,
    `• Metode     : ${method}`,
    notes !== '-' ? `• Catatan    : ${notes}` : null,
    `----------------------------------------`,
    `Mohon konfirmasi ketersediaan dan total pembayarannya. Terima kasih!`
  ].filter(Boolean);

  return lines.join('\n');
}

function updateOrderPreview() {
  if (!activeProduct) return;

  const priceText = activeVariant ? activeVariant.priceFormatted : (activeProduct.priceFormatted || 'Rp 0');
  const periodText = (activeVariant && activeVariant.period) ? `/${activeVariant.period}` : '';

  // Update total di footer modal dengan micro-animasi pop halus
  const sumPriceEl = document.getElementById('modal-summary-price');
  const footPriceEl = document.getElementById('modal-footer-price');
  if (sumPriceEl) {
    sumPriceEl.textContent = `${priceText} ${periodText}`;
    sumPriceEl.classList.remove('price-pop');
    void sumPriceEl.offsetWidth; // Reflow to replay animation
    sumPriceEl.classList.add('price-pop');
  }
  if (footPriceEl) {
    footPriceEl.textContent = priceText;
    footPriceEl.classList.remove('price-pop');
    void footPriceEl.offsetWidth;
    footPriceEl.classList.add('price-pop');
  }

  // Update preview teks pesan
  const message = getFormattedMessage();
  document.getElementById('preview-message-text').textContent = message;

  // RAKIT HREF WHATSAPP SECARA SINKRON
  const phone = (storeConfig && storeConfig.contact && storeConfig.contact.whatsapp) 
    ? String(storeConfig.contact.whatsapp).replace(/\D/g, '') 
    : '6285879220690';

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const waBtn = document.getElementById('btn-modal-wa');
  if (waBtn) {
    waBtn.href = waUrl;
  }
}

function handleTelegramCheckout(e) {
  e.preventDefault();

  if (!validateCheckoutForm()) {
    return false;
  }

  const message = getFormattedMessage();
  const teleUser = (storeConfig && storeConfig.contact && storeConfig.contact.telegramUsername) 
    ? storeConfig.contact.telegramUsername 
    : 'Vnzxok';

  // Salin pesan ke clipboard
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(message)
      .then(() => showToastNotice('Detail pesanan disalin! Tempel di chat Telegram.'))
      .catch(fallbackCopy);
  } else {
    fallbackCopy();
  }

  function fallbackCopy() {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = message;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastNotice('Detail pesanan disalin! Tempel di chat Telegram.');
    } catch (err) {}
  }

  // Buka link Telegram
  window.open(`https://t.me/${teleUser}`, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Mengirim rincian order ke endpoint notifikasi Telegram secara asynchronous
 */
function sendOrderNotification() {
  try {
    const buyerNameRaw = document.getElementById('buyer-name')?.value.trim();
    const methodRaw = document.getElementById('payment-method')?.value;
    const priceText = activeVariant ? activeVariant.priceFormatted : (activeProduct.priceFormatted || '-');
    const periodText = (activeVariant && activeVariant.period) ? `/${activeVariant.period}` : '';

    const payload = {
      orderId: `#${currentOrderCode}`,
      productName: activeProduct ? activeProduct.name : '',
      variantName: activeVariant ? activeVariant.name : '',
      price: `${priceText} ${periodText}`.trim(),
      buyerName: buyerNameRaw || 'Anonim',
      paymentMethod: methodRaw || '-',
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
    };

    fetch('/api/order-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}
}

function showToastNotice(text) {
  const toast = document.getElementById('toast-notice');
  if (toast) {
    const textSpan = toast.querySelector('span');
    if (textSpan) textSpan.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

// Close saat klik di luar sheet
window.addEventListener('click', (e) => {
  const overlay = document.getElementById('modal-checkout-overlay');
  if (e.target === overlay) {
    closeModalCheckout();
  }
});
