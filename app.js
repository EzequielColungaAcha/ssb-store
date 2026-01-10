// ===== CONFIGURATION =====
const CONFIG = {
  whatsappNumber: '542241470235',
  shippingCost: 500,
  freeShippingThreshold: 45000,
  storeName: 'Súper Smash Burger',
  currency: '$',
  // Operating hours configuration
  operatingHours: {
    enabled: true,
    startHour: 20, // 8 PM
    endHour: 24, // Midnight (use 24 for midnight, or 0 for next day)
    timezone: 'America/Argentina/Buenos_Aires',
    // Days of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Example: [4, 5, 6] = Thursday, Friday, Saturday
    operatingDays: [0, 1, 2, 3, 4, 5, 6], // All days by default
  },
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
let combos = [];
let cart = [];
let currentProduct = null;
let currentCombo = null;
let comboSelections = [];
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
  addressInput: document.getElementById('addressInput'),
  deliveryAddress: document.getElementById('deliveryAddress'),
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
  // Combo modal elements
  comboModal: document.getElementById('comboModal'),
  comboModalName: document.getElementById('comboModalName'),
  comboModalPrice: document.getElementById('comboModalPrice'),
  comboModalDescription: document.getElementById('comboModalDescription'),
  comboSlots: document.getElementById('comboSlots'),
  comboModalClose: document.getElementById('comboModalClose'),
  comboModalCancel: document.getElementById('comboModalCancel'),
  comboModalAdd: document.getElementById('comboModalAdd'),
};

// ===== UTILITY FUNCTIONS =====
function formatPrice(price) {
  return CONFIG.currency + price.toLocaleString('es-AR');
}

function generateCartItemId() {
  return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ===== OPERATING HOURS =====
function isWithinOperatingHours() {
  if (!CONFIG.operatingHours.enabled) {
    return true;
  }

  const { startHour, endHour, timezone, operatingDays } = CONFIG.operatingHours;

  // Get current time in Argentina timezone
  const now = new Date();
  const argentinaTime = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  );
  const currentHour = argentinaTime.getHours();
  const currentDay = argentinaTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Check if current day is an operating day
  if (operatingDays && operatingDays.length > 0) {
    if (!operatingDays.includes(currentDay)) {
      return false;
    }
  }

  // Handle cases like 20:00 - 24:00 (endHour = 24 means midnight)
  if (endHour === 24 || endHour === 0) {
    return currentHour >= startHour;
  }

  // Handle normal range (e.g., 10:00 - 22:00)
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }

  // Handle overnight range (e.g., 20:00 - 02:00)
  return currentHour >= startHour || currentHour < endHour;
}

function formatOperatingHours() {
  const { startHour, endHour, operatingDays } = CONFIG.operatingHours;

  const formatHour = (h) => {
    if (h === 24 || h === 0) return '00:00';
    return `${h.toString().padStart(2, '0')}:00`;
  };

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Format days
  let daysStr = '';
  if (operatingDays && operatingDays.length > 0 && operatingDays.length < 7) {
    const sortedDays = [...operatingDays].sort((a, b) => a - b);

    // Check if days are consecutive
    const isConsecutive = sortedDays.every((day, i) => {
      if (i === 0) return true;
      return day === sortedDays[i - 1] + 1;
    });

    if (isConsecutive && sortedDays.length > 2) {
      // Show as range (e.g., "Jue-Sáb")
      daysStr = `${dayNames[sortedDays[0]]}-${
        dayNames[sortedDays[sortedDays.length - 1]]
      } `;
    } else {
      // Show as list (e.g., "Jue, Vie, Sáb")
      daysStr = sortedDays.map((d) => dayNames[d]).join(', ') + ' ';
    }
  }

  return `${daysStr}${formatHour(startHour)} a ${formatHour(endHour)}`;
}

