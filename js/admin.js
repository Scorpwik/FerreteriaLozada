// ════════════════════════════════════════════
//  FERRETERÍA LOZADA — admin.js  v3 (Limpio y sin duplicados)
// ════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc,
  doc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const auth         = getAuth(app);
const productosRef = collection(db, "productos");
const medidasRef   = collection(db, "medidas");

// ─── ESTADO ───────────────────────────────
let catalogData         = [];
let adminSearchQuery    = '';
let adminCategoryFilter = '';
let adminStockFilter    = 'all';
let adminPriceMin       = '';
let adminPriceMax       = '';
let medidasDocId        = null;
let dynamicCategories   = [];
let measureSections     = {};
let productMeasures     = [];
let editMeasures        = [];
let currentMeasureProductId = null;
let editCurrentImageB64 = '';
let editNewImageB64     = '';
let editImageRemoved    = false;
let editingMeasureSections = new Set(); // Recuerda qué secciones están en modo edición 
let unsubProductos      = null;
let unsubMedidas        = null;
let openVariantGroups = new Set();

// ─── COMPRIMIR IMAGEN ─────────────────────
function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ev => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── UI HELPERS ───────────────────────────
function showNotif(message) {
  const el = document.getElementById('notif-message');
  if (el) el.textContent = message;
  new bootstrap.Modal(document.getElementById('notifModal')).show();
}

function setLoginError(msg) {
  const box = document.getElementById('login-error');
  const txt = document.getElementById('login-error-msg');
  if (!box || !txt) return;
  msg ? (txt.textContent = msg, box.classList.remove('d-none'))
      : box.classList.add('d-none');
}

function setLoginLoading(loading) {
  const btn     = document.getElementById('btn-login');
  const btnText = document.getElementById('btn-login-text');
  const spinner = document.getElementById('btn-login-spinner');
  if (!btn) return;
  btn.disabled = loading;
  btnText?.classList.toggle('d-none', loading);
  spinner?.classList.toggle('d-none', !loading);
}

function getFirebaseErrorMessage(code) {
  const errors = {
    'auth/invalid-email':          'El correo electrónico no es válido.',
    'auth/user-not-found':         'No existe una cuenta con ese correo.',
    'auth/wrong-password':         'La contraseña es incorrecta.',
    'auth/invalid-credential':     'Correo o contraseña incorrectos.',
    'auth/too-many-requests':      'Demasiados intentos fallidos. Intente más tarde.',
    'auth/user-disabled':          'Esta cuenta ha sido desactivada.',
    'auth/network-request-failed': 'Error de red. Revise su conexión.',
  };
  return errors[code] || 'Error al iniciar sesión. Intente de nuevo.';
}

function getImage(p) { return p.imageB64 || p.image || ''; }

function getMeasureLabel(p) {
  if (Array.isArray(p.measures) && p.measures.length > 0) return p.measures.join(', ');
  return p.measure || 'Sin medida';
}

// ─── AUTH STATE & DATABASESE ──────────────
onAuthStateChanged(auth, user => {
  document.getElementById('login-screen')?.classList.toggle('d-none', !!user);
  document.getElementById('admin-panel')?.classList.toggle('d-none', !user);
  document.getElementById('admin-navbar')?.classList.toggle('d-none', !user);
  const emailEl = document.getElementById('admin-user-email');
  if (emailEl) emailEl.textContent = user?.email || '';

  if (user) {
    // Solo cargamos la base de datos si el inicio de sesión es exitoso
    iniciarBaseDeDatos();
  } else {
    // Limpiamos los "escuchadores" si cerramos sesión
    if (unsubMedidas) unsubMedidas();
    if (unsubProductos) unsubProductos();
  }
});

// ─── LOGIN & LOGOUT ───────────────────────
document.getElementById('btn-login')?.addEventListener('click', async () => {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  setLoginError('');
  if (!email || !password) { setLoginError('Ingrese correo y contraseña.'); return; }
  setLoginLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setLoginError(getFirebaseErrorMessage(err.code));
  } finally {
    setLoginLoading(false);
  }
});

['login-email', 'login-password'].forEach(id =>
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login')?.click();
  })
);

document.getElementById('toggle-password')?.addEventListener('click', () => {
  const input = document.getElementById('login-password');
  const icon  = document.getElementById('toggle-password-icon');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  icon?.classList.toggle('bi-eye');
  icon?.classList.toggle('bi-eye-slash');
});

async function doSignOut(redirectTo = 'index.html') {
  await signOut(auth);
  window.location.href = redirectTo;
}

document.getElementById('btn-logout')?.addEventListener('click', () => doSignOut('index.html'));
document.getElementById('admin-logo-link')?.addEventListener('click', e => { e.preventDefault(); doSignOut('index.html'); });
document.getElementById('btn-ver-tienda')?.addEventListener('click', e => { e.preventDefault(); doSignOut('catalogo.html'); });


