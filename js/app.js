// ════════════════════════════════════════════
//  FERRETERÍA LOZADA — app.js
//  Firebase Firestore + Base64 (compresión automática)
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

// ─── CONFIG ───────────────────────────────
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

// ─── STATE ────────────────────────────────
let catalogData       = [];
let cart              = [];
let currentFilter     = 'Todos';
let dynamicCategories = ['Herramientas', 'Materiales', 'Seguridad'];
const waNumber        = "593982965530";

// Edición de imagen
let editCurrentImageB64 = "";
let editNewImageB64     = "";
let editImageRemoved    = false;

// ─── COMPRIMIR IMAGEN ─────────────────────
// Redimensiona a máx 800px ancho y comprime a JPEG 75%
// Resultado siempre < 200KB aprox — seguro para Firestore
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

// ─── NAVEGACIÓN ───────────────────────────
window.switchView = function(view) {
  document.querySelectorAll('.view-section').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  const target = document.getElementById(`${view}-view`);
  if (target) {
    target.style.display = 'block';
    setTimeout(() => target.classList.add('active'), 10);
  }
  const floatCart = document.getElementById('floating-cart');
  if (floatCart) floatCart.style.display = (view === 'public') ? 'flex' : 'none';

  document.querySelectorAll('.public-link').forEach(el => {
    el.style.display = (view === 'public') ? 'block' : 'none';
  });

  if (view === 'public') renderCatalog();
  if (view === 'admin')  renderAdminTable();
};

window.handleLogoClick = function() {
  if (auth.currentUser) {
    signOut(auth).then(() => window.switchView('public'));
  } else {
    window.switchView('public');
  }
};

// ─── CATEGORÍAS ───────────────────────────
window.addNewCategory = function(selectId) {
  const name = prompt("Nombre de la nueva categoría:");
  if (name && name.trim() && !dynamicCategories.includes(name.trim())) {
    dynamicCategories.push(name.trim());
    refreshCategorySelects();
    const el = document.getElementById(selectId);
    if (el) el.value = name.trim();
  }
};

function refreshCategorySelects() {
  document.querySelectorAll('.category-select').forEach(s => {
    s.innerHTML = dynamicCategories
      .map(c => `<option value="${c}">${c}</option>`)
      .join('');
  });
  const filterBox = document.getElementById('category-filters');
  if (filterBox) {
    filterBox.innerHTML = ['Todos', ...dynamicCategories].map(c => `
      <button class="filter-btn ${currentFilter === c ? 'active' : ''}"
        onclick="filterProducts('${c}')">${c}</button>
    `).join('');
  }
}

// ─── AUTH ─────────────────────────────────
onAuthStateChanged(auth, user => {
  const adminTab = document.getElementById('nav-admin-tab');
  const logoutEl = document.getElementById('nav-logout');
  if (user) {
    adminTab?.classList.remove('d-none');
    logoutEl?.classList.remove('d-none');
    window.switchView('admin');
  } else {
    adminTab?.classList.add('d-none');
    logoutEl?.classList.add('d-none');
    window.switchView('public');
  }
});

document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();
  signInWithEmailAndPassword(
    auth,
    document.getElementById('admin-email').value,
    document.getElementById('admin-password').value
  ).then(() => {
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'))
               || new bootstrap.Modal(document.getElementById('loginModal'));
    modal.hide();
    document.getElementById('loginForm').reset();
  }).catch(() => alert("Correo o contraseña incorrectos."));
});

document.getElementById('btn-logout')?.addEventListener('click', () => signOut(auth));

// ─── FIRESTORE LISTENER ───────────────────
onSnapshot(productosRef, snapshot => {
  catalogData = [];
  snapshot.forEach(d => {
    const data = d.data();
    catalogData.push({ id: d.id, ...data });
    if (data.category && !dynamicCategories.includes(data.category)) {
      dynamicCategories.push(data.category);
    }
  });
  refreshCategorySelects();

  const loading = document.getElementById('catalog-loading');
  if (loading) loading.style.display = 'none';

  renderCatalog();
  const adminView = document.getElementById('admin-view');
  if (adminView?.style.display === 'block') renderAdminTable();

}, err => {
  console.error("Error Firestore:", err);
  const loading = document.getElementById('catalog-loading');
  if (loading) loading.innerHTML =
    '<p class="text-danger mt-3">Error al conectar. Revisa las reglas de Firestore.</p>';
});

