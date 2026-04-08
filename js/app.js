// ════════════════════════════════════════════
//  FERRETERÍA LOZADA — app.js  v2
//  Catálogo con precios pill y cápsulas de medida
// ════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAiObbru3uZgnPFD3P72mw98jm7uKeKgBs",
  authDomain: "ferreterialozada-91566.firebaseapp.com",
  projectId: "ferreterialozada-91566",
  storageBucket: "ferreterialozada-91566.firebasestorage.app",
  messagingSenderId: "172357029184",
  appId: "1:172357029184:web:93418833d64022d353fea5"
};

const app          = initializeApp(firebaseConfig);
const db           = getFirestore(app);
const productosRef = collection(db, "productos");

// ─── ESTADO ───────────────────────────────
let catalogData          = [];
let cart                 = [];
let dynamicCategories    = [];
let publicSearchQuery    = '';
let publicCategoryFilter = '';
let publicStockFilter    = 'all';
let publicPriceMin       = '';
let publicPriceMax       = '';
let selectedVariantsMemory = {}; // Guarda la variante que eligió el cliente
const waNumber           = "593982965530";

// ─── IMAGEN ───────────────────────────────
function getImage(p) { return p.imageB64 || p.image || ''; }

// ─── FIRESTORE: PRODUCTOS ─────────────────
onSnapshot(productosRef, snapshot => {
  catalogData       = [];
  dynamicCategories = [];
  snapshot.forEach(d => {
    const data = d.data();
    catalogData.push({ id: d.id, ...data });
    if (data.category && !dynamicCategories.includes(data.category))
      dynamicCategories.push(data.category);
  });
  refreshCategoryFilters();
  refreshCategorySelects();
  renderCatalog();
  document.getElementById('catalog-loading')?.classList.add('d-none');
}, err => {
  console.error('Error Firestore:', err);
  const loading = document.getElementById('catalog-loading');
  if (loading) loading.innerHTML = '<p class="text-danger mt-3">Error al conectar con Firestore.</p>';
});

// ─── FILTROS DE CATEGORÍA ─────────────────
function refreshCategoryFilters() {
  const filterBox = document.getElementById('category-filters');
  if (!filterBox) return;
  filterBox.innerHTML = ['Todos', ...dynamicCategories].map(c => {
    const isActive = publicCategoryFilter === (c === 'Todos' ? '' : c);
    return `<button type="button" class="filter-btn${isActive ? ' active' : ''}" data-filter="${c}">${c}</button>`;
  }).join('');
}

