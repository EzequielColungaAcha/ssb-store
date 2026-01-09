// ===== CONFIGURATION =====
const CONFIG = {
  whatsappNumber: '542241470235',
  shippingCost: 500,
  freeShippingThreshold: 45000,
  storeName: 'Súper Smash Burger',
  currency: '$',
};

// Default colors for each theme
const DEFAULT_COLORS = {
  light: {
    primary: '#f97316',
    secondary: '#fbbf24',
    background: '#fafaf9',
    text: '#18181b',
  },
  dark: {
    primary: '#fb923c',
    secondary: '#fbbf24',
    background: '#18181b',
    text: '#fafafa',
  },
};

// ===== STATE =====
let products = [];
let cart = [];
let currentProduct = null;
let removedIngredients = [];
let currentCategory = 'all';
let settings = {
  theme: 'light',
  colors: {
    light: { ...DEFAULT_COLORS.light },
    dark: { ...DEFAULT_COLORS.dark },
  },
  autoOpenCart: true,
  tapToAddCart: true,
  navOnTop: false,
};

// ===== DOM ELEMENTS =====
const elements = {
  productsGrid: document.getElementById('productsGrid'),
  categoryTabs: document.getElementById('categoryTabs'),
  cartToggle: document.getElementById('cartToggle'),
  cartPanel: document.getElementById('cartPanel'),
  cartOverlay: document.getElementById('cartOverlay'),
  cartClose: document.getElementById('cartClose'),
  cartItems: document.getElementById('cartItems'),
  cartCount: document.getElementById('cartCount'),
  navCartCount: document.getElementById('navCartCount'),
  subtotal: document.getElementById('subtotal'),
  shippingRow: document.getElementById('shippingRow'),
  shippingCost: document.getElementById('shippingCost'),
  total: document.getElementById('total'),
  whatsappBtn: document.getElementById('whatsappBtn'),
  customizeModal: document.getElementById('customizeModal'),
  modalProductName: document.getElementById('modalProductName'),
  modalProductPrice: document.getElementById('modalProductPrice'),
  modalProductDescription: document.getElementById('modalProductDescription'),
  ingredientsSection: document.getElementById('ingredientsSection'),
  ingredientsList: document.getElementById('ingredientsList'),
  modalClose: document.getElementById('modalClose'),
  modalCancel: document.getElementById('modalCancel'),
  modalAdd: document.getElementById('modalAdd'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  settingsToggle: document.getElementById('settingsToggle'),
  settingsModal: document.getElementById('settingsModal'),
  settingsClose: document.getElementById('settingsClose'),
  colorPrimary: document.getElementById('colorPrimary'),
  colorSecondary: document.getElementById('colorSecondary'),
  colorBackground: document.getElementById('colorBackground'),
  colorText: document.getElementById('colorText'),
  autoOpenCart: document.getElementById('autoOpenCart'),
  tapToAddCart: document.getElementById('tapToAddCart'),
  navOnTop: document.getElementById('navOnTop'),
  resetColors: document.getElementById('resetColors'),
  toastContainer: document.getElementById('toastContainer'),
  logoImg: document.getElementById('logoImg'),
  logoText: document.getElementById('logoText'),
  bottomNav: document.getElementById('bottomNav'),
  categoriesModal: document.getElementById('categoriesModal'),
  categoriesClose: document.getElementById('categoriesClose'),
  categoriesList: document.getElementById('categoriesList'),
  navThemeIcon: document.getElementById('navThemeIcon'),
  navLogoImg: document.getElementById('navLogoImg'),
  desktopCategoryTabs: document.getElementById('desktopCategoryTabs'),
};

// ===== UTILITY FUNCTIONS =====
function formatPrice(price) {
  return CONFIG.currency + price.toLocaleString('es-AR');
}

function generateCartItemId() {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Toast state for stacking
let toasts = [];
let toastIdCounter = 0;

function showToast(message, duration = 3000) {
  const id = ++toastIdCounter;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast entering';
  toast.dataset.toastId = id;
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon icon"><use href="#icon-check"/></svg>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" aria-label="Cerrar">
      <svg class="icon"><use href="#icon-x"/></svg>
    </button>
  `;

  // Add to DOM
  elements.toastContainer.appendChild(toast);

  // Add to state
  toasts.unshift({ id, element: toast, timeoutId: null });

  // Update positions
  updateToastPositions();

  // Remove entering class after animation
  setTimeout(() => {
    toast.classList.remove('entering');
  }, 350);

  // Set up auto-dismiss
  const timeoutId = setTimeout(() => {
    dismissToast(id);
  }, duration);

  // Store timeout ID
  const toastData = toasts.find((t) => t.id === id);
  if (toastData) toastData.timeoutId = timeoutId;

  // Pause on hover
  toast.addEventListener('mouseenter', () => {
    const data = toasts.find((t) => t.id === id);
    if (data?.timeoutId) {
      clearTimeout(data.timeoutId);
      data.timeoutId = null;
    }
  });

  toast.addEventListener('mouseleave', () => {
    const data = toasts.find((t) => t.id === id);
    if (data && !data.timeoutId) {
      data.timeoutId = setTimeout(() => {
        dismissToast(id);
      }, 2000);
    }
  });

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    dismissToast(id);
  });

  return id;
}

function dismissToast(id) {
  const index = toasts.findIndex((t) => t.id === id);
  if (index === -1) return;

  const { element, timeoutId } = toasts[index];

  // Clear timeout
  if (timeoutId) clearTimeout(timeoutId);

  // Add exit animation
  element.classList.add('exiting');

  // Remove from state
  toasts.splice(index, 1);

  // Update positions for remaining toasts
  updateToastPositions();

  // Remove from DOM after animation
  setTimeout(() => {
    element.remove();
  }, 200);
}

function updateToastPositions() {
  toasts.forEach((toast, index) => {
    toast.element.style.setProperty('--toast-index', index);
  });
}

// ===== SETTINGS & THEME =====
function loadSettings() {
  const saved = localStorage.getItem('customerStoreSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      settings = {
        theme: parsed.theme || 'light',
        colors: {
          light: { ...DEFAULT_COLORS.light, ...parsed.colors?.light },
          dark: { ...DEFAULT_COLORS.dark, ...parsed.colors?.dark },
        },
        autoOpenCart:
          parsed.autoOpenCart !== undefined ? parsed.autoOpenCart : true,
        tapToAddCart:
          parsed.tapToAddCart !== undefined ? parsed.tapToAddCart : true,
        navOnTop: parsed.navOnTop !== undefined ? parsed.navOnTop : false,
      };
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }

  applyTheme();
  applyColors();
  applyNavPosition();
  updateSettingsUI();
}

function saveSettings() {
  localStorage.setItem('customerStoreSettings', JSON.stringify(settings));
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme);

  // Update theme icons (SVG) - both header and nav
  const iconHref = settings.theme === 'light' ? '#icon-moon' : '#icon-sun';
  if (elements.themeIcon) {
    elements.themeIcon.innerHTML = `<use href="${iconHref}"/>`;
  }
  if (elements.navThemeIcon) {
    elements.navThemeIcon.innerHTML = `<use href="${iconHref}"/>`;
  }

  // Update active state in settings
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === settings.theme);
  });
}

function applyColors() {
  const colors = settings.colors[settings.theme];
  const root = document.documentElement;

  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--text', colors.text);

  // Derive additional colors
  root.style.setProperty('--primary-dark', adjustColor(colors.primary, -20));
  root.style.setProperty('--primary-light', adjustColor(colors.primary, 40));
  root.style.setProperty('--text-muted', adjustColor(colors.text, 60));
  root.style.setProperty('--text-light', adjustColor(colors.text, 100));
  root.style.setProperty(
    '--border',
    settings.theme === 'light'
      ? adjustColor(colors.background, -15)
      : adjustColor(colors.background, 25)
  );
  root.style.setProperty(
    '--border-light',
    settings.theme === 'light'
      ? adjustColor(colors.background, -8)
      : adjustColor(colors.background, 15)
  );
  root.style.setProperty(
    '--surface',
    settings.theme === 'light' ? '#ffffff' : adjustColor(colors.background, 12)
  );
  root.style.setProperty(
    '--surface-elevated',
    settings.theme === 'light' ? '#ffffff' : adjustColor(colors.background, 20)
  );
}

function applyNavPosition() {
  document.documentElement.setAttribute(
    'data-nav-position',
    settings.navOnTop ? 'top' : 'bottom'
  );
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function updateSettingsUI() {
  const colors = settings.colors[settings.theme];
  elements.colorPrimary.value = colors.primary;
  elements.colorSecondary.value = colors.secondary;
  elements.colorBackground.value = colors.background;
  elements.colorText.value = colors.text;
  elements.autoOpenCart.checked = settings.autoOpenCart;
  elements.tapToAddCart.checked = settings.tapToAddCart;
  elements.navOnTop.checked = settings.navOnTop;
}

function toggleTheme() {
  settings.theme = settings.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  applyColors();
  updateSettingsUI();
  saveSettings();
}

function setTheme(theme) {
  settings.theme = theme;
  applyTheme();
  applyColors();
  updateSettingsUI();
  saveSettings();
}

function updateColor(colorKey, value) {
  settings.colors[settings.theme][colorKey] = value;
  applyColors();
  saveSettings();
}

function resetColors() {
  settings.colors[settings.theme] = { ...DEFAULT_COLORS[settings.theme] };
  applyColors();
  updateSettingsUI();
  saveSettings();
  showToast('Colores restablecidos');
}

function openSettings() {
  elements.settingsModal.classList.add('active');
}

function closeSettings() {
  elements.settingsModal.classList.remove('active');
}

// ===== LOGO =====
function initLogo() {
  // Header logo (desktop)
  if (elements.logoImg) {
    elements.logoImg.onerror = () => {
      elements.logoImg.style.display = 'none';
    };
  }
  // Nav logo (mobile)
  if (elements.navLogoImg) {
    elements.navLogoImg.onerror = () => {
      elements.navLogoImg.style.display = 'none';
      if (elements.navLogoText) {
        elements.navLogoText.style.display = 'block';
      }
    };
  }
}

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('Failed to load products');
    products = await response.json();
    renderCategories();
    renderCategoriesModal();
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    elements.productsGrid.innerHTML = `
      <div class="loading">
        <p>No se pudieron cargar los productos.</p>
        <p>Asegurate de que el archivo products.json esté en la misma carpeta.</p>
      </div>
    `;
  }
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const categories = [...new Set(products.map((p) => p.category))];

  const tabsHtml = `
    <button class="category-tab ${
      currentCategory === 'all' ? 'active' : ''
    }" data-category="all">Todos</button>
    ${categories
      .map(
        (cat) => `
      <button class="category-tab ${
        currentCategory === cat ? 'active' : ''
      }" data-category="${cat}">${capitalizeFirst(cat)}</button>
    `
      )
      .join('')}
  `;

  // Render to mobile filter bar
  elements.categoryTabs.innerHTML = tabsHtml;
  elements.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      selectCategory(tab.dataset.category);
    });
  });

  // Render to desktop inline tabs
  if (elements.desktopCategoryTabs) {
    elements.desktopCategoryTabs.innerHTML = tabsHtml;
    elements.desktopCategoryTabs
      .querySelectorAll('.category-tab')
      .forEach((tab) => {
        tab.addEventListener('click', () => {
          selectCategory(tab.dataset.category);
        });
      });
  }
}

function renderCategoriesModal() {
  const categories = [...new Set(products.map((p) => p.category))];

  elements.categoriesList.innerHTML = `
    <button class="category-list-item ${
      currentCategory === 'all' ? 'active' : ''
    }" data-category="all">
      Todos los productos
    </button>
    ${categories
      .map(
        (cat) => `
      <button class="category-list-item ${
        currentCategory === cat ? 'active' : ''
      }" data-category="${cat}">
        ${capitalizeFirst(cat)}
      </button>
    `
      )
      .join('')}
  `;

  elements.categoriesList
    .querySelectorAll('.category-list-item')
    .forEach((item) => {
      item.addEventListener('click', () => {
        selectCategory(item.dataset.category);
        closeCategoriesModal();
      });
    });
}

function selectCategory(category) {
  currentCategory = category;

  // Update mobile filter bar tabs
  elements.categoryTabs.querySelectorAll('.category-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });

  // Update desktop inline tabs
  if (elements.desktopCategoryTabs) {
    elements.desktopCategoryTabs
      .querySelectorAll('.category-tab')
      .forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.category === category);
      });
  }

  // Update modal list
  if (elements.categoriesList) {
    elements.categoriesList
      .querySelectorAll('.category-list-item')
      .forEach((item) => {
        item.classList.toggle('active', item.dataset.category === category);
      });
  }

  renderProducts(category);
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== RENDER PRODUCTS =====
function renderProducts(category = currentCategory) {
  const filtered =
    category === 'all'
      ? products
      : products.filter((p) => p.category === category);

  if (filtered.length === 0) {
    elements.productsGrid.innerHTML =
      '<div class="loading">No hay productos en esta categoría</div>';
    return;
  }

  // Determine button icon based on tapToAddCart setting
  const buttonIcon = settings.tapToAddCart ? '#icon-info' : '#icon-plus';
  const buttonTitle = settings.tapToAddCart
    ? 'Ver detalles'
    : 'Agregar al carrito';

  elements.productsGrid.innerHTML = filtered
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}">
      <button class="product-action-btn" data-id="${
        product.id
      }" title="${buttonTitle}">
        <svg class="icon"><use href="${buttonIcon}"/></svg>
      </button>
      <div class="product-name">${product.name}</div>
      ${
        product.description
          ? `<div class="product-description">${product.description}</div>`
          : ''
      }
      <div class="product-price">${formatPrice(product.price)}</div>
      ${
        product.ingredients && product.ingredients.length > 0
          ? `<div class="product-customize"><svg class="icon"><use href="#icon-sparkles"/></svg> Personalizable</div>`
          : ''
      }
    </div>
  `
    )
    .join('');

  // Add event listeners
  elements.productsGrid.querySelectorAll('.product-card').forEach((card) => {
    const productId = card.dataset.id;
    const product = products.find((p) => p.id === productId);

    // Action button click
    const actionBtn = card.querySelector('.product-action-btn');
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (product) {
        if (settings.tapToAddCart) {
          openCustomizeModal(product);
        } else {
          quickAddToCart(product);
        }
      }
    });

    // Card click
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-action-btn')) return;

      if (product) {
        if (settings.tapToAddCart) {
          quickAddToCart(product);
        } else {
          openCustomizeModal(product);
        }
      }
    });
  });
}