// ─── GUARDAR NUEVO PRODUCTO ───────────────
document.getElementById('productForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('p-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

  const file = document.getElementById('p-image').files[0];
  let imageB64 = "";

  try {
    if (file) imageB64 = await compressImage(file);

    await addDoc(productosRef, {
      name:     document.getElementById('p-name').value.trim(),
      desc:     document.getElementById('p-desc').value.trim(),
      category: document.getElementById('p-category').value,
      price:    parseFloat(document.getElementById('p-price').value),
      stock:    true,
      imageB64: imageB64,
    });

    const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'))
               || new bootstrap.Modal(document.getElementById('addProductModal'));
    modal.hide();
    this.reset();

  } catch (err) {
    console.error("Error al guardar:", err);
    alert("Error al guardar. Si tiene imagen, intente con una foto más pequeña.");
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-upload me-2"></i>Guardar Producto';
});

// ─── ABRIR MODAL EDITAR ───────────────────
window.openEditModal = function(id) {
  const p = catalogData.find(x => x.id === id);
  if (!p) return;

  document.getElementById('e-id').value    = p.id;
  document.getElementById('e-name').value  = p.name  || '';
  document.getElementById('e-desc').value  = p.desc  || '';
  document.getElementById('e-price').value = p.price || '';
  document.getElementById('e-image').value = '';

  refreshCategorySelects();
  const catSel = document.getElementById('e-category');
  // Soporta campo nuevo "imageB64" y campo legado "image"
  if (catSel) catSel.value = p.category || dynamicCategories[0];

  editCurrentImageB64 = p.imageB64 || p.image || '';
  editNewImageB64     = '';
  editImageRemoved    = false;

  const preview = document.getElementById('edit-img-preview');
  if (preview) {
    preview.innerHTML = editCurrentImageB64
      ? `<img src="${editCurrentImageB64}" alt="Imagen actual">`
      : '<span class="text-muted small">Sin imagen</span>';
  }

  new bootstrap.Modal(document.getElementById('editProductModal')).show();
};

// Preview nueva imagen al editar
document.getElementById('e-image')?.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  editNewImageB64  = await compressImage(file);
  editImageRemoved = false;
  const preview = document.getElementById('edit-img-preview');
  if (preview) preview.innerHTML = `<img src="${editNewImageB64}" alt="Nueva imagen">`;
});

window.removeImageFromEdit = function() {
  editNewImageB64  = '';
  editImageRemoved = true;
  document.getElementById('e-image').value = '';
  const preview = document.getElementById('edit-img-preview');
  if (preview) preview.innerHTML =
    '<span class="badge" style="background:#fee2e2;color:#991b1b;">Imagen eliminada</span>';
};

// ─── GUARDAR CAMBIOS (EDITAR) ─────────────
document.getElementById('editProductForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const btn = document.getElementById('e-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

  const id = document.getElementById('e-id').value;

  let finalImageB64;
  if (editImageRemoved)     finalImageB64 = "";
  else if (editNewImageB64) finalImageB64 = editNewImageB64;
  else                      finalImageB64 = editCurrentImageB64;

  try {
    await updateDoc(doc(db, "productos", id), {
      name:     document.getElementById('e-name').value.trim(),
      desc:     document.getElementById('e-desc').value.trim(),
      category: document.getElementById('e-category').value,
      price:    parseFloat(document.getElementById('e-price').value),
      imageB64: finalImageB64,
    });

    bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();

  } catch (err) {
    console.error("Error al editar:", err);
    alert("Error al guardar cambios. Intenta de nuevo.");
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Cambios';
});

// ─── TOGGLE STOCK ─────────────────────────
window.toggleStock = async function(id) {
  const p = catalogData.find(x => x.id === id);
  if (p) await updateDoc(doc(db, "productos", id), { stock: !p.stock });
};

// ─── ELIMINAR PRODUCTO ────────────────────
window.deleteProduct = async function(id) {
  if (!confirm('¿Eliminar este producto de forma permanente?')) return;
  await deleteDoc(doc(db, "productos", id));
};

// ─── RENDER CATÁLOGO ──────────────────────
window.filterProducts = function(cat) {
  currentFilter = cat;
  refreshCategorySelects();
  renderCatalog();
};

// Compatibilidad campo viejo "image" y nuevo "imageB64"
function getImage(p) { return p.imageB64 || p.image || ''; }