function updateWhatsAppButtonState() {
  if (!CONFIG.operatingHours.enabled) {
    return;
  }

  const isOpen = isWithinOperatingHours();
  const btn = elements.whatsappBtn;

  if (!btn) return;

  if (isOpen) {
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.title = '';
    // Remove any closed message
    const closedMsg = document.getElementById('closedMessage');
    if (closedMsg) closedMsg.remove();
  } else {
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.title = `Pedidos disponibles de ${formatOperatingHours()}`;

    // Add closed message if not exists
    if (!document.getElementById('closedMessage')) {
      const msg = document.createElement('div');
      msg.id = 'closedMessage';
      msg.className = 'closed-message';
      msg.innerHTML = `<svg class="icon"><use href="#icon-x"/></svg> Pedidos disponibles de ${formatOperatingHours()}`;
      btn.parentNode.insertBefore(msg, btn);
    }
  }
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

// ===== ADDRESS =====
function loadAddress() {
  const savedAddress = localStorage.getItem('deliveryAddress');
  if (savedAddress && elements.deliveryAddress) {
    elements.deliveryAddress.value = savedAddress;
  }
}

function updateAddressVisibility() {
  const isDelivery =
    document.querySelector('input[name="delivery"]:checked')?.value ===
    'delivery';
  if (elements.addressInput) {
    elements.addressInput.style.display = isDelivery ? 'block' : 'none';
  }
}

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  try {
    // Add cache-busting timestamp to prevent stale data
    const response = await fetch(`products.json?t=${Date.now()}`);
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

// ===== LOAD COMBOS =====
async function loadCombos() {
  try {
    // Add cache-busting timestamp to prevent stale data
    const response = await fetch(`combos.json?t=${Date.now()}`);
    if (!response.ok) {
      // Combos file might not exist, that's ok
      combos = [];
      return;
    }
    combos = await response.json();
    // Re-render categories to include Combos if we have any
    if (combos.length > 0) {
      renderCategories();
      renderCategoriesModal();
    }
  } catch (error) {
    console.error('Error loading combos:', error);
    combos = [];
  }
}

// Category display order
const CATEGORY_ORDER = ['combos', 'hamburguesas', 'papas fritas', 'bebidas'];

function sortCategories(categories) {
  return categories.sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.toLowerCase());
    const bIndex = CATEGORY_ORDER.indexOf(b.toLowerCase());
    // If not in order list, put at end
    const aOrder = aIndex === -1 ? 999 : aIndex;
    const bOrder = bIndex === -1 ? 999 : bIndex;
    return aOrder - bOrder;
  });
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const categories = [...new Set(products.map((p) => p.category))];

  // Add Combos category if we have combos
  const allCategories =
    combos.length > 0 ? ['combos', ...categories] : categories;

  // Sort categories by defined order
  const sortedCategories = sortCategories([...allCategories]);

  const tabsHtml = `
    <button class="category-tab ${
      currentCategory === 'all' ? 'active' : ''
    }" data-category="all">Todos</button>
    ${sortedCategories
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

  // Add Combos category if we have combos
  const allCategories =
    combos.length > 0 ? ['combos', ...categories] : categories;

  // Sort categories by defined order
  const sortedCategories = sortCategories([...allCategories]);

  elements.categoriesList.innerHTML = `
    <button class="category-list-item ${
      currentCategory === 'all' ? 'active' : ''
    }" data-category="all">
      Todos los productos
    </button>
    ${sortedCategories
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

// Sort products by category order
function sortProductsByCategory(productList) {
  return [...productList].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.category.toLowerCase());
    const bIndex = CATEGORY_ORDER.indexOf(b.category.toLowerCase());
    const aOrder = aIndex === -1 ? 999 : aIndex;
    const bOrder = bIndex === -1 ? 999 : bIndex;
    return aOrder - bOrder;
  });
}