// Quick add without modal
function quickAddToCart(product) {
  addToCart(product, []);

  if (settings.autoOpenCart) {
    openCart();
  } else {
    showToast(`${product.name} agregado`);
  }
}

// ===== CUSTOMIZE MODAL =====
function openCustomizeModal(product) {
  currentProduct = product;
  removedIngredients = [];

  elements.modalProductName.textContent = product.name;
  elements.modalProductPrice.textContent = formatPrice(product.price);
  elements.modalProductDescription.textContent = product.description || '';

  if (product.ingredients && product.ingredients.length > 0) {
    elements.ingredientsSection.style.display = 'block';
    elements.ingredientsList.innerHTML = product.ingredients
      .map(
        (ing) => `
      <div class="ingredient-item" data-id="${ing.id}">
        <div class="ingredient-checkbox">
          <svg class="icon"><use href="#icon-x"/></svg>
        </div>
        <span class="ingredient-name">${ing.name}</span>
      </div>
    `
      )
      .join('');

    elements.ingredientsList
      .querySelectorAll('.ingredient-item')
      .forEach((item) => {
        item.addEventListener('click', () => {
          item.classList.toggle('removed');
          const ingId = item.dataset.id;
          if (item.classList.contains('removed')) {
            if (!removedIngredients.includes(ingId)) {
              removedIngredients.push(ingId);
            }
          } else {
            removedIngredients = removedIngredients.filter(
              (id) => id !== ingId
            );
          }
        });
      });
  } else {
    elements.ingredientsSection.style.display = 'none';
  }

  elements.customizeModal.classList.add('active');
}