// ─── FIRESTORE: CARGA DE DATOS ────────────
function iniciarBaseDeDatos() {
  // Escuchar Medidas y Categorías
  unsubMedidas = onSnapshot(medidasRef, snapshot => {
    if (snapshot.empty) {
      const defaults = {
        'Medidas Eléctricas': ['Cable 1.5mm²','Cable 2.5mm²','Interruptor 1P','Toma 10A','Toma 16A'],
        'Tornillos':          ['3mm','4mm','5mm','6mm','8mm','10mm'],
        'Material Eléctrico': ['Conduit 20mm','Cinta aislante 3M','Toma doble'],
        'Tubería':            ['1/2"','3/4"','1"','1 1/4"','2"'],
        'Ferretería':         ['50 cm','1 m','2 m','3 m','5 m']
      };
      measureSections = defaults;
      addDoc(medidasRef, { sections: defaults, categories: [] });
    } else {
      const data = snapshot.docs[0].data();
      medidasDocId    = snapshot.docs[0].id;
      measureSections = data.sections || {};
      if (data.categories && data.categories.length > 0) {
        dynamicCategories = data.categories;
      }
    }
    setupMeasureControls('p');
    setupMeasureControls('e');
    refreshCategorySelects();
  });

  // Escuchar Productos
  unsubProductos = onSnapshot(productosRef, snapshot => {
    catalogData = [];
    let newCatsFound = false;

    snapshot.forEach(d => {
      const data = d.data();
      catalogData.push({ id: d.id, ...data });
      if (data.category && !dynamicCategories.includes(data.category)) {
        dynamicCategories.push(data.category);
        newCatsFound = true;
      }
    });

    if (newCatsFound && medidasDocId) {
      updateDoc(doc(db, 'medidas', medidasDocId), { categories: dynamicCategories });
    }

    refreshCategorySelects();
    renderAdminTable();
  });
}