function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const filtered = currentFilter === 'Todos'
    ? catalogData
    : catalogData.filter(p => p.category === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-box fs-1 text-muted d-block mb-3"></i>
        <p class="text-muted">No hay productos en esta categoría.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const img = getImage(p);
    const imgHTML = img
      ? `<img src="${img}" alt="${p.name}" loading="lazy">`
      : `<i class="bi bi-tools placeholder-icon"></i>`;

    const btnHTML = p.stock
      ? `<button class="btn-add-cart" onclick="addToCart('${p.id}', this)">
           <i class="bi bi-cart-plus me-2"></i>Agregar al carrito
         </button>`
      : `<button class="btn-add-cart" disabled>Sin stock</button>`;

    return `
      <div class="col-sm-6 col-lg-4">
        <div class="card product-card h-100">
          <div class="product-img-container">${imgHTML}</div>
          <div class="card-body d-flex flex-column p-3">
            <span class="product-badge mb-2">${p.category}</span>
            <h6 class="fw-bold mb-1">${p.name}</h6>
            ${p.desc ? `<p class="text-muted small mb-2" style="flex-grow:1;">${p.desc}</p>` : '<div style="flex-grow:1;"></div>'}
            <div class="mt-2">
              <p class="product-price mb-2">$${parseFloat(p.price).toFixed(2)}</p>
              ${btnHTML}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── RENDER ADMIN TABLE ───────────────────
function renderAdminTable() {
  const tbody = document.getElementById('admin-table-body');
  if (!tbody) return;

  if (catalogData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay productos. Agrega el primero.</td></tr>';
    return;
  }

  tbody.innerHTML = catalogData.map(p => {
    const img = getImage(p);
    const thumb = img
      ? `<img src="${img}" class="admin-thumb" alt="${p.name}">`
      : `<div class="admin-thumb-placeholder"><i class="bi bi-box"></i></div>`;

    const stockBtn = p.stock
      ? `<button class="stock-btn in-stock" onclick="toggleStock('${p.id}')">En Stock</button>`
      : `<button class="stock-btn out-stock" onclick="toggleStock('${p.id}')">Agotado</button>`;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            ${thumb}
            <div>
              <div class="fw-semibold" style="font-size:0.9rem;">${p.name}</div>
              ${p.desc ? `<div class="text-muted" style="font-size:0.75rem;">${p.desc.slice(0,45)}${p.desc.length>45?'...':''}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span class="product-badge">${p.category}</span></td>
        <td><span class="fw-bold">$${parseFloat(p.price).toFixed(2)}</span></td>
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
}

// ─── CARRITO ──────────────────────────────
window.addToCart = function(id, btn) {
  const p  = catalogData.find(x => x.id === id);
  const ex = cart.find(x => x.id === id);
  if (ex) ex.quantity++;
  else cart.push({ ...p, quantity: 1 });

  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>¡Agregado!';
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = '<i class="bi bi-cart-plus me-2"></i>Agregar al carrito';
    }, 900);
  }
  updateCartUI();
};

window.changeQty = function(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  updateCartUI();
};

function updateCartUI() {
  const container = document.getElementById('cart-items');
  const count     = cart.reduce((s, i) => s + i.quantity, 0);
  const countEl   = document.getElementById('floatingCartCount');
  if (countEl) countEl.innerText = count;

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-cart-x" style="font-size:2.5rem;"></i>
        <p class="mt-3 small">Tu carrito está vacío</p>
      </div>`;
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = '$0.00';
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
        <div class="flex-grow-1" style="min-width:0;">
          <div class="fw-semibold text-truncate" style="font-size:0.88rem;">${item.name}</div>
          <div class="text-muted" style="font-size:0.75rem;">$${parseFloat(item.price).toFixed(2)} c/u</div>
          <div class="d-flex align-items-center gap-2 mt-1">
            <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
            <span class="fw-bold">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          </div>
        </div>
        <div class="text-end flex-shrink-0">
          <div class="fw-bold" style="color:var(--orange);font-size:0.95rem;">
            $${(item.price * item.quantity).toFixed(2)}
          </div>
          <button class="btn btn-sm text-danger p-0 mt-1" onclick="changeQty(${idx}, -9999)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </li>`;
  }).join('');

  const total   = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
}

// ─── WHATSAPP ─────────────────────────────
document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
  if (!cart.length) return alert("Agregue productos al carrito primero.");
  let msg = "¡Hola Vecino! 👋 Cotización de Ferretería Lozada:\n\n";
  cart.forEach(i => {
    msg += `✅ ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toFixed(2)}\n`;
  });
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  msg += `\n*Total Referencial: $${total.toFixed(2)}*\n\n¿Me confirma disponibilidad?`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
});

// ─── INIT ─────────────────────────────────
refreshCategorySelects();
updateCartUI();