function closeCustomizeModal() {
  elements.customizeModal.classList.remove('active');
  currentProduct = null;
  removedIngredients = [];
}

function addToCartFromModal() {
  if (!currentProduct) return;

  const removedNames = removedIngredients
    .map((id) => {
      const ing = currentProduct.ingredients?.find((i) => i.id === id);
      return ing ? ing.name : '';
    })
    .filter(Boolean);

  addToCart(currentProduct, removedNames);
  closeCustomizeModal();

  if (settings.autoOpenCart) {
    openCart();
  } else {
    showToast(`${currentProduct.name} agregado`);
  }
}

// ===== CATEGORIES MODAL =====
function openCategoriesModal() {
  renderCategoriesModal();
  elements.categoriesModal.classList.add('active');
}

function closeCategoriesModal() {
  elements.categoriesModal.classList.remove('active');
}

// ===== CART FUNCTIONS =====
function addToCart(product, removedIngredients = []) {
  const removedKey = removedIngredients.sort().join(',');
  const existing = cart.find(
    (item) =>
      item.productId === product.id &&
      item.removedIngredients.sort().join(',') === removedKey
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: generateCartItemId(),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      removedIngredients,
    });
  }

  updateCart();
}

function removeFromCart(itemId) {
  cart = cart.filter((item) => item.id !== itemId);
  updateCart();
}