// ─── TABLA DE ADMIN ───────────────────────
function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  let filtered = catalogData;
  if (adminCategoryFilter) filtered = filtered.filter(p => p.category === adminCategoryFilter);
  if (adminStockFilter === 'in')  filtered = filtered.filter(p => p.stock);
  if (adminStockFilter === 'out') filtered = filtered.filter(p => !p.stock);
  if (adminPriceMin !== '') filtered = filtered.filter(p => parseFloat(p.price) >= parseFloat(adminPriceMin));
  if (adminPriceMax !== '') filtered = filtered.filter(p => parseFloat(p.price) <= parseFloat(adminPriceMax));
  if (adminSearchQuery)     filtered = filtered.filter(p => p.name.toLowerCase().includes(adminSearchQuery.toLowerCase()));

  const countEl = document.getElementById('admin-product-count');
  if (countEl) {
    countEl.innerHTML = filtered.length === catalogData.length
      ? `<strong>${catalogData.length}</strong> productos`
      : `Mostrando <strong>${filtered.length}</strong> de <strong>${catalogData.length}</strong> productos`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">
      ${catalogData.length === 0 ? 'No hay productos. Agrega el primero.' : 'Sin resultados para esos filtros.'}
    </td></tr>`;
    return;
  }

  const groups = {};
  const order  = [];
  filtered.forEach(p => {
    if (!groups[p.name]) { groups[p.name] = []; order.push(p.name); }
    groups[p.name].push(p);
  });

  tbody.innerHTML = order.map((name, gIdx) => {
    const products = groups[name];
    return products.length === 1
      ? renderSingleAdminRow(products[0])
      : renderGroupAdminRows(products, gIdx);
  }).join('');
}

function renderSingleAdminRow(p) {
  const img = getImage(p);
  const thumb = img
    ? `<img src="${img}" class="admin-thumb" alt="${p.name}">`
    : `<div class="admin-thumb-placeholder"><i class="bi bi-box"></i></div>`;
  const measures = getMeasureLabel(p);
  const stockBtn = p.stock
    ? `<button class="stock-btn in-stock" onclick="toggleStock('${p.id}')">En Stock</button>`
    : `<button class="stock-btn out-stock" onclick="toggleStock('${p.id}')">Agotado</button>`;

  return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-3">
          ${thumb}
          <div>
            <div class="fw-semibold admin-item-name">${p.name}</div>
            ${p.desc ? `<div class="text-muted admin-item-desc">${p.desc.slice(0,45)}${p.desc.length>45?'…':''}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="product-badge">${p.category||'—'}</span></td>
      <td>
        <button id="measure-btn-${p.id}" class="btn btn-sm btn-outline-secondary" onclick="openMeasureSelectModal('${p.id}')">
          ${measures}
        </button>
      </td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="input-group input-group-sm" style="width: 105px;">
            <span class="input-group-text bg-light text-muted px-2" title="Unidad" style="font-size:0.75rem; font-weight:bold;">U</span>
            <input type="number" class="form-control quick-price-input text-center px-1" value="${parseFloat(p.price||0).toFixed(2)}" step="0.01" min="0" onchange="quickUpdatePrice('${p.id}', 'price', this)">
          </div>
          ${(p.bulkPrice != null && parseFloat(p.bulkPrice) > 0) ? `
          <div class="input-group input-group-sm" style="width: 105px;">
            <span class="input-group-text text-danger px-2" title="Ciento" style="font-size:0.75rem; font-weight:bold; background:#fff4f0;">C</span>
            <input type="number" class="form-control quick-price-input text-danger text-center px-1" value="${parseFloat(p.bulkPrice||0).toFixed(2)}" step="0.01" min="0" onchange="quickUpdatePrice('${p.id}', 'bulkPrice', this)">
          </div>` : ''}
        </div>
      </td>
      <td>${stockBtn}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary me-1" onclick="openEditModal('${p.id}')" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-success me-1" onclick="createVariant('${p.id}')" title="Añadir variante">
          <i class="bi bi-diagram-2"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`;
}

function renderGroupAdminRows(products, gIdx) {
  const base = products[0];
  const img  = getImage(base);
  const thumb = img
    ? `<img src="${img}" class="admin-thumb" alt="${base.name}">`
    : `<div class="admin-thumb-placeholder"><i class="bi bi-box"></i></div>`;

  const isOpen = openVariantGroups.has(gIdx);
  const iconClass = isOpen ? 'bi-chevron-down' : 'bi-chevron-right';
  const rowDisplay = isOpen ? '' : 'd-none';

  const headerRow = `
    <tr class="admin-group-header" onclick="toggleVariantGroup(${gIdx})">
      <td>
        <div class="d-flex align-items-center gap-2">
          ${thumb}
          <div>
            <div class="fw-semibold admin-item-name">${base.name}</div>
            ${base.desc ? `<div class="text-muted admin-item-desc">${base.desc.slice(0,45)}${base.desc.length>45?'…':''}</div>` : ''}
          </div>
          <span class="variant-count-badge ms-2">${products.length} variantes</span>
          <i class="bi ${iconClass} ms-auto group-chevron" id="group-icon-${gIdx}"></i>
        </div>
      </td>
      <td><span class="product-badge">${base.category||'—'}</span></td>
      <td><span class="text-muted small">${products.length} medidas</span></td>
      <td>—</td>
      <td>—</td>
      <td class="text-center" onclick="event.stopPropagation()">
        <button class="btn btn-sm btn-success" onclick="createVariant('${base.id}')">
          <i class="bi bi-diagram-2 me-1"></i>Añadir variante
        </button>
      </td>
    </tr>`;

  const variantRows = products.map(p => {
    const measures = getMeasureLabel(p);
    const stockBtn = p.stock
      ? `<button class="stock-btn in-stock" onclick="toggleStock('${p.id}')">En Stock</button>`
      : `<button class="stock-btn out-stock" onclick="toggleStock('${p.id}')">Agotado</button>`;
    
    return `
      <tr class="admin-variant-row ${rowDisplay}" data-group="${gIdx}">
        <td>
          <div class="variant-indent">
            <i class="bi bi-arrow-return-right text-muted small"></i>
            <span class="variant-measure-pill">${measures}</span>
          </div>
        </td>
        <td><span class="product-badge">${p.category||'—'}</span></td>
        <td>
          <button id="measure-btn-${p.id}" class="btn btn-sm btn-outline-secondary" onclick="openMeasureSelectModal('${p.id}')">
            ${measures}
          </button>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width: 105px;">
              <span class="input-group-text bg-light text-muted px-2" title="Unidad" style="font-size:0.75rem; font-weight:bold;">U</span>
              <input type="number" class="form-control quick-price-input text-center px-1" value="${parseFloat(p.price||0).toFixed(2)}" step="0.01" min="0" onchange="quickUpdatePrice('${p.id}', 'price', this)">
            </div>
            ${(p.bulkPrice != null && parseFloat(p.bulkPrice) > 0) ? `
            <div class="input-group input-group-sm" style="width: 105px;">
              <span class="input-group-text text-danger px-2" title="Ciento" style="font-size:0.75rem; font-weight:bold; background:#fff4f0;">C</span>
              <input type="number" class="form-control quick-price-input text-danger text-center px-1" value="${parseFloat(p.bulkPrice||0).toFixed(2)}" step="0.01" min="0" onchange="quickUpdatePrice('${p.id}', 'bulkPrice', this)">
            </div>` : ''}
          </div>
        </td>
        <td>${stockBtn}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-primary me-1" onclick="openEditModal('${p.id}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');

  return headerRow + variantRows;
}

// ─── ACCIONES RÁPIDAS ─────────────────────
window.toggleVariantGroup = function(gIdx) {
  const rows   = document.querySelectorAll(`tr[data-group="${gIdx}"]`);
  const icon   = document.getElementById(`group-icon-${gIdx}`);
  const hidden = rows[0]?.classList.contains('d-none');
  
  rows.forEach(r => r.classList.toggle('d-none', !hidden));
  
  if (icon) {
    icon.classList.toggle('bi-chevron-right', !hidden);
    icon.classList.toggle('bi-chevron-down',   hidden);
  }
  
  // Guardamos en la memoria para que no se pierda al actualizar la tabla
  if (hidden) {
    openVariantGroups.add(gIdx);
  } else {
    openVariantGroups.delete(gIdx);
  }
};

