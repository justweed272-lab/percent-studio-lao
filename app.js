const posConfig = {
  provider: "local-demo",
  apiBaseUrl: "/api/loyverse",
};

const posGateway = {
  async fetchProducts() {
    if (location.protocol === "file:") {
      return Promise.resolve(CaptainStore.getProducts());
    }

    try {
      const response = await fetch(`${posConfig.apiBaseUrl}/products`);
      if (!response.ok) throw new Error("Cannot fetch Loyverse products");
      const data = await response.json();
      return data.products?.length ? data.products : CaptainStore.getProducts();
    } catch (error) {
      console.warn("Using local POS products because Loyverse is not ready yet.", error);
      return CaptainStore.getProducts();
    }
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

    const savedOrder = CaptainStore.createOrder(order);
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
const qrPayment = document.querySelector("[data-qr-payment]");
const slipPreview = document.querySelector("[data-slip-preview]");
const detailState = {
  product: null,
  color: null,
  size: null,
};
let paymentSlipData = "";

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

function getFilteredProducts() {
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
  productGrid.innerHTML = "";
  const products = getFilteredProducts();

  if (!products.length) {
    productGrid.innerHTML = '<p class="empty-state">ບໍ່ພົບສິນຄ້າທີ່ກົງກັບຕົວກອງ</p>';
    return;
  }

  products.forEach((product) => {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    image.src = product.image;
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
  const firstAvailable = product.variants.find((variant) => Number(variant.stock) > 0) || product.variants[0];

  detailState.product = product;
  detailState.color = product.colors.find((color) => color.name === firstAvailable.colorName) || product.colors[0];
  detailState.size = firstAvailable.size || product.sizes[0];

  productDialog.querySelector("[data-detail-image]").src = product.image;
  productDialog.querySelector("[data-detail-image]").alt = product.name;
  productDialog.querySelector("[data-detail-category]").textContent = product.label;
  productDialog.querySelector("[data-detail-name]").textContent = product.name;
  productDialog.querySelector("[data-detail-price]").textContent = money.format(product.price);
  productDialog.querySelector("[data-detail-description]").textContent = product.description;

  const colorWrap = productDialog.querySelector("[data-detail-colors]");
  const sizeWrap = productDialog.querySelector("[data-detail-sizes]");
  const qtyInput = productDialog.querySelector("[data-detail-qty]");
  colorWrap.innerHTML = "";
  sizeWrap.innerHTML = "";
  qtyInput.value = 1;
  qtyInput.max = product.stock;

  product.colors.forEach((color) => {
    const colorCard = document.createElement("button");
    colorCard.type = "button";
    colorCard.className = color.name === detailState.color.name ? "detail-color-card is-selected" : "detail-color-card";
    colorCard.innerHTML = `
      <img src="${color.image || product.image}" alt="${product.name} ${color.name}">
      <span>${color.name}</span>
    `;
    colorCard.addEventListener("click", () => {
      detailState.color = color;
      productDialog.querySelector("[data-detail-image]").src = color.image || product.image;
      colorWrap.querySelectorAll(".detail-color-card").forEach((item) => item.classList.remove("is-selected"));
      colorCard.classList.add("is-selected");
      updateDetailAvailability();
    });
    colorWrap.append(colorCard);
  });

  product.sizes.forEach((size) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = size === detailState.size ? "detail-size-pill is-selected" : "detail-size-pill";
    button.textContent = size;
    button.addEventListener("click", () => {
      detailState.size = size;
      sizeWrap.querySelectorAll(".detail-size-pill").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      updateDetailAvailability();
    });
    sizeWrap.append(button);
  });
  updateDetailAvailability();
  productDialog.showModal();
}

function getCartKey(productId, size, colorName) {
  return `${productId}::${size}::${colorName}`;
}

function getVariantStock(product, size, colorName) {
  const variant = product.variants.find((item) => item.size === size && item.colorName === colorName);
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
  if (!product) return;

  const requestedQty = Math.max(1, Number(options.qty || 1));
  const available = getAvailableVariantQty(product, options.size, options.color.name);
  const allowedQty = Math.min(requestedQty, available);
  if (allowedQty <= 0) return;

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
    <img src="${product.image}" alt="${product.name}">
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
      target.innerHTML = '<p class="empty-state">ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ</p>';
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
    formStatus.textContent = "ກະລຸນາແນບສະລິບການໂອນເງິນ";
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

  formStatus.textContent = "ກຳລັງສົ່ງອໍເດີເຂົ້າ POS...";
  try {
    const result = await posGateway.createOrder(payload);
    if (result.ok) {
      state.cart.clear();
      checkoutForm.reset();
      paymentSlipData = "";
      slipPreview.removeAttribute("src");
      state.products = CaptainStore.getProducts();
      renderProducts();
      renderCart();
      formStatus.textContent = `ສົ່ງສຳເລັດ ເລກອໍເດີ ${result.orderNo}`;
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

document.querySelector("[data-detail-add]").addEventListener("click", () => {
  if (!detailState.product) return;
  addToCart(detailState.product.id, {
    color: detailState.color,
    size: detailState.size,
    qty: Number(document.querySelector("[data-detail-qty]").value || 1),
  });
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
  } else {
    slipPreview.removeAttribute("src");
  }
});

checkoutForm.elements.paymentMethod.forEach((input) => {
  input.addEventListener("input", () => {
    qrPayment.style.display = checkoutForm.elements.paymentMethod.value === "qr" ? "grid" : "none";
  });
});

[searchInput, categorySelect, sortSelect].forEach((control) => {
  control.addEventListener("input", renderProducts);
});

checkoutForm.addEventListener("submit", handleCheckout);

posGateway.fetchProducts().then((products) => {
  state.products = products;
  renderProducts();
  renderCart();
});