function updateQuantity(itemId, delta) {
  const item = cart.find((i) => i.id === itemId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(itemId);
  } else {
    updateCart();
  }
}

function updateCart() {
  renderCartItems();
  updateCartSummary();
  updateCartCount();
}

function renderCartItems() {
  if (cart.length === 0) {
    elements.cartItems.innerHTML =
      '<p class="cart-empty">Tu carrito está vacío</p>';
    return;
  }

  elements.cartItems.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        ${
          item.removedIngredients.length > 0
            ? `<div class="cart-item-mods">Sin: ${item.removedIngredients.join(
                ', '
              )}</div>`
            : ''
        }
        <div class="cart-item-price">${formatPrice(
          item.price * item.quantity
        )}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">
          <svg class="icon"><use href="#icon-minus"/></svg>
        </button>
        <span class="cart-item-qty">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">
          <svg class="icon"><use href="#icon-plus"/></svg>
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

function updateCartSummary() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const isDelivery =
    document.querySelector('input[name="delivery"]:checked')?.value ===
    'delivery';

  let shipping = 0;
  if (isDelivery) {
    shipping =
      subtotal >= CONFIG.freeShippingThreshold ? 0 : CONFIG.shippingCost;
    elements.shippingRow.style.display = 'flex';
    elements.shippingCost.textContent =
      shipping === 0 ? 'Gratis' : formatPrice(shipping);
  } else {
    elements.shippingRow.style.display = 'none';
  }

  const total = subtotal + shipping;

  elements.subtotal.textContent = formatPrice(subtotal);
  elements.total.textContent = formatPrice(total);
  elements.whatsappBtn.disabled = cart.length === 0;
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = count;
  elements.navCartCount.textContent = count;

  // Update badge visibility
  if (count === 0) {
    elements.cartCount.style.display = 'none';
    elements.navCartCount.style.display = 'none';
  } else {
    elements.cartCount.style.display = 'flex';
    elements.navCartCount.style.display = 'flex';
  }
}