// ¡AQUÍ ESTÁ LA FUNCIÓN QUE SE TE HABÍA BORRADO!
window.createVariant = function(id) {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;

  document.getElementById('p-name').value       = p.name;
  document.getElementById('p-desc').value       = p.desc  || '';
  document.getElementById('p-price').value      = p.price || '';
  document.getElementById('p-bulk-price').value = p.bulkPrice || '';
  document.getElementById('p-image').value      = '';

  refreshCategorySelects();
  const catSel = document.getElementById('p-category');
  if (catSel && p.category) catSel.value = p.category;

  productMeasures = [];
  renderMeasureTags('p', productMeasures);
  setupMeasureControls('p');
  autoSelectMeasureSection('p', p.measures && p.measures.length > 0 ? p.measures : [p.measure]);

  let note = document.getElementById('variant-note');
  if (!note) {
    note = document.createElement('div');
    note.id = 'variant-note';
    note.className = 'alert alert-info py-2 small mb-3';
    note.innerHTML = '<i class="bi bi-diagram-2 me-1"></i>Define la <strong>medida</strong> y el <strong>precio</strong> de esta nueva variante.';
    document.getElementById('productForm')?.prepend(note);
  }
  note.classList.remove('d-none');

  document.querySelectorAll('.modal.show').forEach(m => bootstrap.Modal.getInstance(m)?.hide());
  setTimeout(() => new bootstrap.Modal(document.getElementById('addProductModal')).show(), 250);
};

window.toggleStock = async function(id) {
  const p = catalogData.find(x => x.id === id);
  if (p) await updateDoc(doc(db, 'productos', id), { stock: !p.stock });
};

window.deleteProduct = async function(id) {
  if (!confirm('¿Eliminar este producto de forma permanente?')) return;
  await deleteDoc(doc(db, 'productos', id));
};

window.quickUpdatePrice = async function(id, field, inputEl) {
  const val = parseFloat(inputEl.value);
  if (isNaN(val) || val < 0) return;
  try {
    const updateData = {}; updateData[field] = val;
    await updateDoc(doc(db, 'productos', id), updateData);
    inputEl.classList.add('saved');
    setTimeout(() => inputEl.classList.remove('saved'), 1200);
  } catch { showNotif('No se pudo actualizar el precio.'); }
};

// ─── LÓGICA DE MEDIDAS (TABS) ─────────────
function setupMeasureControls(prefix) {
  const sectionEl = document.getElementById(`${prefix}-measure-section`);
  const optionEl  = document.getElementById(`${prefix}-measure-option`);
  if (!sectionEl || !optionEl) return;
  const sections = Object.keys(measureSections);
  const prev = sectionEl.value;
  sectionEl.innerHTML = sections.map(s => `<option value="${s}">${s}</option>`).join('');
  const selected = sections.includes(prev) ? prev : sections[0];
  if (selected) {
    sectionEl.value = selected;
    optionEl.innerHTML = (measureSections[selected] || []).map(v => `<option value="${v}">${v}</option>`).join('');
  }
}

function autoSelectMeasureSection(prefix, measuresArray) {
  if (!measuresArray || measuresArray.length === 0) return;
  let foundSection = null;
  for (const [sec, vals] of Object.entries(measureSections)) {
    if (vals.includes(measuresArray[0])) { foundSection = sec; break; }
  }
  if (foundSection) {
    const sectionEl = document.getElementById(`${prefix}-measure-section`);
    if (sectionEl) {
      sectionEl.value = foundSection;
      setupMeasureControls(prefix);
    }
  }
}

window.addMeasureToForm = function(prefix) {
  const optionSelect = document.getElementById(`${prefix}-measure-option`);
  if (!optionSelect || optionSelect.value === "") return;
  const val = optionSelect.options[optionSelect.selectedIndex].text;
  const targetArray = prefix === 'p' ? productMeasures : editMeasures;
  if (!targetArray.includes(val)) {
    targetArray.push(val);
    renderMeasureTags(prefix, targetArray);
  }
};

window.renderMeasureTags = function(prefix, list) {
  const container = document.getElementById(`${prefix}-measures-list`);
  if (!container) return;
  container.innerHTML = list.map((m, i) => `
    <div class="position-relative d-inline-block me-3 mb-2 mt-2">
      <span class="badge bg-secondary px-3 py-2" style="font-size:0.85rem;">${m}</span>
      <button type="button" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light measure-chip-btn" data-prefix="${prefix}" data-index="${i}" style="cursor: pointer; padding: 0.25rem 0.4rem; z-index: 10;">
        <i class="bi bi-x-lg" style="font-size: 0.6rem;"></i>
      </button>
    </div>
  `).join('');
};