function refreshCategorySelects() {
  const filterCat = document.getElementById('filter-category');
  if (filterCat) {
    filterCat.innerHTML = '<option value="">Todas las categorías</option>' +
      dynamicCategories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

// ─── RENDER PRECIO PILL ───────────────────
// Ambos precios con la misma tipografía y tamaño,
// diferenciados solo por la leyenda "Unidad" / "Ciento"
// ─── RENDER ÁREA DE PRECIOS Y BOTONES ─────────────
function renderPriceArea(p) {
  const unit = p.price != null ? parseFloat(p.price) : null;
  const bulk = p.bulkPrice != null && p.bulkPrice > 0 ? parseFloat(p.bulkPrice) : null;

  if (unit === null) return '';

  const measureArg = p.measure ? p.measure.replace(/'/g, "\\'") : '';
  const btnDisabled = !p.stock ? 'disabled' : '';
  
  if (!bulk) {
    // PRECIO ÚNICO: Sin texto "Unidad", tipografía bold y naranja
    const btnText = !p.stock ? 'Sin stock' : '<i class="bi bi-cart-plus me-1"></i>Agregar';
    return `
      <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
        <span class="single-price-display">$${unit.toFixed(2)}</span>
        <button class="btn btn-dark fw-bold btn-sm px-3" onclick="addToCart('${p.id}', '${measureArg}', 'unit')" ${btnDisabled}>
          ${btnText}
        </button>
      </div>`;
  } else {
    // TIENE PRECIO POR UNIDAD Y POR CIENTO
    const btnTextUnit = !p.stock ? 'Sin stock' : '<i class="bi bi-cart-plus"></i> Unidad';
    const btnTextBulk = !p.stock ? 'Sin stock' : '<i class="bi bi-cart-plus"></i> Ciento';
    
    return `
      <div class="d-flex flex-column gap-2 mt-2 pt-2 border-top">
        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-white" style="border: 1px solid #e0e0e0;">
          <div>
            <span class="d-block text-muted fw-bold" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Unidad</span>
            <span class="fw-bold" style="color: var(--orange); font-size: 1.15rem; font-family: 'Poppins', sans-serif;">$${unit.toFixed(2)}</span>
          </div>
          <button class="btn btn-sm btn-dark fw-bold" onclick="addToCart('${p.id}', '${measureArg}', 'unit')" ${btnDisabled}>
            ${btnTextUnit}
          </button>
        </div>
        <div class="d-flex justify-content-between align-items-center p-2 rounded" style="background: #fff4f0; border: 1px solid #ffd8c9;">
          <div>
            <span class="d-block text-muted fw-bold" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Ciento</span>
            <span class="fw-bold" style="color: var(--orange); font-size: 1.15rem; font-family: 'Poppins', sans-serif;">$${bulk.toFixed(2)}</span>
          </div>
          <button class="btn btn-sm btn-outline-danger fw-bold" onclick="addToCart('${p.id}', '${measureArg}', 'bulk')" ${btnDisabled}>
            ${btnTextBulk}
          </button>
        </div>
      </div>`;
  }
}

// Función global para actualizar el precio cuando se elige una medida diferente
window.changeVariant = function(productId, groupId) {
  // Guardamos en memoria qué medida seleccionó el usuario para este grupo
  selectedVariantsMemory[groupId] = productId;
  
  const p = catalogData.find(x => x.id === productId);
  if (!p) return;
  const area = document.getElementById(`variant-price-area-${groupId}`);
  if (area) {
    area.innerHTML = renderPriceArea(p);
  }
};

// ─── RENDER CÁPSULA DE MEDIDA ─────────────
function renderMeasureCapsules(p) {
  const measures = Array.isArray(p.measures) && p.measures.length > 0
    ? p.measures
    : (p.measure ? [p.measure] : []);
  if (!measures.length) return '';
  return `<div class="measure-capsules-row">${measures.map(m => `<span class="measure-capsule">${m}</span>`).join('')}</div>`;
}

// ─── RENDER CATÁLOGO ──────────────────────
function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  let filtered = catalogData;
  if (publicCategoryFilter) filtered = filtered.filter(p => p.category === publicCategoryFilter);
  if (publicStockFilter === 'in')  filtered = filtered.filter(p => p.stock);
  if (publicStockFilter === 'out') filtered = filtered.filter(p => !p.stock);
  if (publicPriceMin !== '') filtered = filtered.filter(p => parseFloat(p.price) >= parseFloat(publicPriceMin));
  if (publicPriceMax !== '') filtered = filtered.filter(p => parseFloat(p.price) <= parseFloat(publicPriceMax));
  if (publicSearchQuery) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(publicSearchQuery.toLowerCase()) ||
    (p.desc && p.desc.toLowerCase().includes(publicSearchQuery.toLowerCase()))
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-box fs-1 text-muted d-block mb-3"></i>
        <p class="text-muted">No se encontraron productos con los filtros aplicados.</p>
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="clearFilters()">Limpiar filtros</button>
      </div>`;
    return;
  }

  // Agrupar por nombre (variantes)
  const groups = {};
  const order  = [];
  filtered.forEach(p => {
    if (!groups[p.name]) { groups[p.name] = []; order.push(p.name); }
    groups[p.name].push(p);
  });

  grid.innerHTML = order.map(name => {
    const group = groups[name];
    return group.length === 1 ? renderSingleCard(group[0]) : renderGroupCard(group);
  }).join('');
}
// ─── ABRIR VISTA RÁPIDA DEL PRODUCTO ─────────────────────────────
window.openProductModal = function(id, groupId = null) {
  // Si viene de una carpeta de variantes, revisamos si el usuario cambió la medida
  let activeId = id;
  if (groupId && selectedVariantsMemory[groupId]) {
    activeId = selectedVariantsMemory[groupId];
  }

  const p = catalogData.find(x => x.id === activeId);
  if (!p) return;

  // 1. Cargar imagen
  const imgEl = document.getElementById('detail-img');
  const imgSrc = getImage(p);
  if (imgSrc) {
    imgEl.src = imgSrc;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  // 2. Cargar textos
  document.getElementById('detail-category').textContent = p.category || 'Sin categoría';
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-desc').textContent = p.desc || '';

  // 3. Cargar la cápsula de la medida (si aplica)
  let measureHTML = '';
  if (p.measure) {
    measureHTML = `<span class="measure-capsule" style="font-size: 0.85rem;">${p.measure}</span>`;
  } else if (Array.isArray(p.measures) && p.measures.length > 0) {
    measureHTML = `<span class="measure-capsule" style="font-size: 0.85rem;">${p.measures[0]}</span>`;
  }
  document.getElementById('detail-measures').innerHTML = measureHTML;

  // 4. Inyectar la botonera de precios original
  document.getElementById('detail-price-area').innerHTML = renderPriceArea(p);

  // 5. Mostrar el modal
  new bootstrap.Modal(document.getElementById('productDetailModal')).show();
};
// ─── TARJETA PRODUCTO ÚNICO ───────────────
function renderSingleCard(p) {
  const img = getImage(p);
  const imgHTML = img
    ? `<img src="${img}" alt="${p.name}" loading="lazy">`
    : `<i class="bi bi-tools placeholder-icon"></i>`;

  const btnHTML = p.stock
    ? `<button class="btn-add-cart" onclick="addToCart('${p.id}', '${p.measure || ''}')">
         <i class="bi bi-cart-plus me-2"></i>Agregar al carrito
       </button>`
    : `<button class="btn-add-cart" disabled>Sin stock</button>`;

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card product-card h-100 shadow-sm" onclick="openProductModal('${p.id}')" style="cursor: pointer;">
        <div class="product-img-container">${imgHTML}</div>
        <div class="card-body d-flex flex-column p-3">
          <span class="product-badge mb-2 align-self-start">${p.category || '—'}</span>
          ${renderMeasureCapsules(p)}
          <h6 class="fw-bold mb-2 mt-1">${p.name}</h6>
          ${p.desc ? `<p class="text-muted small mb-2 flex-grow-1">${p.desc}</p>` : '<div class="flex-grow-1"></div>'}
          <div class="mt-auto">
            ${renderPricePills(p)}
            <div class="mt-2" onclick="event.stopPropagation()">
              ${btnHTML}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── TARJETA GRUPO DE VARIANTES ───────────
function renderGroupCard(group) {
  const base = group[0];
  const img  = getImage(base);
  const imgHTML = img
    ? `<img src="${img}" alt="${base.name}" loading="lazy">`
    : `<i class="bi bi-tools placeholder-icon"></i>`;

  const variantRows = group.map(p => {
    const measures = Array.isArray(p.measures) && p.measures.length > 0
      ? p.measures : (p.measure ? [p.measure] : []);

    const capsules = measures.length
      ? measures.map(m => `<span class="measure-capsule">${m}</span>`).join('')
      : '<span class="text-muted small">Sin medida</span>';

    const addBtn = p.stock
      ? `<button class="btn-cart-variant" onclick="addToCart('${p.id}', '${p.measure || ''}')">
           <i class="bi bi-cart-plus"></i>
         </button>`
      : `<button class="btn-cart-variant" disabled title="Sin stock">
           <i class="bi bi-x"></i>
         </button>`;

    return `
      <div class="variant-catalog-row">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
          <div class="measure-capsules-row mb-0">${capsules}</div>
          ${addBtn}
        </div>
        ${renderPricePills(p)}
      </div>`;
  }).join('<div class="variant-divider"></div>');

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card product-card h-100 shadow-sm" onclick="openProductModal('${base.id}')" style="cursor: pointer;">
        <div class="product-img-container">${imgHTML}</div>
        <div class="card-body d-flex flex-column p-3">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="product-badge">${base.category || '—'}</span>
            <span class="variant-count-pill">${group.length} variantes</span>
          </div>
          <h6 class="fw-bold mb-2">${base.name}</h6>
          ${base.desc ? `<p class="text-muted small mb-2">${base.desc}</p>` : ''}
          
          <div class="variants-catalog-list mt-auto" onclick="event.stopPropagation()">
            ${variantRows}
          </div>
        </div>
      </div>
    </div>`;
}


// ─── CARRITO ──────────────────────────────
window.addToCart = function(id, measure, priceType = 'unit') {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;
  
  const isBulk = priceType === 'bulk';
  const cartPrice = isBulk ? parseFloat(p.bulkPrice) : parseFloat(p.price);
  const cartLabel = isBulk ? ' (Ciento)' : '';
  
  // Ahora la llave del carrito considera si es unidad o ciento
  const cartKey = measure ? `${id}-${measure}-${priceType}` : `${id}-${priceType}`;
  
  const ex = cart.find(x => x.cartKey === cartKey);
  if (ex) {
    ex.quantity++;
  } else {
    cart.push({ 
      ...p, 
      price: cartPrice, // Guardamos el precio correcto (unidad o bulk)
      cartName: p.name + cartLabel, // Le añadimos "(Ciento)" al nombre si aplica
      quantity: 1, 
      cartKey, 
      selectedMeasure: measure 
    });
  }
  updateCartUI();

  // Animación del carrito flotante para dar feedback visual
  const floatingCart = document.getElementById('floating-cart');
  if (floatingCart) {
    floatingCart.style.transform = 'scale(1.2)';
    setTimeout(() => floatingCart.style.transform = 'scale(1)', 200);
  }
};

window.changeQty = function(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  updateCartUI();
};

function updateCartUI() {
  const count   = cart.reduce((s, i) => s + i.quantity, 0);
  const countEl = document.getElementById('floatingCartCount');
  if (countEl) countEl.innerText = count;

  const container = document.getElementById('cart-items');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-cart-x" style="font-size:2.5rem;"></i>
        <p class="mt-3 small">Tu carrito está vacío</p>
      </div>`;
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = '$0.00';
    const sendBtn = document.getElementById('btn-send-quote') || document.getElementById('btn-whatsapp');
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  container.innerHTML = cart.map((item, idx) => {
    const img = getImage(item);
    const imgEl = img
      ? `<img src="${img}" class="cart-item-img" alt="${item.name}">`
      : `<div class="cart-item-icon-placeholder"><i class="bi bi-box"></i></div>`;
    return `
      <li class="d-flex align-items-center gap-3 mb-3 p-2 bg-white rounded-3 shadow-sm">
        ${imgEl}
        <div class="cart-item-content flex-grow-1" style="min-width:0;">
          <div class="fw-semibold text-truncate" style="font-size:.88rem;">
            ${item.cartName || item.name}${item.selectedMeasure ? ` · ${item.selectedMeasure}` : ''}
          </div>
          <div class="text-muted" style="font-size:.75rem;">$${parseFloat(item.price).toFixed(2)} c/u</div>
          <div class="d-flex align-items-center gap-2 mt-1">
            <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
            <span class="fw-bold">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          </div>
        </div>
        <div class="text-end flex-shrink-0">
          <div class="fw-bold" style="color:var(--orange);font-size:.95rem;">$${(item.price * item.quantity).toFixed(2)}</div>
          <button class="btn btn-sm text-danger p-0 mt-1" onclick="changeQty(${idx}, -9999)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </li>`;
  }).join('');

  const total   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;

  const sendBtn = document.getElementById('btn-send-quote') || document.getElementById('btn-whatsapp');
  if (sendBtn) sendBtn.disabled = false;
}