// ===== RENDER PRODUCTS =====
function renderProducts(category = currentCategory) {
  // Handle combos category
  if (category === 'combos') {
    renderCombosGrid();
    return;
  }

  const filtered =
    category === 'all'
      ? sortProductsByCategory(products)
      : products.filter((p) => p.category === category);

  // For 'all' category, also include combos if any
  const includeCombos = category === 'all' && combos.length > 0;

  if (filtered.length === 0 && !includeCombos) {
    elements.productsGrid.innerHTML =
      '<div class="loading">No hay productos en esta categoría</div>';
    return;
  }

  // Determine button icon based on tapToAddCart setting
  const buttonIcon = settings.tapToAddCart ? '#icon-info' : '#icon-plus';
  const buttonTitle = settings.tapToAddCart
    ? 'Ver detalles'
    : 'Agregar al carrito';

  let html = '';

  // Add combos first when showing 'all'
  if (includeCombos) {
    html += combos
      .map(
        (combo) => `
      <div class="product-card combo-card" data-combo-id="${combo.id}">
        <div class="combo-badge">COMBO</div>
        <div class="product-name">${combo.name}</div>
        ${
          combo.description
            ? `<div class="product-description">${combo.description}</div>`
            : ''
        }
        <div class="product-price">${getComboDisplayPrice(combo)}</div>
        <div class="product-customize"><svg class="icon"><use href="#icon-layers"/></svg> ${
          combo.slots.length
        } productos</div>
      </div>
    `
      )
      .join('');
  }

  // Add products (already sorted by category)
  html += filtered
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

  elements.productsGrid.innerHTML = html;

  // Add event listeners for products
  elements.productsGrid
    .querySelectorAll('.product-card:not(.combo-card)')
    .forEach((card) => {
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

  // Add event listeners for combos
  elements.productsGrid.querySelectorAll('.combo-card').forEach((card) => {
    const comboId = card.dataset.comboId;
    const combo = combos.find((c) => c.id === comboId);

    card.addEventListener('click', () => {
      if (combo) {
        openComboModal(combo);
      }
    });
  });
}

// Render only combos
function renderCombosGrid() {
  if (combos.length === 0) {
    elements.productsGrid.innerHTML =
      '<div class="loading">No hay combos disponibles</div>';
    return;
  }

  elements.productsGrid.innerHTML = combos
    .map(
      (combo) => `
    <div class="product-card combo-card" data-combo-id="${combo.id}">
      <div class="combo-badge">COMBO</div>
      <div class="product-name">${combo.name}</div>
      ${
        combo.description
          ? `<div class="product-description">${combo.description}</div>`
          : ''
      }
      <div class="product-price">${getComboDisplayPrice(combo)}</div>
      <div class="product-customize"><svg class="icon"><use href="#icon-layers"/></svg> ${
        combo.slots.length
      } productos</div>
    </div>
  `
    )
    .join('');

  // Add event listeners
  elements.productsGrid.querySelectorAll('.combo-card').forEach((card) => {
    const comboId = card.dataset.comboId;
    const combo = combos.find((c) => c.id === comboId);

    card.addEventListener('click', () => {
      if (combo) {
        openComboModal(combo);
      }
    });
  });
}

// Get display price for combo
function getComboDisplayPrice(combo) {
  if (combo.price_type === 'fixed') {
    return formatPrice(combo.fixed_price || 0);
  }
  // For calculated, show discount
  if (combo.discount_type === 'percentage') {
    return `-${combo.discount_value}%`;
  }
  return `-${formatPrice(combo.discount_value || 0)}`;
}

// Calculate actual combo price based on selections
function calculateComboPrice(combo, selections) {
  if (combo.price_type === 'fixed') {
    return combo.fixed_price || 0;
  }

  // Calculate sum of selected products
  let total = 0;
  for (const selection of selections) {
    total += selection.productPrice || 0;
  }

  // Apply discount
  if (combo.discount_type === 'percentage' && combo.discount_value) {
    total = total * (1 - combo.discount_value / 100);
  } else if (combo.discount_type === 'fixed' && combo.discount_value) {
    total = Math.max(0, total - combo.discount_value);
  }

  return Math.round(total);
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

// ===== COMBO MODAL =====
function openComboModal(combo) {
  currentCombo = combo;

  // Initialize selections with defaults
  comboSelections = [];
  for (const slot of combo.slots) {
    const defaultProduct = slot.products.find(
      (p) => p.id === slot.default_product_id
    );
    for (let i = 0; i < slot.quantity; i++) {
      comboSelections.push({
        slotId: slot.id,
        slotName: slot.name,
        productId: defaultProduct?.id || slot.products[0]?.id || '',
        productName: defaultProduct?.name || slot.products[0]?.name || '',
        productPrice: defaultProduct?.price || slot.products[0]?.price || 0,
        removedIngredients: [],
      });
    }
  }

  renderComboModal();
  elements.comboModal.classList.add('active');
}

function renderComboModal() {
  if (!currentCombo) return;

  const price = calculateComboPrice(currentCombo, comboSelections);

  elements.comboModalName.textContent = currentCombo.name;
  elements.comboModalPrice.textContent = formatPrice(price);
  elements.comboModalDescription.textContent = currentCombo.description || '';

  // Render slots
  let slotsHtml = '';
  let selectionIndex = 0;

  for (const slot of currentCombo.slots) {
    for (let i = 0; i < slot.quantity; i++) {
      const selection = comboSelections[selectionIndex];
      const selectedProduct = slot.products.find(
        (p) => p.id === selection?.productId
      );

      slotsHtml += `
        <div class="combo-slot" data-slot-id="${
          slot.id
        }" data-index="${selectionIndex}">
          <div class="combo-slot-header">
            <span class="combo-slot-name">${slot.name}${
        slot.quantity > 1 ? ` (${i + 1})` : ''
      }</span>
          </div>
          ${
            slot.is_dynamic && slot.products.length > 1
              ? `
            <select class="combo-slot-select" data-selection-index="${selectionIndex}">
              ${slot.products
                .map(
                  (p) => `
                <option value="${p.id}" ${
                    p.id === selection?.productId ? 'selected' : ''
                  }>
                  ${p.name} - ${formatPrice(p.price)}
                </option>
              `
                )
                .join('')}
            </select>
          `
              : `<div class="combo-slot-product">${
                  selection?.productName || ''
                }</div>`
          }
          ${
            selectedProduct?.ingredients?.length > 0
              ? `
            <div class="combo-slot-ingredients">
              <div class="combo-ingredients-label">Quitar:</div>
              ${selectedProduct.ingredients
                .map(
                  (ing) => `
                <button class="combo-ingredient-btn ${
                  selection?.removedIngredients?.includes(ing.name)
                    ? 'removed'
                    : ''
                }" 
                        data-selection-index="${selectionIndex}" 
                        data-ingredient="${ing.name}">
                  ${ing.name}
                </button>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      `;
      selectionIndex++;
    }
  }

  elements.comboSlots.innerHTML = slotsHtml;

  // Add event listeners for selects
  elements.comboSlots
    .querySelectorAll('.combo-slot-select')
    .forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.selectionIndex);
        const productId = e.target.value;

        // Find the slot and product
        const selection = comboSelections[idx];
        const slot = currentCombo.slots.find((s) => s.id === selection.slotId);
        const product = slot?.products.find((p) => p.id === productId);

        if (product) {
          comboSelections[idx] = {
            ...selection,
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            removedIngredients: [],
          };
          renderComboModal();
        }
      });
    });

  // Add event listeners for ingredient buttons
  elements.comboSlots
    .querySelectorAll('.combo-ingredient-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.selectionIndex);
        const ingredientName = btn.dataset.ingredient;

        const selection = comboSelections[idx];
        if (selection.removedIngredients.includes(ingredientName)) {
          selection.removedIngredients = selection.removedIngredients.filter(
            (i) => i !== ingredientName
          );
        } else {
          selection.removedIngredients.push(ingredientName);
        }
        renderComboModal();
      });
    });
}

