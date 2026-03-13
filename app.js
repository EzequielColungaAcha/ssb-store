// ===== CONFIGURATION =====
const CONFIG = {
  whatsappNumber: '542241470235',
  shippingCost: 500,
  freeShippingThreshold: 45000,
  storeName: 'Súper Smash Burger',
  currency: '$',
  // Maintenance mode configuration
  maintenance: {
    enabled: false,
    message: '',
  },
  // Operating hours configuration
  operatingHours: {
    enabled: true,
    startHour: 20, // 8 PM
    endHour: 24, // Midnight (use 24 for midnight, or 0 for next day)
    timezone: 'America/Argentina/Buenos_Aires',
    // Days of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Example: [4, 5, 6] = Thursday, Friday, Saturday
    operatingDays: [5, 6, 0], // All days by default
  },
  // Combos configuration
  combos: {
    enabled: true, // set to false to hide all combos
  },
  // Delivery configuration
  delivery: {
    enabled: true, // set to false to disable delivery option
    disabledMessage: 'Lo siento, por el momento no tenemos delivery disponible.',
  },
  // Papas fritas category
  papasFritas: {
    enabled: true, // set to false to hide papas fritas
  },
  // Bebidas category
  bebidas: {
    enabled: true, // set to false to hide bebidas
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
let variableIngredients = {}; // { ingredientId: selectedQuantity }
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
  customerName: document.getElementById('customerName'),
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

// Calculate display price including minimum variable ingredient prices
function getProductDisplayPrice(product) {
  let price = product.price;
  if (product.ingredients) {
    product.ingredients
      .filter((ing) => ing.is_variable)
      .forEach((ing) => {
        price += (ing.min_quantity || 1) * (ing.price_per_unit || 0);
      });
  }
  return price;
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
      }`;
    } else {
      // Show as list (e.g., "Jue, Vie, Sáb")
      daysStr = sortedDays.map((d) => dayNames[d]).join(', ') + ' ';
    }
  }

  return `${daysStr} de ${formatHour(startHour)} a ${formatHour(endHour)}`;
}

function updateWhatsAppButtonState() {
  if (!CONFIG.operatingHours.enabled) {
    return;
  }

  const isOpen = isWithinOperatingHours();
  const btn = elements.whatsappBtn;

  if (!btn) return;

  if (isOpen) {
    btn.style.display = '';
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.title = '';
    // Remove any closed message
    const closedMsg = document.getElementById('closedMessage');
    if (closedMsg) closedMsg.remove();
  } else {
    // Hide the button completely when outside operating hours
    btn.style.display = 'none';

    // Add closed message if not exists
    if (!document.getElementById('closedMessage')) {
      const msg = document.createElement('div');
      msg.id = 'closedMessage';
      msg.className = 'closed-message';
      msg.innerHTML = `<svg class="icon"><use href="#icon-x"/></svg> Pedidos disponibles ${formatOperatingHours()}`;
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
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  elements.settingsModal.classList.remove('active');
  document.body.style.overflow = '';
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

// ===== CUSTOMER NAME =====
function loadCustomerName() {
  const savedName = localStorage.getItem('customerName');
  if (savedName && elements.customerName) {
    elements.customerName.value = savedName;
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
    // Filter out disabled categories
    products = products.filter((p) => {
      if (!CONFIG.papasFritas.enabled && p.category === 'papas fritas') return false;
      if (!CONFIG.bebidas.enabled && p.category === 'bebidas') return false;
      return true;
    });
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
  if (!CONFIG.combos.enabled) {
    combos = [];
    return;
  }
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
      <div class="product-price">${formatPrice(getProductDisplayPrice(product))}</div>
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
  // Calculate base price
  let basePrice = 0;
  if (combo.price_type === 'fixed') {
    basePrice = combo.fixed_price || 0;
  } else {
    // Calculate sum of selected products
    for (const selection of selections) {
      basePrice += selection.productPrice || 0;
    }

    // Apply discount
    if (combo.discount_type === 'percentage' && combo.discount_value) {
      basePrice = basePrice * (1 - combo.discount_value / 100);
    } else if (combo.discount_type === 'fixed' && combo.discount_value) {
      basePrice = Math.max(0, basePrice - combo.discount_value);
    }
  }

  // Add variable ingredient prices (these are always added on top)
  let variableTotal = 0;
  for (const selection of selections) {
    if (selection.variableIngredients) {
      variableTotal += selection.variableIngredients.reduce(
        (sum, v) => sum + v.quantity * v.pricePerUnit,
        0
      );
    }
  }

  return Math.round(basePrice + variableTotal);
}

// Quick add without modal
function quickAddToCart(product) {
  // Collect variable ingredients with minimum quantities
  const varIngs = [];
  if (product.ingredients) {
    product.ingredients
      .filter((ing) => ing.is_variable)
      .forEach((ing) => {
        const minQty = ing.min_quantity || 1;
        if (minQty > 0) {
          varIngs.push({
            id: ing.id,
            name: ing.name,
            quantity: minQty,
            pricePerUnit: ing.price_per_unit || 0,
          });
        }
      });
  }

  addToCart(product, [], varIngs.length > 0 ? varIngs : null);

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
  variableIngredients = {};

  // Initialize variable ingredients with default quantities
  if (product.ingredients) {
    product.ingredients
      .filter((ing) => ing.is_variable)
      .forEach((ing) => {
        variableIngredients[ing.id] = ing.default_quantity || 1;
      });
  }

  updateCustomizeModalDisplay();
  elements.customizeModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function calculateCurrentProductPrice() {
  if (!currentProduct) return 0;
  let price = currentProduct.price;

  // Add variable ingredient prices
  if (currentProduct.ingredients) {
    currentProduct.ingredients
      .filter((ing) => ing.is_variable)
      .forEach((ing) => {
        const qty = variableIngredients[ing.id] || 0;
        price += qty * (ing.price_per_unit || 0);
      });
  }

  return price;
}

function updateCustomizeModalDisplay() {
  if (!currentProduct) return;

  elements.modalProductName.textContent = currentProduct.name;
  elements.modalProductPrice.textContent = formatPrice(
    calculateCurrentProductPrice()
  );
  elements.modalProductDescription.textContent =
    currentProduct.description || '';

  const regularIngredients = currentProduct.ingredients?.filter(
    (ing) => !ing.is_variable
  ) || [];
  const variableIngs = currentProduct.ingredients?.filter(
    (ing) => ing.is_variable
  ) || [];

  if (regularIngredients.length > 0 || variableIngs.length > 0) {
    elements.ingredientsSection.style.display = 'block';

    let html = '';

    // Regular removable ingredients
    if (regularIngredients.length > 0) {
      html += '<div class="ingredients-label">Quitar ingredientes:</div>';
      html += regularIngredients
        .map(
          (ing) => `
        <div class="ingredient-item ${
          removedIngredients.includes(ing.id) ? 'removed' : ''
        }" data-id="${ing.id}" data-type="removable">
          <div class="ingredient-checkbox">
            <svg class="icon"><use href="#icon-x"/></svg>
          </div>
          <span class="ingredient-name">${ing.name}</span>
        </div>
      `
        )
        .join('');
    }

    // Variable quantity ingredients
    if (variableIngs.length > 0) {
      html += '<div class="ingredients-label variable-label">Extras:</div>';
      html += variableIngs
        .map(
          (ing) => `
        <div class="variable-ingredient-item" data-id="${ing.id}">
          <div class="variable-ingredient-info">
            <span class="variable-ingredient-name">${ing.name}</span>
            <span class="variable-ingredient-price">(+${formatPrice(
              ing.price_per_unit || 0
            )}/u)</span>
          </div>
          <div class="variable-ingredient-controls">
            <button class="variable-qty-btn minus" data-id="${ing.id}" ${
            (variableIngredients[ing.id] || 0) <= (ing.min_quantity || 0)
              ? 'disabled'
              : ''
          }>
              <svg class="icon"><use href="#icon-minus"/></svg>
            </button>
            <span class="variable-qty-value">${
              variableIngredients[ing.id] || 0
            }</span>
            <button class="variable-qty-btn plus" data-id="${ing.id}" ${
            (variableIngredients[ing.id] || 0) >= (ing.max_quantity || 99)
              ? 'disabled'
              : ''
          }>
              <svg class="icon"><use href="#icon-plus"/></svg>
            </button>
          </div>
        </div>
      `
        )
        .join('');
    }

    elements.ingredientsList.innerHTML = html;

    // Add event listeners for regular ingredients
    elements.ingredientsList
      .querySelectorAll('.ingredient-item[data-type="removable"]')
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

    // Add event listeners for variable ingredient buttons
    elements.ingredientsList
      .querySelectorAll('.variable-qty-btn')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const ingId = btn.dataset.id;
          const ing = currentProduct.ingredients.find((i) => i.id === ingId);
          if (!ing) return;

          const delta = btn.classList.contains('plus') ? 1 : -1;
          const currentQty = variableIngredients[ingId] || 0;
          const newQty = Math.max(
            ing.min_quantity || 0,
            Math.min(ing.max_quantity || 99, currentQty + delta)
          );
          variableIngredients[ingId] = newQty;
          updateCustomizeModalDisplay();
        });
      });
  } else {
    elements.ingredientsSection.style.display = 'none';
  }
}

function closeCustomizeModal() {
  elements.customizeModal.classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
  removedIngredients = [];
  variableIngredients = {};
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
      // Initialize variable ingredients for this product
      const variableIngs = [];
      if (defaultProduct?.ingredients) {
        defaultProduct.ingredients
          .filter((ing) => ing.is_variable)
          .forEach((ing) => {
            variableIngs.push({
              id: ing.id,
              name: ing.name,
              quantity: ing.default_quantity || 1,
              pricePerUnit: ing.price_per_unit || 0,
            });
          });
      }

      comboSelections.push({
        slotId: slot.id,
        slotName: slot.name,
        productId: defaultProduct?.id || slot.products[0]?.id || '',
        productName: defaultProduct?.name || slot.products[0]?.name || '',
        productPrice: defaultProduct?.price || slot.products[0]?.price || 0,
        removedIngredients: [],
        variableIngredients: variableIngs,
      });
    }
  }

  renderComboModal();
  elements.comboModal.classList.add('active');
  document.body.style.overflow = 'hidden';
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
            selectedProduct?.ingredients?.filter((ing) => !ing.is_variable)
              .length > 0
              ? `
            <div class="combo-slot-ingredients">
              <div class="combo-ingredients-label">Quitar:</div>
              ${selectedProduct.ingredients
                .filter((ing) => !ing.is_variable)
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
          ${
            selectedProduct?.ingredients?.filter((ing) => ing.is_variable)
              .length > 0
              ? `
            <div class="combo-slot-ingredients variable-ingredients">
              <div class="combo-ingredients-label">Extras:</div>
              ${selectedProduct.ingredients
                .filter((ing) => ing.is_variable)
                .map((ing) => {
                  const varIng = selection?.variableIngredients?.find(
                    (v) => v.id === ing.id
                  );
                  const qty = varIng?.quantity || 0;
                  return `
                    <div class="combo-variable-ingredient" data-selection-index="${selectionIndex}" data-ingredient-id="${ing.id}">
                      <span class="combo-variable-name">${ing.name}</span>
                      <span class="combo-variable-price">(+${formatPrice(ing.price_per_unit || 0)}/u)</span>
                      <div class="combo-variable-controls">
                        <button class="combo-variable-btn minus" data-selection-index="${selectionIndex}" data-ingredient-id="${ing.id}" ${qty <= (ing.min_quantity || 0) ? 'disabled' : ''}>-</button>
                        <span class="combo-variable-qty">${qty}</span>
                        <button class="combo-variable-btn plus" data-selection-index="${selectionIndex}" data-ingredient-id="${ing.id}" ${qty >= (ing.max_quantity || 99) ? 'disabled' : ''}>+</button>
                      </div>
                    </div>
                  `;
                })
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
          // Initialize variable ingredients for new product
          const variableIngs = [];
          if (product.ingredients) {
            product.ingredients
              .filter((ing) => ing.is_variable)
              .forEach((ing) => {
                variableIngs.push({
                  id: ing.id,
                  name: ing.name,
                  quantity: ing.default_quantity || 1,
                  pricePerUnit: ing.price_per_unit || 0,
                });
              });
          }

          comboSelections[idx] = {
            ...selection,
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            removedIngredients: [],
            variableIngredients: variableIngs,
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

  // Add event listeners for variable ingredient buttons
  elements.comboSlots
    .querySelectorAll('.combo-variable-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.selectionIndex);
        const ingredientId = btn.dataset.ingredientId;

        const selection = comboSelections[idx];
        const slot = currentCombo.slots.find((s) => s.id === selection.slotId);
        const product = slot?.products.find((p) => p.id === selection.productId);
        const ing = product?.ingredients?.find((i) => i.id === ingredientId);

        if (!ing) return;

        const delta = btn.classList.contains('plus') ? 1 : -1;
        const varIng = selection.variableIngredients?.find(
          (v) => v.id === ingredientId
        );

        if (varIng) {
          const newQty = Math.max(
            ing.min_quantity || 0,
            Math.min(ing.max_quantity || 99, varIng.quantity + delta)
          );
          varIng.quantity = newQty;
        } else {
          // Add new variable ingredient
          if (!selection.variableIngredients) {
            selection.variableIngredients = [];
          }
          selection.variableIngredients.push({
            id: ing.id,
            name: ing.name,
            quantity: Math.max(ing.min_quantity || 0, delta > 0 ? 1 : 0),
            pricePerUnit: ing.price_per_unit || 0,
          });
        }

        renderComboModal();
      });
    });
}

function closeComboModal() {
  elements.comboModal.classList.remove('active');
  document.body.style.overflow = '';
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

  // Collect variable ingredients with quantities > 0
  const varIngs = [];
  if (currentProduct.ingredients) {
    currentProduct.ingredients
      .filter((ing) => ing.is_variable)
      .forEach((ing) => {
        const qty = variableIngredients[ing.id] || 0;
        if (qty > 0) {
          varIngs.push({
            id: ing.id,
            name: ing.name,
            quantity: qty,
            pricePerUnit: ing.price_per_unit || 0,
          });
        }
      });
  }

  addToCart(currentProduct, removedNames, varIngs.length > 0 ? varIngs : null);
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
  document.body.style.overflow = 'hidden';
}

function closeCategoriesModal() {
  elements.categoriesModal.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== CART FUNCTIONS =====
function addToCart(product, removedIngredients = [], variableIngs = null) {
  const removedKey = removedIngredients.sort().join(',');
  const variableKey = variableIngs
    ? variableIngs.map((v) => `${v.id}:${v.quantity}`).join(',')
    : '';
  const fullKey = `${removedKey}|${variableKey}`;

  // Calculate total price including variable ingredients
  let totalPrice = product.price;
  if (variableIngs) {
    totalPrice += variableIngs.reduce(
      (sum, v) => sum + v.quantity * v.pricePerUnit,
      0
    );
  }

  const existing = cart.find((item) => {
    const itemRemovedKey = (item.removedIngredients || []).sort().join(',');
    const itemVariableKey = item.variableIngredients
      ? item.variableIngredients.map((v) => `${v.id}:${v.quantity}`).join(',')
      : '';
    const itemFullKey = `${itemRemovedKey}|${itemVariableKey}`;
    return item.productId === product.id && itemFullKey === fullKey;
  });

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: generateCartItemId(),
      productId: product.id,
      name: product.name,
      price: totalPrice,
      quantity: 1,
      removedIngredients,
      variableIngredients: variableIngs,
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
                    ${
                      sel.variableIngredients?.length > 0
                        ? `<span class="cart-combo-mods">(${sel.variableIngredients
                            .map((v) => `${v.quantity}x ${v.name}`)
                            .join(', ')})</span>`
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
        ${
          !item.isCombo && item.variableIngredients?.length > 0
            ? `<div class="cart-item-mods">Con: ${item.variableIngredients
                .map((v) => `${v.quantity}x ${v.name}`)
                .join(', ')}</div>`
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

  const addressEmpty = isDelivery && !(elements.deliveryAddress?.value?.trim());
  elements.whatsappBtn.disabled = cart.length === 0 || addressEmpty;
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

  if (isDelivery && !(elements.deliveryAddress?.value?.trim())) return;
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

  const customerName = elements.customerName?.value?.trim() || '';

  let message = `*Nuevo Pedido - ${CONFIG.storeName}*\n`;
  if (customerName) {
    message += `*Cliente:* ${customerName}\n`;
  }
  message += '\n';

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
        if (sel.variableIngredients?.length > 0) {
          message += `      _Con: ${sel.variableIngredients
            .map((v) => `${v.quantity}x ${v.name}`)
            .join(', ')}_\n`;
        }
      });
    } else {
      if (item.removedIngredients?.length > 0) {
        message += `   _Sin: ${item.removedIngredients.join(', ')}_\n`;
      }
      if (item.variableIngredients?.length > 0) {
        message += `   _Con: ${item.variableIngredients
          .map((v) => `${v.quantity}x ${v.name}`)
          .join(', ')}_\n`;
      }
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

  // Address input - save to localStorage and update button state
  elements.deliveryAddress.addEventListener('input', (e) => {
    localStorage.setItem('deliveryAddress', e.target.value);
    updateCartSummary();
  });

  // Customer name input - save to localStorage
  if (elements.customerName) {
    elements.customerName.addEventListener('input', (e) => {
      localStorage.setItem('customerName', e.target.value);
    });
  }

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

// ===== PWA INSTALL PROMPT =====
window.deferredInstallPrompt = null;

// Detect iOS Safari
function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/FxiOS/i);
  return iOSSafari;
}

// Check if app is already installed (running as standalone)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default browser prompt
  e.preventDefault();
  // Save the event for later use
  window.deferredInstallPrompt = e;

  // Show install section in settings if already loaded
  const installSection = document.getElementById('installSection');
  const installBtn = document.getElementById('installApp');
  const iosInstructions = document.getElementById('iosInstallInstructions');
  if (installSection) {
    installSection.style.display = 'block';
    if (installBtn) installBtn.style.display = 'flex';
    if (iosInstructions) iosInstructions.style.display = 'none';
  }
});

window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null;
  const installSection = document.getElementById('installSection');
  if (installSection) {
    installSection.style.display = 'none';
  }
});

// ===== MAINTENANCE MODE =====
function checkMaintenanceMode() {
  if (!CONFIG.maintenance.enabled) {
    return false;
  }

  const maintenanceOverlay = document.getElementById('maintenanceOverlay');
  const maintenanceMessage = document.getElementById('maintenanceMessage');

  if (maintenanceOverlay) {
    maintenanceOverlay.style.display = 'flex';
    if (maintenanceMessage && CONFIG.maintenance.message) {
      maintenanceMessage.textContent = CONFIG.maintenance.message;
    }
  }

  // Hide main content
  const header = document.querySelector('.header');
  const main = document.querySelector('.main');
  const bottomNav = document.getElementById('bottomNav');
  const filterBar = document.getElementById('filterBar');

  if (header) header.style.display = 'none';
  if (main) main.style.display = 'none';
  if (bottomNav) bottomNav.style.display = 'none';
  if (filterBar) filterBar.style.display = 'none';

  return true;
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme first so maintenance page has correct colors
  loadSettings();

  // Check maintenance mode - if enabled, skip all other initialization
  if (checkMaintenanceMode()) {
    return;
  }

  initLogo();
  loadCustomerName();
  loadAddress();
  await loadProducts();
  await loadCombos();
  // Re-render products to include combos now that they're loaded
  renderProducts();
  initEventListeners();
  updateCartCount();

  // If delivery is disabled, hide the delivery option and show notice
  if (!CONFIG.delivery.enabled) {
    const deliveryToggle = document.querySelector('.delivery-toggle');
    if (deliveryToggle) {
      // Force pickup to be selected
      const pickupRadio = document.querySelector('input[name="delivery"][value="pickup"]');
      if (pickupRadio) pickupRadio.checked = true;

      // Hide the delivery radio option
      const deliveryLabel = document.querySelector('input[name="delivery"][value="delivery"]');
      if (deliveryLabel && deliveryLabel.closest('.delivery-option')) {
        deliveryLabel.closest('.delivery-option').style.display = 'none';
      }

      // Insert notice banner
      const notice = document.createElement('div');
      notice.className = 'delivery-disabled-notice';
      notice.textContent = CONFIG.delivery.disabledMessage;
      deliveryToggle.insertAdjacentElement('afterend', notice);
    }
    // Hide address input since delivery is not available
    if (elements.addressInput) {
      elements.addressInput.style.display = 'none';
    }
    updateCartSummary();
  }

  // Check operating hours and update WhatsApp button state
  updateWhatsAppButtonState();
  // Check every minute
  setInterval(updateWhatsAppButtonState, 60000);

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }

  // Setup install button in settings
  const installSection = document.getElementById('installSection');
  const installBtn = document.getElementById('installApp');
  const iosInstructions = document.getElementById('iosInstallInstructions');

  if (installSection) {
    // Don't show install section if already running as standalone app
    if (isStandalone()) {
      installSection.style.display = 'none';
    } else if (isIOSSafari()) {
      // Show iOS-specific install instructions
      installSection.style.display = 'block';
      if (installBtn) installBtn.style.display = 'none';
      if (iosInstructions) iosInstructions.style.display = 'block';
    } else if (window.deferredInstallPrompt) {
      // Show standard install button if prompt is available
      installSection.style.display = 'block';
      if (installBtn) installBtn.style.display = 'flex';
      if (iosInstructions) iosInstructions.style.display = 'none';
    }
  }

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!window.deferredInstallPrompt) {
        showToast('La app ya está instalada o no se puede instalar');
        return;
      }

      window.deferredInstallPrompt.prompt();
      const { outcome } = await window.deferredInstallPrompt.userChoice;

      if (outcome === 'accepted') {
        showToast('¡App instalada!');
        if (installSection) installSection.style.display = 'none';
      }

      window.deferredInstallPrompt = null;
    });
  }
});

// Make functions available globally for inline onclick handlers
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