// ─── WHATSAPP ─────────────────────────────
function sendWhatsApp() {
  if (!cart.length) return;
  let msg = "¡Hola Vecino! 👋 Cotización de Ferretería Lozada:\n\n";
  cart.forEach(i => {
    const medida = i.selectedMeasure ? ` (${i.selectedMeasure})` : '';
    msg += `✅ ${i.quantity}x ${i.cartName || i.name}${medida} — $${(i.price * i.quantity).toFixed(2)}\n`;
  });
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  msg += `\n*Total Referencial: $${total.toFixed(2)}*\n\n¿Me confirma disponibilidad?`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

document.getElementById('btn-whatsapp')?.addEventListener('click', sendWhatsApp);
document.getElementById('btn-send-quote')?.addEventListener('click', sendWhatsApp);

// ─── FILTROS CATÁLOGO ─────────────────────
document.getElementById('category-filters')?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-filter]');
  if (!btn) return;
  publicCategoryFilter = btn.dataset.filter === 'Todos' ? '' : btn.dataset.filter;
  refreshCategoryFilters();
  renderCatalog();
});

document.getElementById('public-search')?.addEventListener('input', e => {
  publicSearchQuery = e.target.value.trim();
  renderCatalog();
});

window.applyFilters = function() {
  publicCategoryFilter = document.getElementById('filter-category')?.value || '';
  publicStockFilter    = document.querySelector('input[name="public-stock-filter"]:checked')?.value || 'all';
  publicPriceMin       = document.getElementById('price-min')?.value.trim() || '';
  publicPriceMax       = document.getElementById('price-max')?.value.trim() || '';
  renderCatalog();
  bootstrap.Modal.getInstance(document.getElementById('filtersModal'))?.hide();
};

window.clearFilters = function() {
  publicSearchQuery = ''; publicCategoryFilter = '';
  publicStockFilter = 'all'; publicPriceMin = ''; publicPriceMax = '';
  const searchEl = document.getElementById('public-search');
  const stockAll = document.querySelector('input[name="public-stock-filter"][value="all"]');
  const catEl    = document.getElementById('filter-category');
  const minEl    = document.getElementById('price-min');
  const maxEl    = document.getElementById('price-max');
  if (searchEl) searchEl.value = '';
  if (stockAll) stockAll.checked = true;
  if (catEl)    catEl.value     = '';
  if (minEl)    minEl.value     = '';
  if (maxEl)    maxEl.value     = '';
  refreshCategoryFilters();
  renderCatalog();
};

// ─── INIT ─────────────────────────────────
updateCartUI();