function resetProductMeasures() {
  productMeasures = [];
  renderMeasureTags('p', productMeasures);
}

// ─── AÑADIR VARIANTE Y PRODUCTO ───────────
document.getElementById('addProductModal')?.addEventListener('hidden.bs.modal', () =>
  document.getElementById('variant-note')?.classList.add('d-none')
);

document.getElementById('productForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('p-submit-btn');
  const spinner = document.getElementById('p-spinner');
  const text    = document.getElementById('p-submit-text');
  btn.disabled = true;
  spinner?.classList.remove('d-none');
  if (text) text.textContent = 'Guardando...';
  const file = document.getElementById('p-image')?.files[0];
  let imageB64 = '';
  try {
    if (file) imageB64 = await compressImage(file);
    await addDoc(productosRef, {
      name:      document.getElementById('p-name').value.trim(),
      desc:      document.getElementById('p-desc').value.trim(),
      category:  document.getElementById('p-category').value,
      price:     parseFloat(document.getElementById('p-price').value),
      bulkPrice: document.getElementById('p-bulk-price').value ? parseFloat(document.getElementById('p-bulk-price').value) : null,
      stock:     true,
      measures:  productMeasures,
      imageB64,
    });
    bootstrap.Modal.getInstance(document.getElementById('addProductModal'))?.hide();
    this.reset();
    resetProductMeasures();
  } catch (err) { showNotif('Error al guardar. Si tiene imagen, intente con una foto más pequeña.'); }
  btn.disabled = false;
  spinner?.classList.add('d-none');
  if (text) text.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Guardar Producto';
});

// ─── EDITAR PRODUCTO ──────────────────────
window.openEditModal = function(id) {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;
  document.getElementById('e-id').value         = p.id;
  document.getElementById('e-name').value       = p.name  || '';
  document.getElementById('e-desc').value       = p.desc  || '';
  document.getElementById('e-price').value      = p.price || '';
  document.getElementById('e-bulk-price').value = p.bulkPrice || '';
  document.getElementById('e-image').value      = '';
  refreshCategorySelects();
  const catSel = document.getElementById('e-category');
  if (catSel) catSel.value = p.category || dynamicCategories[0];
  editCurrentImageB64 = p.imageB64 || p.image || '';
  editNewImageB64     = '';
  editImageRemoved    = false;
  editMeasures = Array.isArray(p.measures) ? [...p.measures] : [];
  renderMeasureTags('e', editMeasures);
  setupMeasureControls('e');
  autoSelectMeasureSection('e', editMeasures);
  const preview = document.getElementById('edit-img-preview');
  if (preview) {
    preview.innerHTML = editCurrentImageB64
      ? `<img src="${editCurrentImageB64}" alt="Imagen actual">`
      : '<span class="text-muted small">Sin imagen</span>';
  }
  new bootstrap.Modal(document.getElementById('editProductModal')).show();
};

document.getElementById('e-image')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  editNewImageB64  = await compressImage(file);
  editImageRemoved = false;
  const preview = document.getElementById('edit-img-preview');
  if (preview) preview.innerHTML = `<img src="${editNewImageB64}" alt="Nueva imagen">`;
});

document.getElementById('e-remove-image-btn')?.addEventListener('click', () => {
  editNewImageB64  = '';
  editImageRemoved = true;
  document.getElementById('e-image').value = '';
  const preview = document.getElementById('edit-img-preview');
  if (preview) preview.innerHTML = `<span class="badge" style="background:#fee2e2;color:#991b1b;">Imagen eliminada</span>`;
});

document.getElementById('editProductForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('e-submit-btn');
  const spinner = document.getElementById('e-spinner');
  const text    = document.getElementById('e-submit-text');
  btn.disabled = true;
  spinner?.classList.remove('d-none');
  if (text) text.textContent = 'Guardando...';
  const id = document.getElementById('e-id').value;
  const finalImageB64 = editImageRemoved ? '' : (editNewImageB64 || editCurrentImageB64);
  try {
    await updateDoc(doc(db, 'productos', id), {
      name:      document.getElementById('e-name').value.trim(),
      desc:      document.getElementById('e-desc').value.trim(),
      category:  document.getElementById('e-category').value,
      price:     parseFloat(document.getElementById('e-price').value),
      bulkPrice: document.getElementById('e-bulk-price').value ? parseFloat(document.getElementById('e-bulk-price').value) : null,
      measures:  editMeasures,
      imageB64:  finalImageB64,
    });
    bootstrap.Modal.getInstance(document.getElementById('editProductModal'))?.hide();
  } catch { showNotif('Error al guardar cambios.'); }
  btn.disabled = false;
  spinner?.classList.add('d-none');
  if (text) text.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Cambios';
});

// ─── GESTIÓN CATEGORÍAS ───────────────────
function openCategoryManager() {
  renderCatManagerList();
  new bootstrap.Modal(document.getElementById('categoryManagerModal')).show();
}

