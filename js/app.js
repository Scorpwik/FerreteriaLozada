// 
// FERRETERÍA LOZADA — app.js  v6 (Cantidades con + y -)
// 

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

// ESTADO
let catalogData          = [];
let cart                 = [];
let dynamicCategories    = [];
let publicSearchQuery    = '';
let publicCategoryFilter = '';
let publicStockFilter    = 'all';
let publicPriceMin       = '';
let publicPriceMax       = '';
let selectedVariantsMemory = {}; 
const waNumber           = "593982965530";

// IMAGEN
function getImage(p) { return p.imageB64 || p.image || p.imageUrl || ''; }

// FIRESTORE: PRODUCTOS
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

// FILTROS DE CATEGORÍA
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

// AYUDANTES UI
function renderMeasureCapsules(p) {
  const measures = Array.isArray(p.measures) && p.measures.length > 0 
    ? p.measures : (p.measure ? [p.measure] : []);
  
  if (measures.length === 0) return '<span class="text-muted small mb-2 d-block">Sin medida</span>';
  return `<div class="d-flex flex-wrap gap-1 mb-2">` + 
    measures.map(m => `<span class="badge bg-secondary">${m}</span>`).join('') + `</div>`;
}

function renderPriceArea(p) {
  const unit = p.price != null ? parseFloat(p.price) : null;
  const bulk = p.bulkPrice != null && p.bulkPrice > 0 ? parseFloat(p.bulkPrice) : null;
  if (unit === null) return '';

  const measureArg = p.measure ? p.measure.replace(/'/g, "\\'") : '';
  const btnDisabled = !p.stock ? 'disabled' : '';
  
  if (!bulk) {
    const btnText = !p.stock ? 'Agotado' : '<i class="bi bi-cart-plus me-1"></i>Agregar';
    return `
      <div class="mt-2 pt-2 border-top" onclick="event.stopPropagation()">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted fw-bold" style="font-size: 0.75rem; text-transform: uppercase;">Precio</span>
          <span class="fw-bold text-success" style="font-size: 1.2rem;">$${unit.toFixed(2)}</span>
        </div>
        <div class="d-flex align-items-end gap-2">
          <div class="d-flex flex-column">
            <span class="text-muted mb-1" style="font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">Cantidad</span>
            <div class="input-group input-group-sm" style="width: 90px; flex-wrap: nowrap;">
              <button class="btn btn-outline-secondary px-2" type="button" onclick="this.nextElementSibling.stepDown()" ${btnDisabled}>-</button>
              <input type="number" class="form-control text-center px-1 qty-input" value="1" min="1" style="border-color: #ddd;" ${btnDisabled}>
              <button class="btn btn-outline-secondary px-2" type="button" onclick="this.previousElementSibling.stepUp()" ${btnDisabled}>+</button>
            </div>
          </div>
          <button class="btn btn-dark fw-bold btn-sm flex-grow-1 shadow-sm" style="height: 31px;" onclick="addToCart('${p.id}', '${measureArg}', 'unit', this.parentElement.querySelector('.qty-input').value)" ${btnDisabled}>
            ${btnText}
          </button>
        </div>
      </div>`;
  } else {
    const btnTextUnit = !p.stock ? 'Agotado' : '<i class="bi bi-cart-plus"></i> Und.';
    const btnTextBulk = !p.stock ? 'Agotado' : '<i class="bi bi-cart-plus"></i> Cto.';
    
    return `
      <div class="d-flex flex-column gap-2 mt-2 pt-2 border-top" onclick="event.stopPropagation()">
        <div class="p-2 rounded bg-white" style="border: 1px solid #e0e0e0;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="d-block text-muted fw-bold" style="font-size: 0.65rem; text-transform: uppercase;">Unidad</span>
            <span class="fw-bold text-success" style="font-size: 1.1rem;">$${unit.toFixed(2)}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width: 90px; flex-wrap: nowrap;">
              <button class="btn btn-outline-secondary px-2" type="button" onclick="this.nextElementSibling.stepDown()" ${btnDisabled}>-</button>
              <input type="number" class="form-control text-center px-1 qty-input" value="1" min="1" style="border-color: #ddd;" ${btnDisabled}>
              <button class="btn btn-outline-secondary px-2" type="button" onclick="this.previousElementSibling.stepUp()" ${btnDisabled}>+</button>
            </div>
            <button class="btn btn-sm btn-dark fw-bold flex-grow-1 shadow-sm" onclick="addToCart('${p.id}', '${measureArg}', 'unit', this.parentElement.querySelector('.qty-input').value)" ${btnDisabled}>
              ${btnTextUnit}
            </button>
          </div>
        </div>
        
        <div class="p-2 rounded" style="background: #fff4f0; border: 1px solid #ffd8c9;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="d-block text-muted fw-bold" style="font-size: 0.65rem; text-transform: uppercase;">Ciento</span>
            <span class="fw-bold text-danger" style="font-size: 1.1rem;">$${bulk.toFixed(2)}</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width: 90px; flex-wrap: nowrap;">
              <button class="btn btn-outline-secondary px-2" type="button" style="border-color: #ffd8c9; background: white;" onclick="this.nextElementSibling.stepDown()" ${btnDisabled}>-</button>
              <input type="number" class="form-control text-center px-1 qty-input" value="1" min="1" style="border-color: #ffd8c9;" ${btnDisabled}>
              <button class="btn btn-outline-secondary px-2" type="button" style="border-color: #ffd8c9; background: white;" onclick="this.previousElementSibling.stepUp()" ${btnDisabled}>+</button>
            </div>
            <button class="btn btn-sm btn-outline-danger bg-white fw-bold flex-grow-1 shadow-sm" onclick="addToCart('${p.id}', '${measureArg}', 'bulk', this.parentElement.querySelector('.qty-input').value)" ${btnDisabled}>
              ${btnTextBulk}
            </button>
          </div>
        </div>
      </div>`;
  }
}

// RENDER TARJETAS
function renderSingleCard(p) {
  const img = getImage(p);
  const imgHTML = img ? `<img src="${img}" alt="${p.name}" loading="lazy">` : `<i class="bi bi-tools placeholder-icon"></i>`;

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
            ${renderPriceArea(p)}
          </div>
        </div>
      </div>
    </div>`;
}

function renderGroupCard(group) {
  const base = group[0];
  const img  = getImage(base);
  const imgHTML = img ? `<img src="${img}" alt="${base.name}" loading="lazy">` : `<i class="bi bi-tools placeholder-icon"></i>`;

  const activeVariantId = selectedVariantsMemory[base.id] || base.id;
  const activeVariant = group.find(x => x.id === activeVariantId) || base;

  const options = group.map(p => {
    const label = p.measure || (p.measures && p.measures[0]) || 'Sin medida';
    const isSelected = p.id === activeVariant.id ? 'selected' : '';
    return `<option value="${p.id}" ${isSelected}>${label}</option>`;
  }).join('');

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card product-card h-100 shadow-sm" onclick="openProductModal('${base.id}')" style="cursor: pointer;">
        <div class="product-img-container">${imgHTML}</div>
        <div class="card-body d-flex flex-column p-3">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="product-badge">${base.category || '—'}</span>
          </div>
          <h6 class="fw-bold mb-2 mt-1">${base.name}</h6>
          ${base.desc ? `<p class="text-muted small mb-2 flex-grow-1">${base.desc}</p>` : '<div class="flex-grow-1"></div>'}
          
          <div class="mt-auto" onclick="event.stopPropagation()">
            <label class="small text-muted mb-1 fw-bold"><i class="bi bi-rulers me-1"></i>Medida:</label>
            <select class="form-select form-select-sm mb-2" style="border-color: #ddd;" onchange="changeCardVariant('${base.id}', this.value)">
              ${options}
            </select>
            <div id="card-price-area-${base.id}">
              ${renderPriceArea(activeVariant)}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ACTUALIZACIÓN EN TIEMPO REAL (TARJETA)
window.changeCardVariant = function(baseId, variantId) {
  selectedVariantsMemory[baseId] = variantId;
  const v = catalogData.find(x => x.id === variantId);
  if (!v) return;
  
  const area = document.getElementById(`card-price-area-${baseId}`);
  if (area) area.innerHTML = renderPriceArea(v);
};

// RENDER CATÁLOGO
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

// MODAL VISTA RÁPIDA
window.openProductModal = function(id) {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;

  const group = catalogData.filter(x => x.name === p.name);
  const baseId = group[0].id;
  
  let activeProduct = p;
  if (group.length > 1 && selectedVariantsMemory[baseId]) {
    activeProduct = catalogData.find(x => x.id === selectedVariantsMemory[baseId]) || p;
  }

  const imgEl = document.getElementById('detail-img');
  const imgSrc = getImage(activeProduct);
  if (imgSrc) { imgEl.src = imgSrc; imgEl.style.display = 'block'; } 
  else { imgEl.style.display = 'none'; }

  document.getElementById('detail-category').textContent = activeProduct.category || 'Sin categoría';
  document.getElementById('detail-name').textContent = activeProduct.name;
  document.getElementById('detail-desc').textContent = activeProduct.desc || '';

  const measuresContainer = document.getElementById('detail-measures');
  if (group.length > 1) {
    const options = group.map(v => {
      const label = v.measure || (v.measures && v.measures[0]) || 'Sin medida';
      const isSelected = v.id === activeProduct.id ? 'selected' : '';
      return `<option value="${v.id}" ${isSelected}>${label}</option>`;
    }).join('');
    
    measuresContainer.innerHTML = `
      <label class="small text-muted mb-1 fw-bold">Seleccione la medida:</label>
      <select class="form-select form-select-sm mb-3" style="border-color: var(--orange);" onchange="updateModalVariant(this.value, '${baseId}')">
        ${options}
      </select>
    `;
  } else {
    measuresContainer.innerHTML = renderMeasureCapsules(activeProduct);
  }

  document.getElementById('detail-price-area').innerHTML = renderPriceArea(activeProduct);

  new bootstrap.Modal(document.getElementById('productDetailModal')).show();
};

window.updateModalVariant = function(newId, baseId) {
  selectedVariantsMemory[baseId] = newId;
  const v = catalogData.find(x => x.id === newId);
  if (!v) return;

  const imgEl = document.getElementById('detail-img');
  const imgSrc = getImage(v);
  if (imgSrc) { imgEl.src = imgSrc; imgEl.style.display = 'block'; } 
  else { imgEl.style.display = 'none'; }

  document.getElementById('detail-price-area').innerHTML = renderPriceArea(v);
  
  const cardArea = document.getElementById(`card-price-area-${baseId}`);
  if (cardArea) {
    cardArea.innerHTML = renderPriceArea(v);
    const cardSelect = cardArea.previousElementSibling;
    if (cardSelect && cardSelect.tagName === 'SELECT') cardSelect.value = newId;
  }
};

// CARRITO
window.addToCart = function(id, measure, priceType = 'unit', qtyStr = "1") {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;
  
  const qtyToAdd = parseInt(qtyStr, 10);
  if (isNaN(qtyToAdd) || qtyToAdd < 1) return;
  
  const isBulk = priceType === 'bulk';
  const cartPrice = isBulk ? parseFloat(p.bulkPrice) : parseFloat(p.price);
  const cartLabel = isBulk ? ' (Ciento)' : '';
  const cartKey = measure ? `${id}-${measure}-${priceType}` : `${id}-${priceType}`;
  
  const ex = cart.find(x => x.cartKey === cartKey);
  if (ex) {
    ex.quantity += qtyToAdd;
  } else {
    cart.push({ 
      ...p, price: cartPrice, cartName: p.name + cartLabel, 
      quantity: qtyToAdd, cartKey, selectedMeasure: measure 
    });
  }
  updateCartUI();

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
    const imgEl = img ? `<img src="${img}" class="cart-item-img" alt="${item.name}">` : `<div class="cart-item-icon-placeholder"><i class="bi bi-box"></i></div>`;
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
          <button class="btn btn-sm text-danger p-0 mt-1" onclick="changeQty(${idx}, -9999)"><i class="bi bi-trash"></i></button>
        </div>
      </li>`;
  }).join('');

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;

  const sendBtn = document.getElementById('btn-send-quote') || document.getElementById('btn-whatsapp');
  if (sendBtn) sendBtn.disabled = false;
}

// WHATSAPP
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

// FILTROS CATÁLOGO
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
  document.getElementById('public-search').value = '';
  document.querySelector('input[name="public-stock-filter"][value="all"]').checked = true;
  document.getElementById('filter-category').value = '';
  document.getElementById('price-min').value = '';
  document.getElementById('price-max').value = '';
  refreshCategoryFilters();
  renderCatalog();
};

// INIT
updateCartUI();