// ===== CART PANEL =====
function openCart() {
  elements.cartPanel.classList.add('active');
  elements.cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  elements.cartPanel.classList.remove('active');
  elements.cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== BOTTOM NAV =====
function updateNavActiveState(navItem) {
  elements.bottomNav.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === navItem);
  });
}

function handleNavClick(navItem) {
  switch (navItem) {
    case 'home':
      selectCategory('all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'theme':
      toggleTheme();
      break;
    case 'cart':
      openCart();
      break;
    case 'settings':
      openSettings();
      break;
  }
}

// ===== WHATSAPP =====
function sendToWhatsApp() {
  if (cart.length === 0) return;

  const isDelivery =
    document.querySelector('input[name="delivery"]:checked')?.value ===
    'delivery';
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  let shipping = 0;
  if (isDelivery) {
    shipping =
      subtotal >= CONFIG.freeShippingThreshold ? 0 : CONFIG.shippingCost;
  }
  const total = subtotal + shipping;

  let message = `*Nuevo Pedido - ${CONFIG.storeName}*\n\n`;

  cart.forEach((item) => {
    message += `${item.quantity}x ${item.name} - ${formatPrice(
      item.price * item.quantity
    )}\n`;
    if (item.removedIngredients.length > 0) {
      message += `   _Sin: ${item.removedIngredients.join(', ')}_\n`;
    }
  });

  message += `\n*Subtotal:* ${formatPrice(subtotal)}`;

  if (isDelivery) {
    message += `\n*Envío:* ${
      shipping === 0 ? 'Gratis' : formatPrice(shipping)
    }`;
  }

  message += `\n*Total:* ${formatPrice(total)}`;
  message += `\n\n*Tipo:* ${isDelivery ? 'Delivery' : 'Retiro en local'}`;

  if (isDelivery) {
    message += `\n\n*Dirección:* (completar)`;
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Cart toggle
  elements.cartToggle.addEventListener('click', openCart);
  elements.cartClose.addEventListener('click', closeCart);
  elements.cartOverlay.addEventListener('click', closeCart);

  // Customize Modal
  elements.modalClose.addEventListener('click', closeCustomizeModal);
  elements.modalCancel.addEventListener('click', closeCustomizeModal);
  elements.modalAdd.addEventListener('click', addToCartFromModal);

  // WhatsApp
  elements.whatsappBtn.addEventListener('click', sendToWhatsApp);

  // Delivery toggle
  document.querySelectorAll('input[name="delivery"]').forEach((radio) => {
    radio.addEventListener('change', updateCartSummary);
  });

  // Close customize modal on overlay click
  elements.customizeModal.addEventListener('click', (e) => {
    if (e.target === elements.customizeModal) {
      closeCustomizeModal();
    }
  });

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Settings
  elements.settingsToggle?.addEventListener('click', openSettings);
  elements.settingsClose.addEventListener('click', closeSettings);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      closeSettings();
    }
  });

  // Categories Modal
  elements.categoriesClose.addEventListener('click', closeCategoriesModal);
  elements.categoriesModal.addEventListener('click', (e) => {
    if (e.target === elements.categoriesModal) {
      closeCategoriesModal();
    }
  });

  // Theme options in settings
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  // Color pickers
  elements.colorPrimary.addEventListener('input', (e) =>
    updateColor('primary', e.target.value)
  );
  elements.colorSecondary.addEventListener('input', (e) =>
    updateColor('secondary', e.target.value)
  );
  elements.colorBackground.addEventListener('input', (e) =>
    updateColor('background', e.target.value)
  );
  elements.colorText.addEventListener('input', (e) =>
    updateColor('text', e.target.value)
  );

  // Auto open cart toggle
  elements.autoOpenCart.addEventListener('change', (e) => {
    settings.autoOpenCart = e.target.checked;
    saveSettings();
  });

  // Tap to add cart toggle
  elements.tapToAddCart.addEventListener('change', (e) => {
    settings.tapToAddCart = e.target.checked;
    saveSettings();
    renderProducts();
  });

  // Nav on top toggle
  elements.navOnTop.addEventListener('change', (e) => {
    settings.navOnTop = e.target.checked;
    applyNavPosition();
    saveSettings();
  });

  // Reset colors
  elements.resetColors.addEventListener('click', resetColors);

  // Bottom nav
  elements.bottomNav.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      handleNavClick(item.dataset.nav);
    });
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomizeModal();
      closeCart();
      closeSettings();
      closeCategoriesModal();
    }
  });
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initLogo();
  loadProducts();
  initEventListeners();
  updateCartCount();
});

// Make functions available globally for inline onclick handlers
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