function renderCatManagerList() {
  const ul = document.getElementById('cat-manager-list');
  if (!ul) return;
  ul.innerHTML = dynamicCategories.map((cat, idx) => `
    <li class="cat-manager-item d-flex align-items-center mb-2" data-cat-idx="${idx}">
      <div class="btn-group btn-group-sm me-2">
        <button type="button" class="btn btn-outline-secondary py-0 px-1" data-action="up" ${idx===0?'disabled':''}><i class="bi bi-chevron-up"></i></button>
        <button type="button" class="btn btn-outline-secondary py-0 px-1" data-action="down" ${idx===dynamicCategories.length-1?'disabled':''}><i class="bi bi-chevron-down"></i></button>
      </div>
      <input type="text" value="${cat}" class="form-control form-control-sm me-2 cat-manager-input">
      <button type="button" class="btn btn-sm btn-success me-1 btn-cat-save" data-action="save"><i class="bi bi-check-lg"></i></button>
      <button type="button" class="btn btn-sm btn-danger btn-cat-del" data-action="delete"><i class="bi bi-trash"></i></button>
    </li>`).join('');
}

window.saveCategoriesAndRender = function() {
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { categories: dynamicCategories });
  refreshCategorySelects();
  renderCatManagerList();
};

document.getElementById('cat-manager-list')?.addEventListener('click', e => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const item = button.closest('.cat-manager-item');
  const idx  = Number(item?.dataset.catIdx);
  const action = button.dataset.action;

  if (action === 'up' && idx > 0) {
    [dynamicCategories[idx - 1], dynamicCategories[idx]] = [dynamicCategories[idx], dynamicCategories[idx - 1]];
    saveCategoriesAndRender();
  }
  if (action === 'down' && idx < dynamicCategories.length - 1) {
    [dynamicCategories[idx + 1], dynamicCategories[idx]] = [dynamicCategories[idx], dynamicCategories[idx + 1]];
    saveCategoriesAndRender();
  }
  if (action === 'save') {
    const newName = item.querySelector('.cat-manager-input')?.value.trim();
    if (!newName) return;
    const oldName = dynamicCategories[idx];
    dynamicCategories[idx] = newName;
    catalogData.forEach(p => { if (p.category === oldName) updateDoc(doc(db, 'productos', p.id), { category: newName }); });
    saveCategoriesAndRender();
  }
  if (action === 'delete') {
    const cat = dynamicCategories[idx];
    if (catalogData.some(p => p.category === cat)) return showNotif(`La categoría "${cat}" tiene productos asignados.`);
    if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return;
    dynamicCategories.splice(idx, 1);
    saveCategoriesAndRender();
  }
});

document.getElementById('cat-manager-list')?.addEventListener('input', e => e.target.closest('.cat-manager-item')?.classList.add('editing'));

document.getElementById('btn-cat-manager-add')?.addEventListener('click', () => {
  const input = document.getElementById('new-cat-input');
  const name  = input?.value.trim();
  if (!name) return;
  if (dynamicCategories.includes(name)) return showNotif('Esa categoría ya existe.');
  dynamicCategories.push(name);
  input.value = '';
  saveCategoriesAndRender();
});

// ─── GESTIÓN MEDIDAS ──────────────────────
function openMeasureManager() {
  renderMeasureManager();
  new bootstrap.Modal(document.getElementById('measureManagerModal')).show();
}

window.moveSection = function(section, direction) {
  const keys = Object.keys(measureSections);
  const idx = keys.indexOf(section);
  if (direction === 'up' && idx > 0) {
    [keys[idx - 1], keys[idx]] = [keys[idx], keys[idx - 1]];
  } else if (direction === 'down' && idx < keys.length - 1) {
    [keys[idx + 1], keys[idx]] = [keys[idx], keys[idx + 1]];
  } else return;

  const newSections = {};
  keys.forEach(k => newSections[k] = measureSections[k]);
  measureSections = newSections;
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
};

window.moveMeasure = function(section, idx, direction) {
  const arr = measureSections[section];
  if (direction === 'up' && idx > 0) {
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
  } else if (direction === 'down' && idx < arr.length - 1) {
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
  } else return;
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
};

