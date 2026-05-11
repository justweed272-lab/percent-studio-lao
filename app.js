const posConfig = {
  provider: "local-demo",
  apiBaseUrl: "/api/loyverse",
};

const posGateway = {
  async fetchProducts() {
    return CaptainStore.loadProducts();
  },
  async createOrder(order) {
    if (location.protocol !== "file:" && posConfig.provider === "loyverse") {
      const response = await fetch(`${posConfig.apiBaseUrl}/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(order),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || "Cannot create Loyverse receipt");
      }

      return data;
    }

    const savedOrder = await CaptainStore.createOrder(order);
    return Promise.resolve({
      ok: true,
      orderNo: savedOrder.orderNo,
    });
  },
};

const state = {
  products: [],
  cart: new Map(),
};

const money = new Intl.NumberFormat("lo-LA", {
  style: "currency",
  currency: "LAK",
  maximumFractionDigits: 0,
});

const productGrid = document.querySelector("[data-product-grid]");
const cardTemplate = document.querySelector("#product-card-template");
const searchInput = document.querySelector("#search");
const categorySelect = document.querySelector("#category");
const sortSelect = document.querySelector("#sort");
const cartCount = document.querySelector("[data-cart-count]");
const cartItems = document.querySelector("[data-cart-items]");
const cartDialogItems = document.querySelector("[data-cart-items-dialog]");
const subtotalEl = document.querySelector("[data-subtotal]");
const shippingEl = document.querySelector("[data-shipping]");
const totalEl = document.querySelector("[data-total]");
const cartDialog = document.querySelector("[data-cart-dialog]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const formStatus = document.querySelector("[data-form-status]");
const productDialog = document.querySelector("[data-product-dialog]");
const checkoutAlert = document.querySelector("[data-checkout-alert]");
const checkoutAlertTitle = document.querySelector("[data-checkout-alert-title]");
const checkoutAlertMessage = document.querySelector("[data-checkout-alert-message]");
const checkoutAlertIcon = document.querySelector("[data-checkout-alert-icon]");
const qrPayment = document.querySelector("[data-qr-payment]");
const slipPreview = document.querySelector("[data-slip-preview]");
const slipFileName = document.querySelector("[data-slip-file-name]");
const toastStack = document.querySelector("[data-toast-stack]");
const detailState = {
  product: null,
  color: null,
  size: null,
};
let paymentSlipData = "";
let toastTimer = 0;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function playSuccessBell() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audio = new AudioContext();
  const notes = [
    { frequency: 660, start: 0, duration: 0.12 },
    { frequency: 880, start: 0.13, duration: 0.16 },
  ];

  notes.forEach((note) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.001, audio.currentTime + note.start);
    gain.gain.exponentialRampToValueAtTime(0.22, audio.currentTime + note.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + note.start + note.duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + note.start);
    oscillator.stop(audio.currentTime + note.start + note.duration + 0.03);
  });
}

function showCheckoutAlert(title, message, type = "warning") {
  checkoutAlert.classList.toggle("is-success", type === "success");
  checkoutAlertIcon.textContent = type === "success" ? "✓" : "!";
  checkoutAlertTitle.textContent = title;
  checkoutAlertMessage.textContent = message;
  checkoutAlert.showModal();
}

function getFilteredProducts() {
  if (!state.products || !Array.isArray(state.products)) return [];
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  const sortBy = sortSelect.value;

  const filtered = state.products.filter((product) => {
    const searchableText = `${product.name} ${product.label} ${product.category} ${product.id}`.toLowerCase();
    const matchesQuery = searchableText.includes(query);
    const matchesCategory = category === "all" || product.category === category;
    return matchesQuery && matchesCategory;
  });

  return filtered.sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "stock") return b.stock - a.stock;
    return state.products.indexOf(a) - state.products.indexOf(b);
  });
}

function renderProducts() {
  if (!state.products || !Array.isArray(state.products)) return;
  productGrid.innerHTML = "";
  const products = getFilteredProducts();

  if (!products.length) {
    productGrid.innerHTML = '<p class="empty-state">ບໍ່ພົບສິນຄ້າ</p>';
    return;
  }

  products.forEach((product) => {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    image.src = product.image || product.image_url;
    image.alt = product.name;
    card.querySelector(".category-label").textContent = product.label;
    card.querySelector("h3").textContent = product.name;
    card.querySelector(".description").textContent = product.description;
    card.querySelector(".price").textContent = money.format(product.price);
    card.querySelector(".stock").textContent = `ເຫຼືອ ${product.stock} ຊິ້ນ`;
    image.addEventListener("click", () => openProductDetail(product.id));
    card.querySelector("h3").addEventListener("click", () => openProductDetail(product.id));

    const button = card.querySelector(".add-button");
    button.disabled = product.stock <= 0;
    button.textContent = product.stock <= 0 ? "ສິນຄ້າໝົດ" : "ເລືອກຊື້";
    button.addEventListener("click", () => openProductDetail(product.id));
    productGrid.append(card);
  });
}

function openProductDetail(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const colors = (product.colors && product.colors.length > 0) 
                 ? product.colors 
                 : [{ name: "ທົ່ວໄປ", image: product.image || product.image_url }];
  
  const sizes = (product.sizes && product.sizes.length > 0) 
                ? product.sizes 
                : ["Free Size"];

  detailState.product = product;
  detailState.color = colors[0];
  detailState.size = sizes[0];

  const dialogImg = productDialog.querySelector("[data-detail-image]");
  dialogImg.src = colors[0].image || product.image || product.image_url;
  dialogImg.alt = product.name;
  
  productDialog.querySelector("[data-detail-name]").textContent = product.name;
  productDialog.querySelector("[data-detail-price]").textContent = money.format(product.price);
  productDialog.querySelector("[data-detail-description]").textContent = product.description || "";

  const colorWrap = productDialog.querySelector("[data-detail-colors]");
  const sizeWrap = productDialog.querySelector("[data-detail-sizes]");
  const qtyInput = productDialog.querySelector("[data-detail-qty]");
  
  colorWrap.innerHTML = "";
  sizeWrap.innerHTML = "";
  qtyInput.value = 1;

  colors.forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "detail-color-card";
    btn.innerHTML = `<span>${color.name}</span>`;
    btn.onclick = () => {
      detailState.color = color;
      dialogImg.src = color.image || product.image || product.image_url;
      colorWrap.querySelectorAll(".detail-color-card").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      updateDetailAvailability();
    };
    colorWrap.append(btn);
  });

  sizes.forEach((size) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "detail-size-pill";
    btn.textContent = size;
    btn.onclick = () => {
      detailState.size = size;
      sizeWrap.querySelectorAll(".detail-size-pill").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      updateDetailAvailability();
    };
    sizeWrap.append(btn);
  });

  updateDetailAvailability();
  productDialog.showModal();
}

function updateDetailAvailability() {
  if (!detailState.product) return;
  let available = Number(detailState.product.stock || 0);

  if (detailState.product.variants && detailState.product.variants.length > 0) {
    const variant = detailState.product.variants.find(v => 
      String(v.size) === String(detailState.size) && 
      String(v.colorName) === String(detailState.color.name)
    );
    available = variant ? Number(variant.stock) : 0;
  }

  const qtyInput = productDialog.querySelector("[data-detail-qty]");
  const addButton = productDialog.querySelector("[data-detail-add]");
  
  productDialog.querySelector("[data-detail-stock]").textContent = `ເຫຼືອ ${available} ຊິ້ນ`;
  qtyInput.max = available;
  
  if (available <= 0) {
    addButton.disabled = true;
    addButton.textContent = "ສິນຄ້າໝົດ";
    qtyInput.value = 0;
  } else {
    addButton.disabled = false;
    addButton.textContent = "ເພີ່ມໃສ່ກະຕ່າ";
  }
}


function getCartKey(productId, size, colorName) {
  return `${productId}::${size}::${colorName}`;
}

function getVariantStock(product, size, colorName) {
  const variant = (product.variants || []).find((item) => item.size === size && item.colorName === colorName);
  return Number(variant?.stock || 0);
}

function getVariantQtyInCart(productId, size, colorName) {
  return [...state.cart.values()]
    .filter((line) => (
      line.product.id === productId &&
      line.size === size &&
      line.color.name === colorName
    ))
    .reduce((sum, line) => sum + line.qty, 0);
}

function getAvailableVariantQty(product, size, colorName) {
  return getVariantStock(product, size, colorName) - getVariantQtyInCart(product.id, size, colorName);
}

function showCartToast(product, qty) {
  if (!toastStack || !product) return;
  window.clearTimeout(toastTimer);
  toastStack.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "cart-toast";
  toast.innerHTML = `
    <div class="cart-toast-icon" aria-hidden="true">✓</div>
    <div>
      <strong>ເພີ່ມລົງກະຕ່າແລ້ວ</strong>
      <span>${product.name} x ${qty}</span>
    </div>
  `;

  toastStack.append(toast);
  toastTimer = window.setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2400);
}

function updateDetailAvailability() {
  if (!detailState.product || !detailState.color || !detailState.size) return;
  const available = Math.max(0, getAvailableVariantQty(detailState.product, detailState.size, detailState.color.name));
  const qtyInput = productDialog.querySelector("[data-detail-qty]");
  const addButton = productDialog.querySelector("[data-detail-add]");
  productDialog.querySelector("[data-detail-stock]").textContent = `ເຫຼືອ ${available} ຊິ້ນ`;
  qtyInput.max = available;
  qtyInput.value = Math.min(Number(qtyInput.value || 1), Math.max(1, available));
  addButton.disabled = available <= 0;
  addButton.textContent = available <= 0 ? "ສິນຄ້າໝົດ" : "ເພີ່ມໃສ່ກະຕ່າ";
}

function addToCart(productId, options) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return 0;

  const requestedQty = Math.max(1, Number(options.qty || 1));
  const available = getAvailableVariantQty(product, options.size, options.color.name);
  const allowedQty = Math.min(requestedQty, available);
  if (allowedQty <= 0) return 0;

  const key = getCartKey(productId, options.size, options.color.name);
  const currentLine = state.cart.get(key);
  state.cart.set(key, {
    product,
    qty: (currentLine?.qty || 0) + allowedQty,
    size: options.size,
    color: options.color,
    key,
  });
  renderCart();
  return allowedQty;
}

function updateQty(key, change) {
  const line = state.cart.get(key);
  if (!line) return;

  const availableForLine = getVariantStock(line.product, line.size, line.color.name);
  const nextQty = line.qty + change;
  if (nextQty <= 0) {
    state.cart.delete(key);
  } else if (nextQty <= availableForLine) {
    state.cart.set(key, { ...line, qty: nextQty });
  }
  renderCart();
}

function createCartLine({ product, qty, size, color, key }) {
  const line = document.createElement("div");
  line.className = "cart-line";
  line.innerHTML = `
    <img src="${product.image || product.image_url}" alt="${product.name}">
    <div>
      <h3>${product.name}</h3>
      <p>${size} / ${color.name} - ${money.format(product.price)} x ${qty}</p>
    </div>
    <div class="qty-controls" aria-label="ຈຳນວນ ${product.name}">
      <button type="button" data-dec aria-label="ຫຼຸດຈຳນວນ">-</button>
      <span>${qty}</span>
      <button type="button" data-inc aria-label="ເພີ່ມຈຳນວນ">+</button>
    </div>
  `;
  line.querySelector("[data-dec]").addEventListener("click", () => updateQty(key, -1));
  line.querySelector("[data-inc]").addEventListener("click", () => updateQty(key, 1));
  return line;
}

function renderCart() {
  const lines = [...state.cart.values()];
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const shipping = subtotal > 0 && subtotal < 250000 ? 15000 : 0;
  const total = subtotal + shipping;
  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  cartCount.textContent = count;
  subtotalEl.textContent = money.format(subtotal);
  shippingEl.textContent = money.format(shipping);
  totalEl.textContent = money.format(total);

  [cartItems, cartDialogItems].forEach((target) => {
    target.innerHTML = "";
    if (!lines.length) {
      target.innerHTML = '<p class="empty-state">ກະຕ່າຍັງວ່າງ</p>';
      return;
    }
    lines.forEach((line) => target.append(createCartLine(line)));
  });
}

async function handleCheckout(event) {
  event.preventDefault();
  const lines = [...state.cart.values()];
  if (!lines.length) {
    formStatus.textContent = "ກະລຸນາເລືອກສິນຄ້າກ່ອນສົ່ງອໍເດີ";
    return;
  }

  const formData = new FormData(checkoutForm);
  const paymentMethod = formData.get("paymentMethod");
  const slipFile = checkoutForm.elements.paymentSlip.files?.[0];
  if (paymentMethod === "qr" && !paymentSlipData && slipFile) {
    paymentSlipData = await readFileAsDataUrl(slipFile);
  }
  if (paymentMethod === "qr" && !paymentSlipData) {
    showCheckoutAlert(
      "ຕ້ອງແນບສະລິບ",
      "ກະລຸນາສະແກນ QR ແລ້ວແນບສະລິບກ່ອນສົ່ງອໍເດີ"
    );
    return;
  }
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const shipping = subtotal < 250000 ? 15000 : 0;
  const payload = {
    storeId: "captain21-demo",
    customer: Object.fromEntries(formData.entries()),
    items: lines.map(({ product, qty, size, color }) => ({
      sku: product.id,
      name: `${product.name} (${size}, ${color.name})`,
      size,
      color: color.name,
      qty,
      unitPrice: product.price,
    })),
    totals: {
      subtotal,
      shipping,
      total: subtotal + shipping,
    },
    payment: {
      method: paymentMethod,
      status: paymentMethod === "qr" ? "pending_review" : "cod",
      slip: paymentMethod === "qr" ? paymentSlipData : "",
    },
    source: "web-storefront",
  };

  formStatus.textContent = "ກຳລັງສົ່ງອໍເດີ...";
  try {
    const result = await posGateway.createOrder(payload);
    if (result.ok) {
      state.cart.clear();
      checkoutForm.reset();
      paymentSlipData = "";
      slipPreview.removeAttribute("src");
      if (slipFileName) slipFileName.textContent = "ຍັງບໍ່ໄດ້ເລືອກໄຟລ໌";
      state.products = await posGateway.fetchProducts();
      renderProducts();
      renderCart();
      formStatus.textContent = "";
      playSuccessBell();
      showCheckoutAlert(
        "ສົ່ງອໍເດີແລ້ວ",
        `ຂອບໃຈ ອໍເດີຂອງທ່ານຖືກສົ່ງແລ້ວ ເລກອໍເດີ ${result.orderNo}`,
        "success"
      );
    } else {
      formStatus.textContent = "ສົ່ງບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່";
    }
  } catch (error) {
    formStatus.textContent = `POS: ${error.message}`;
  }
}

document.querySelectorAll("[data-open-cart]").forEach((button) => {
  button.addEventListener("click", () => cartDialog.showModal());
});

document.querySelectorAll("[data-close-cart]").forEach((button) => {
  button.addEventListener("click", () => cartDialog.close());
});

document.querySelector("[data-close-product]").addEventListener("click", () => {
  productDialog.close();
});

document.querySelectorAll("[data-close-checkout-alert]").forEach((button) => {
  button.addEventListener("click", () => checkoutAlert.close());
});

document.querySelector("[data-detail-add]").addEventListener("click", () => {
  if (!detailState.product) return;
  const addedQty = addToCart(detailState.product.id, {
    color: detailState.color,
    size: detailState.size,
    qty: Number(document.querySelector("[data-detail-qty]").value || 1),
  });
  if (addedQty > 0) {
    showCartToast(detailState.product, addedQty);
  }
  productDialog.close();
});

document.querySelector("[data-detail-dec]").addEventListener("click", () => {
  const input = document.querySelector("[data-detail-qty]");
  input.value = Math.max(1, Number(input.value || 1) - 1);
});

document.querySelector("[data-detail-inc]").addEventListener("click", () => {
  const input = document.querySelector("[data-detail-qty]");
  const max = Number(input.max || 1);
  input.value = Math.min(max, Number(input.value || 1) + 1);
});

checkoutForm.elements.paymentSlip.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  paymentSlipData = await readFileAsDataUrl(file);
  if (paymentSlipData) {
    slipPreview.src = paymentSlipData;
    if (slipFileName) slipFileName.textContent = file?.name || "ອັບໂຫຼດສະລິບແລ້ວ";
  } else {
    slipPreview.removeAttribute("src");
    if (slipFileName) slipFileName.textContent = "ຍັງບໍ່ໄດ້ເລືອກໄຟລ໌";
  }
});

const paymentMethodControls = checkoutForm.elements.paymentMethod.length
  ? [...checkoutForm.elements.paymentMethod]
  : [checkoutForm.elements.paymentMethod];

paymentMethodControls.forEach((input) => {
  input.addEventListener("input", () => {
    qrPayment.style.display = checkoutForm.elements.paymentMethod.value === "qr" ? "grid" : "none";
  });
});

[searchInput, categorySelect, sortSelect].forEach((control) => {
  control.addEventListener("input", renderProducts);
});

checkoutForm.addEventListener("submit", handleCheckout);

async function initializeApp() {
  try {
    console.log("ກຳລັງໂຫຼດສິນຄ້າ...");
    const products = await posGateway.fetchProducts();
    state.products = products;
    renderProducts();
    renderCart();
    console.log("ໜ້າຮ້ານພ້ອມໃຊ້ງານ");
  } catch (error) {
    console.error("ໂຫຼດໜ້າຮ້ານບໍ່ສຳເລັດ:", error);
  }
}

initializeApp();