function closeComboModal() {
  elements.comboModal.classList.remove('active');
  currentCombo = null;
  comboSelections = [];
}

function addComboToCart() {
  if (!currentCombo) return;

  const price = calculateComboPrice(currentCombo, comboSelections);

  const comboCartItem = {
    id: generateCartItemId(),
    name: currentCombo.name,
    price: price,
    quantity: 1,
    isCombo: true,
    comboId: currentCombo.id,
    comboSelections: [...comboSelections],
  };

  cart.push(comboCartItem);
  updateCart();
  closeComboModal();

  if (settings.autoOpenCart) {
    openCart();
  } else {
    showToast(`${currentCombo.name} agregado`);
  }
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
    <div class="cart-item ${item.isCombo ? 'cart-item-combo' : ''}">
      <div class="cart-item-info">
        <div class="cart-item-name">
          ${item.name}
          ${item.isCombo ? '<span class="cart-combo-badge">COMBO</span>' : ''}
        </div>
        ${
          item.isCombo && item.comboSelections
            ? `<div class="cart-combo-details">
                ${item.comboSelections
                  .map(
                    (sel) => `
                  <div class="cart-combo-selection">
                    <span class="cart-combo-slot">${sel.slotName}:</span> ${
                      sel.productName
                    }
                    ${
                      sel.removedIngredients?.length > 0
                        ? `<span class="cart-combo-mods">(sin ${sel.removedIngredients.join(
                            ', '
                          )})</span>`
                        : ''
                    }
                  </div>
                `
                  )
                  .join('')}
              </div>`
            : ''
        }
        ${
          !item.isCombo && item.removedIngredients?.length > 0
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
    message += `${item.quantity}x ${item.name}${
      item.isCombo ? ' (COMBO)' : ''
    } - ${formatPrice(item.price * item.quantity)}\n`;
    if (item.isCombo && item.comboSelections) {
      item.comboSelections.forEach((sel) => {
        message += `   • ${sel.slotName}: ${sel.productName}\n`;
        if (sel.removedIngredients?.length > 0) {
          message += `      _Sin: ${sel.removedIngredients.join(', ')}_\n`;
        }
      });
    } else if (item.removedIngredients?.length > 0) {
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
    const address = elements.deliveryAddress?.value?.trim() || '(completar)';
    message += `\n\n*Dirección:* ${address}`;
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

  // Combo Modal
  if (elements.comboModal) {
    elements.comboModalClose?.addEventListener('click', closeComboModal);
    elements.comboModalCancel?.addEventListener('click', closeComboModal);
    elements.comboModalAdd?.addEventListener('click', addComboToCart);
    elements.comboModal.addEventListener('click', (e) => {
      if (e.target === elements.comboModal) {
        closeComboModal();
      }
    });
  }

  // WhatsApp
  elements.whatsappBtn.addEventListener('click', sendToWhatsApp);

  // Delivery toggle
  document.querySelectorAll('input[name="delivery"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      updateCartSummary();
      updateAddressVisibility();
    });
  });

  // Address input - save to localStorage
  elements.deliveryAddress.addEventListener('input', (e) => {
    localStorage.setItem('deliveryAddress', e.target.value);
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
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  initLogo();
  loadAddress();
  await loadProducts();
  await loadCombos();
  // Re-render products to include combos now that they're loaded
  renderProducts();
  initEventListeners();
  updateCartCount();

  // Check operating hours and update WhatsApp button state
  updateWhatsAppButtonState();
  // Check every minute
  setInterval(updateWhatsAppButtonState, 60000);

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
});

// Make functions available globally for inline onclick handlers
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