function renderMeasureManager() {
  const list          = document.getElementById('measure-manager-list');
  const sectionSelect = document.getElementById('new-measure-section');
  if (!list || !sectionSelect) return;
  
  const sections = Object.keys(measureSections);
  sectionSelect.innerHTML = sections.map(s => `<option value="${s}">${s}</option>`).join('');

  list.innerHTML = sections.map((section, sIdx) => {
    const sid = section.replace(/\W+/g, '-');
    const items = measureSections[section];
    
    // Leemos la memoria: ¿estaba esta sección en modo edición?
    const isEditing = editingMeasureSections.has(section);
    const dNoneClass = isEditing ? '' : 'd-none';

    return `
      <div class="measure-manager-group mb-3 p-2 border rounded bg-light">
        <div class="measure-manager-header d-flex justify-content-between align-items-center mb-2">
          <div class="d-flex align-items-center gap-2">
            <div class="btn-group-vertical shadow-sm">
              <button class="btn btn-sm btn-white border py-0 px-1" onclick="moveSection('${section}', 'up')" ${sIdx===0?'disabled':''}><i class="bi bi-caret-up-fill" style="font-size:0.65rem;"></i></button>
              <button class="btn btn-sm btn-white border py-0 px-1" onclick="moveSection('${section}', 'down')" ${sIdx===sections.length-1?'disabled':''}><i class="bi bi-caret-down-fill" style="font-size:0.65rem;"></i></button>
            </div>
            <strong class="small">${section}</strong>
          </div>
          <button class="btn btn-sm ${isEditing ? 'btn-primary' : 'btn-outline-primary'} btn-capsule" onclick="toggleEditSection('${section}')">
            <i class="bi ${isEditing ? 'bi-check-lg' : 'bi-pencil'}"></i> ${isEditing ? 'Listo' : 'Editar'}
          </button>
        </div>
        
        <div class="measure-manager-items d-flex flex-column gap-1" id="ms-${sid}">
          ${items.map((item, idx) => `
            <div class="d-flex align-items-center justify-content-between bg-white p-1 px-2 rounded border">
              <span class="small">${item}</span>
              <div class="${dNoneClass} measure-edit-actions">
                <div class="btn-group btn-group-sm me-2">
                  <button class="btn btn-outline-secondary py-0 px-1" onclick="moveMeasure('${section}', ${idx}, 'up')" ${idx===0?'disabled':''}><i class="bi bi-chevron-up"></i></button>
                  <button class="btn btn-outline-secondary py-0 px-1" onclick="moveMeasure('${section}', ${idx}, 'down')" ${idx===items.length-1?'disabled':''}><i class="bi bi-chevron-down"></i></button>
                </div>
                <button class="btn btn-sm btn-danger py-0 px-2" onclick="deleteMeasure('${section}', ${idx})"><i class="bi bi-trash"></i></button>
              </div>
            </div>`).join('')}
        </div>
        
        <div class="measure-manager-footer ${dNoneClass} mt-2" id="mf-${sid}">
          <button class="btn btn-sm btn-outline-danger btn-capsule w-100" onclick="deleteMeasureSection('${section}')">
            <i class="bi bi-trash"></i> Borrar Sección Completa
          </button>
        </div>
      </div>`;
  }).join('');
}

window.toggleEditSection = function(section) {
  // Guardamos o borramos de la memoria según corresponda
  if (editingMeasureSections.has(section)) {
    editingMeasureSections.delete(section);
  } else {
    editingMeasureSections.add(section);
  }
  renderMeasureManager(); // Redibujamos manteniendo lo que estaba abierto
};

window.deleteMeasureSection = function(section) {
  if (!confirm(`¿Borrar la sección "${section}"?`)) return;
  delete measureSections[section];
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
};

window.deleteMeasure = function(section, idx) {
  measureSections[section].splice(idx, 1);
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
};

document.getElementById('btn-add-new-measure')?.addEventListener('click', () => {
  const section = document.getElementById('new-measure-section')?.value;
  const valInput = document.getElementById('new-measure-value');
  const typeSelect = document.getElementById('new-measure-type');
  
  if (!valInput || !valInput.value.trim()) return showNotif('Ingrese un número o valor.');
  
  let finalMeasure = valInput.value.trim();
  if (typeSelect && typeSelect.value !== "") {
    if (typeSelect.value === '"') {
      finalMeasure = finalMeasure + typeSelect.value;
    } else {
      finalMeasure = finalMeasure + " " + typeSelect.value;
    }
  }

  if (!measureSections[section]) measureSections[section] = [];
  if (measureSections[section].includes(finalMeasure)) return showNotif('Esa medida ya existe.');
  
  measureSections[section].push(finalMeasure);
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
  valInput.value = '';
  if (typeSelect) typeSelect.value = '';
});

document.getElementById('btn-add-new-section')?.addEventListener('click', () =>
  new bootstrap.Modal(document.getElementById('newSectionModal')).show()
);

document.getElementById('btn-confirm-new-section')?.addEventListener('click', () => {
  const newSection = document.getElementById('new-section-name')?.value.trim();
  if (!newSection) return;
  if (measureSections[newSection]) return showNotif('Esa sección ya existe.');
  measureSections[newSection] = [];
  if (medidasDocId) updateDoc(doc(db, 'medidas', medidasDocId), { sections: measureSections });
  renderMeasureManager(); setupMeasureControls('p'); setupMeasureControls('e');
  document.getElementById('new-section-name').value = '';
  bootstrap.Modal.getInstance(document.getElementById('newSectionModal'))?.hide();
});

// ─── MODAL MEDIDA RÁPIDA ──────────────────
window.openMeasureSelectModal = function(productId) {
  currentMeasureProductId = productId;
  const sectionSelect = document.getElementById('measure-section-select');
  const optionSelect  = document.getElementById('measure-option-select');
  sectionSelect.innerHTML = '<option value="">Seleccionar sección...</option>' +
    Object.keys(measureSections).map(s => `<option value="${s}">${s}</option>`).join('');
  optionSelect.innerHTML = '<option value="">Seleccionar medida...</option>';
  optionSelect.disabled = true;
  new bootstrap.Modal(document.getElementById('measureSelectModal')).show();
};

document.getElementById('measure-section-select')?.addEventListener('change', function() {
  const optionSelect = document.getElementById('measure-option-select');
  if (this.value && measureSections[this.value]) {
    optionSelect.innerHTML = '<option value="">Seleccionar medida...</option>' +
      measureSections[this.value].map(m => `<option value="${m}">${m}</option>`).join('');
    optionSelect.disabled = false;
  } else {
    optionSelect.innerHTML = '<option value="">Seleccionar medida...</option>';
    optionSelect.disabled = true;
  }
});

document.getElementById('btn-confirm-measure')?.addEventListener('click', async () => {
  const measure = document.getElementById('measure-option-select')?.value;
  if (!measure || !currentMeasureProductId) return;
  try {
    await updateDoc(doc(db, 'productos', currentMeasureProductId), { measure });
    const btn = document.getElementById(`measure-btn-${currentMeasureProductId}`);
    if (btn) btn.textContent = measure;
    bootstrap.Modal.getInstance(document.getElementById('measureSelectModal'))?.hide();
  } catch { showNotif('No se pudo actualizar la medida.'); }
});

// ─── FILTROS ──────────────────────────────
document.getElementById('product-search')?.addEventListener('input', e => {
  adminSearchQuery = e.target.value.trim();
  renderAdminTable();
});

function clearAdminFilters() {
  adminCategoryFilter = ''; adminStockFilter = 'all'; adminPriceMin = ''; adminPriceMax = '';
  ['admin-filter-category','admin-price-min','admin-price-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const allRad = document.querySelector('input[name="admin-stock-filter"][value="all"]');
  if (allRad) allRad.checked = true;
  renderAdminTable();
}

document.getElementById('admin-clear-filters')?.addEventListener('click', clearAdminFilters);
document.getElementById('btn-clear-admin-filters')?.addEventListener('click', clearAdminFilters);
document.getElementById('btn-apply-admin-filters')?.addEventListener('click', () => {
  adminCategoryFilter = document.getElementById('admin-filter-category')?.value || '';
  adminStockFilter    = document.querySelector('input[name="admin-stock-filter"]:checked')?.value || 'all';
  adminPriceMin       = document.getElementById('admin-price-min')?.value.trim() || '';
  adminPriceMax       = document.getElementById('admin-price-max')?.value.trim() || '';
  renderAdminTable();
  bootstrap.Modal.getInstance(document.getElementById('adminFiltersModal'))?.hide();
});

// ─── EVENT LISTENERS COMPLEMENTARIOS ──────
document.getElementById('btn-open-categories')?.addEventListener('click', openCategoryManager);
document.getElementById('btn-open-measures')?.addEventListener('click', openMeasureManager);
document.getElementById('p-open-categories-btn')?.addEventListener('click', openCategoryManager);
document.getElementById('p-open-measures-btn')?.addEventListener('click', openMeasureManager);
document.getElementById('e-open-categories-btn')?.addEventListener('click', openCategoryManager);
document.getElementById('e-open-measures-btn')?.addEventListener('click', openMeasureManager);
document.getElementById('p-add-measure-btn')?.addEventListener('click', () => addMeasureToForm('p'));
document.getElementById('e-add-measure-btn')?.addEventListener('click', () => addMeasureToForm('e'));
document.getElementById('p-measure-section')?.addEventListener('change', () => setupMeasureControls('p'));
document.getElementById('e-measure-section')?.addEventListener('change', () => setupMeasureControls('e'));

document.addEventListener('click', e => {
  const removeBtn = e.target.closest('button.measure-chip-btn[data-prefix]');
  if (!removeBtn) return;
  const prefix = removeBtn.dataset.prefix;
  const idx    = Number(removeBtn.dataset.index);
  const target = prefix === 'p' ? productMeasures : editMeasures;
  target.splice(idx, 1);
  renderMeasureTags(prefix, target);
});

// Inicializamos el formulario base en caso de tener valores en caché
function refreshCategorySelects() {
  document.querySelectorAll('.category-select').forEach(s => {
    const cur = s.value;
    s.innerHTML = dynamicCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (dynamicCategories.includes(cur)) s.value = cur;
  });
  const adminCatFilter = document.getElementById('admin-filter-category');
  if (adminCatFilter) {
    adminCatFilter.innerHTML = '<option value="">Todas las categorías</option>' +
      dynamicCategories.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}