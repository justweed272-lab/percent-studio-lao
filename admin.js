const money = new Intl.NumberFormat("lo-LA", {
  style: "currency",
  currency: "LAK",
  maximumFractionDigits: 0,
});

function formatLak(value) {
  return `LAK ${Number(value || 0).toLocaleString("en-US")}`;
}

const labels = {
  tops: "ເສື້ອ",
  dresses: "ເດຣສ",
  outerwear: "ແຈັກເກັດ",
  bottoms: "ໂສ້ງ/ກະໂປງ",
};

const statusLabels = {
  new: "ອໍເດີໃໝ່",
  paid: "ຊຳລະແລ້ວ",
  packed: "ຈັດສົ່ງແລ້ວ",
};

const paymentLabels = {
  qr: "QR Payment",
  cod: "ເກັບເງິນປາຍທາງ",
};

const paymentStatusLabels = {
  pending_review: "ລໍຖ້າກວດສະລິບ",
  cod: "COD",
  paid: "ຊຳລະແລ້ວ",
};

const productForm = document.querySelector("[data-product-form]");
const productTable = document.querySelector("[data-product-table]");
const orderList = document.querySelector("[data-order-list]");
const adminSearch = document.querySelector("[data-admin-search]");
const orderFilter = document.querySelector("[data-order-filter]");
const imagePreview = document.querySelector("[data-image-preview]");
const variantTable = document.querySelector("[data-variant-table]");
const colorChips = document.querySelector("[data-color-chips]");
const colorNameInput = document.querySelector("[data-color-name]");
const colorValueInput = document.querySelector("[data-color-value]");
const stockDialog = document.querySelector("[data-stock-dialog]");
const stockForm = document.querySelector("[data-stock-form]");
const colorImageEditor = document.querySelector("[data-color-image-editor]");
const activeColorName = document.querySelector("[data-active-color-name]");
const activeColorPreview = document.querySelector("[data-active-color-preview]");
const activeColorFile = document.querySelector("[data-active-color-file]");
let selectedImageData = "";
let activeColorForImage = "";
const defaultProductImage = "assets/products/captain-shirt.svg";

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    });
    image.addEventListener("error", () => resolve(dataUrl));
    image.src = dataUrl;
  });
}

async function prepareImageFile(file) {
  const dataUrl = await readImageFile(file);
  return compressImage(dataUrl);
}

function setMainProductImage(image) {
  selectedImageData = image;
  imagePreview.src = image;
  productForm.elements.image.value = "";
}

function isUsableImage(src) {
  return Boolean(src && !src.includes("fakepath") && !src.endsWith("captain-shirt.jpeg"));
}

function getCurrentMainImage() {
  if (isUsableImage(selectedImageData)) return selectedImageData;
  if (isUsableImage(imagePreview.getAttribute("src"))) return imagePreview.getAttribute("src");
  if (isUsableImage(productForm.elements.image.value.trim())) return productForm.elements.image.value.trim();
  return defaultProductImage;
}

function parseColors(value) {
  return (value || "Black:#111111, Cream:#f6efe4, Green:#0f766e")
    .split(",")
    .map((entry, index) => {
      const [rawName, rawValue] = entry.split(":");
      const name = (rawName || `Color ${index + 1}`).trim();
      const value = (rawValue || ["#111111", "#f6efe4", "#0f766e"][index] || "#111111").trim();
      return { name, value, image: "" };
    })
    .filter((color) => color.name);
}

function writeColors(colors) {
  const existing = parseColors(productForm.elements.colorsText.value);
  const withImages = colors.map((color) => {
    const match = existing.find((item) => item.name === color.name);
    return { ...color, image: color.image || match?.image || "" };
  });
  productForm.elements.colorsText.value = withImages.map((color) => `${color.name}:${color.value}`).join(", ");
  productForm.dataset.colorImages = JSON.stringify(Object.fromEntries(withImages.map((color) => [color.name, color.image || ""])));
  renderColorChips(colors);
}

function renderColorChips(colors = parseColors(productForm.elements.colorsText.value)) {
  const images = getColorImages();
  colorChips.innerHTML = "";
  colors.forEach((color) => {
    color.image = color.image || images[color.name] || "";
    const chip = document.createElement("span");
    chip.className = "color-chip";
    chip.dataset.colorName = color.name;
    chip.dataset.colorValue = color.value;
    chip.innerHTML = `
      <span style="background:${color.value}"></span>
      ${color.name}
      <button type="button" data-remove-color="${color.name}">x</button>
    `;
    colorChips.append(chip);
  });
}

function parseSizes(value) {
  return (value || "S, M, L, XL")
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
}

function getColorImages() {
  try {
    return JSON.parse(productForm.dataset.colorImages || "{}");
  } catch {
    return {};
  }
}

function setColorImage(colorName, image) {
  const images = getColorImages();
  images[colorName] = image;
  productForm.dataset.colorImages = JSON.stringify(images);
  updateActiveColorEditor(colorName);
}

function updateActiveColorEditor(colorName) {
  activeColorForImage = colorName;
  const images = getColorImages();
  activeColorName.textContent = `ຮູບສີ: ${colorName}`;
  activeColorPreview.src = images[colorName] || selectedImageData || productForm.elements.image.value || defaultProductImage;
  colorImageEditor.hidden = false;
}

function renderVariantRows(variants) {
  variantTable.innerHTML = "";
  variants.forEach((variant) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <span class="variant-color">
          <span style="background:${variant.colorValue}"></span>
          ${variant.colorName}
        </span>
      </td>
      <td>${variant.size}</td>
      <td>
        <input type="number" min="0" step="1" value="${variant.stock || 0}"
          data-color-name="${variant.colorName}"
          data-color-value="${variant.colorValue}"
          data-size="${variant.size}">
      </td>
    `;
    variantTable.append(row);
  });
  syncTotalStock();
}

function cleanNumberInput(input) {
  const normalized = input.value.replace(/^0+(?=\d)/, "");
  if (input.value !== normalized) input.value = normalized;
}

function clearZeroOnFocus(input) {
  if (input.value === "0") input.value = "";
}

function buildVariantsFromFields(existing = []) {
  const colors = parseColors(productForm.elements.colorsText.value);
  const sizes = parseSizes(productForm.elements.sizesText.value);
  return colors.flatMap((color) => sizes.map((size) => {
    const match = existing.find((variant) => variant.colorName === color.name && variant.size === size);
    return {
      colorName: color.name,
      colorValue: color.value,
      size,
      stock: Number(match?.stock || 0),
    };
  }));
}

function readVariantsFromTable() {
  return [...variantTable.querySelectorAll("input")].map((input) => ({
    colorName: input.dataset.colorName,
    colorValue: input.dataset.colorValue,
    size: input.dataset.size,
    stock: Number(input.value || 0),
  }));
}

function syncTotalStock() {
  const total = readVariantsFromTable().reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  productForm.elements.stock.value = total;
}

function getFormProduct() {
  const data = Object.fromEntries(new FormData(productForm).entries());
  const existingByName = CaptainStore.getProducts().find((product) => (
    product.name.trim().toLowerCase() === data.name.trim().toLowerCase()
  ));
  const id = data.id || existingByName?.id || `C21-${Date.now().toString().slice(-7)}`;
  const category = data.category || "tops";
  const colors = parseColors(data.colorsText);
  const sizes = parseSizes(data.sizesText);
  const mainImage = getCurrentMainImage();
  const variants = readVariantsFromTable().length
    ? readVariantsFromTable()
    : buildVariantsFromFields();
  const colorImages = getColorImages();
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

  return {
    id,
    name: data.name.trim(),
    category,
    label: labels[category],
    price: Number(String(data.price || "0").replace(/[^\d.]/g, "")),
    stock,
    description: data.description.trim() || "ສິນຄ້າ CAPTAIN21",
    sizes,
    colors: colors.map((color) => ({
      ...color,
      image: colorImages[color.name] || mainImage,
    })),
    variants,
    image: mainImage,
  };
}

function clearForm() {
  productForm.reset();
  productForm.elements.id.value = "";
  selectedImageData = "";
  activeColorForImage = "";
  productForm.dataset.colorImages = "{}";
  colorImageEditor.hidden = true;
  imagePreview.src = defaultProductImage;
  productForm.elements.colorsText.value = "Black:#111111, Cream:#f6efe4, Green:#0f766e";
  productForm.elements.sizesText.value = "S, M, L, XL";
  renderColorChips();
  renderVariantRows(buildVariantsFromFields());
  productForm.querySelector("button[type='submit']").textContent = "ບັນທຶກສິນຄ້າ";
}

function editProduct(id) {
  const product = CaptainStore.getProducts().find((item) => item.id === id);
  if (!product) return;

  productForm.elements.id.value = product.id;
  productForm.elements.name.value = product.name;
  productForm.elements.category.value = product.category;
  productForm.elements.price.value = product.price;
  productForm.elements.stock.value = product.stock;
  productForm.elements.colorsText.value = product.colors.map((color) => `${color.name}:${color.value}`).join(", ");
  productForm.dataset.colorImages = JSON.stringify(Object.fromEntries(product.colors.map((color) => [color.name, color.image || product.image])));
  productForm.elements.sizesText.value = product.sizes.join(", ");
  renderColorChips(product.colors);
  activeColorForImage = "";
  colorImageEditor.hidden = true;
  productForm.elements.image.value = product.image;
  selectedImageData = product.image.startsWith("data:image/") ? product.image : "";
  imagePreview.src = product.image;
  productForm.elements.description.value = product.description;
  renderVariantRows(product.variants);
  productForm.querySelector("button[type='submit']").textContent = "ອັບເດດສິນຄ້າ";
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteProduct(id) {
  const products = CaptainStore.getProducts().filter((product) => product.id !== id);
  CaptainStore.saveProducts(products);
  renderAll();
}

function getVariantStock(product, colorName, size) {
  const variant = product.variants.find((item) => item.colorName === colorName && item.size === size);
  return Number(variant?.stock || 0);
}

function updateStockCurrent() {
  const product = CaptainStore.getProducts().find((item) => item.id === stockForm.elements.productId.value);
  if (!product) return;
  const colorName = stockForm.elements.colorName.value;
  const size = stockForm.elements.size.value;
  document.querySelector("[data-stock-current]").textContent = `ສະຕ໊ອກປັດຈຸບັນ: ${getVariantStock(product, colorName, size)} ຊິ້ນ`;
}

function openStockDialog(productId) {
  const product = CaptainStore.getProducts().find((item) => item.id === productId);
  if (!product) return;

  stockForm.reset();
  stockForm.elements.productId.value = product.id;
  document.querySelector("[data-stock-product-name]").textContent = product.name;

  const colorSelect = stockForm.elements.colorName;
  const sizeSelect = stockForm.elements.size;
  colorSelect.innerHTML = "";
  sizeSelect.innerHTML = "";

  product.colors.forEach((color) => {
    const option = document.createElement("option");
    option.value = color.name;
    option.textContent = color.name;
    colorSelect.append(option);
  });

  product.sizes.forEach((size) => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    sizeSelect.append(option);
  });

  updateStockCurrent();
  stockDialog.showModal();
}

function renderMetrics(products, orders) {
  const totalSales = orders.reduce((sum, order) => sum + Number(order.totals?.total || 0), 0);
  const stockCount = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) <= 3).length;

  document.querySelector("[data-total-sales]").textContent = formatLak(totalSales);
  document.querySelector("[data-order-count]").textContent = orders.length;
  document.querySelector("[data-stock-count]").textContent = stockCount;
  document.querySelector("[data-low-stock]").textContent = lowStock;
}

function renderProducts() {
  const query = adminSearch.value.trim().toLowerCase();
  const products = CaptainStore.getProducts().filter((product) => (
    `${product.name} ${product.label}`.toLowerCase().includes(query)
  ));

  productTable.innerHTML = "";
  if (!products.length) {
    productTable.innerHTML = '<tr><td colspan="5">ບໍ່ມີສິນຄ້າ</td></tr>';
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");
    const stockClass = product.stock <= 3 ? "stock-pill low" : "stock-pill";
    const productImage = isUsableImage(product.image) ? product.image : product.colors?.[0]?.image || defaultProductImage;
    row.innerHTML = `
      <td>
        <div class="product-cell">
          <img src="${productImage}" alt="${product.name}" onerror="this.src='${defaultProductImage}'">
          <div>
            <strong>${product.name}</strong>
            <div>${product.id}</div>
          </div>
        </div>
      </td>
      <td>${product.label}</td>
      <td>${formatLak(product.price)}</td>
      <td><span class="${stockClass}">${product.stock}</span></td>
      <td>
        <div class="table-actions">
          <button class="table-button" type="button" data-stock="${product.id}">ເພີ່ມສະຕ໊ອກ</button>
          <button class="table-button" type="button" data-edit="${product.id}">ແກ້ໄຂ</button>
          <button class="table-button danger" type="button" data-delete="${product.id}">ລຶບ</button>
        </div>
      </td>
    `;
    productTable.append(row);
  });
}

function renderOrders() {
  const filter = orderFilter.value;
  const orders = CaptainStore.getOrders().filter((order) => filter === "all" || order.status === filter);
  orderList.innerHTML = "";

  if (!orders.length) {
    orderList.innerHTML = '<div class="empty-admin">ຍັງບໍ່ມີອໍເດີຈາກໜ້າຮ້ານ</div>';
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";
    const created = new Date(order.createdAt).toLocaleString("lo-LA");
    const items = order.items.map((item) => `<li>${item.name} x ${item.qty}</li>`).join("");
    const payment = order.payment || { method: "cod", status: "cod" };
    const slip = payment.slip
      ? `<a class="slip-link" href="${payment.slip}" target="_blank"><img src="${payment.slip}" alt="Payment slip"></a>`
      : "";

    card.innerHTML = `
      <div>
        <h3>${order.orderNo}</h3>
        <div class="order-meta">
          <span>${created}</span>
          <span>${order.customer?.name || "-"}</span>
          <span>${order.customer?.phone || "-"}</span>
          <span class="status-pill">${statusLabels[order.status] || order.status}</span>
        </div>
        <p>${order.customer?.address || ""}</p>
        <p class="payment-line">${paymentLabels[payment.method] || payment.method} · ${paymentStatusLabels[payment.status] || payment.status}</p>
        ${slip}
        <ol class="order-items">${items}</ol>
      </div>
      <div class="order-actions">
        <strong>${formatLak(order.totals?.total || 0)}</strong>
        <select data-status="${order.orderNo}">
          <option value="new">ອໍເດີໃໝ່</option>
          <option value="paid">ຊຳລະແລ້ວ</option>
          <option value="packed">ຈັດສົ່ງແລ້ວ</option>
        </select>
        <button class="table-button danger" type="button" data-delete-order="${order.orderNo}">ລຶບອໍເດີ</button>
      </div>
    `;
    card.querySelector("[data-status]").value = order.status;
    orderList.append(card);
  });
}

function renderAll() {
  const products = CaptainStore.getProducts();
  const orders = CaptainStore.getOrders();
  renderMetrics(products, orders);
  renderProducts();
  renderOrders();
}

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextProduct = getFormProduct();
  const products = CaptainStore.getProducts();
  const exists = products.some((product) => (
    product.id === nextProduct.id ||
    product.name.trim().toLowerCase() === nextProduct.name.trim().toLowerCase()
  ));
  const nextProducts = exists
    ? products.map((product) => (
      product.id === nextProduct.id ||
      product.name.trim().toLowerCase() === nextProduct.name.trim().toLowerCase()
        ? nextProduct
        : product
    ))
    : [nextProduct, ...products];

  CaptainStore.saveProducts(nextProducts);
  clearForm();
  renderAll();
});

document.querySelector("[data-clear-form]").addEventListener("click", clearForm);
adminSearch.addEventListener("input", renderProducts);
orderFilter.addEventListener("input", renderOrders);
productForm.elements.image.addEventListener("input", (event) => {
  if (selectedImageData) return;
  imagePreview.src = event.target.value || defaultProductImage;
});

productForm.elements.price.addEventListener("input", (event) => {
  const cleanValue = event.target.value.replace(/[^\d]/g, "");
  if (event.target.value !== cleanValue) event.target.value = cleanValue;
});

productForm.elements.imageFile.addEventListener("click", (event) => {
  event.target.value = "";
});

productForm.elements.imageFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const image = await prepareImageFile(file);
  setMainProductImage(image);
  if (activeColorForImage) setColorImage(activeColorForImage, image);
});

document.querySelector("[data-build-variants]").addEventListener("click", () => {
  renderVariantRows(buildVariantsFromFields(readVariantsFromTable()));
});

variantTable.addEventListener("focusin", (event) => {
  if (event.target.matches("input[type='number']")) {
    clearZeroOnFocus(event.target);
  }
});

variantTable.addEventListener("input", (event) => {
  if (event.target.matches("input[type='number']")) {
    cleanNumberInput(event.target);
  }
  syncTotalStock();
});
productForm.elements.colorsText.addEventListener("input", () => {
  renderColorChips();
});

document.querySelector("[data-add-color]").addEventListener("click", () => {
  const name = colorNameInput.value.trim();
  const value = colorValueInput.value;
  if (!name) return;
  const colors = parseColors(productForm.elements.colorsText.value)
    .filter((color) => color.name.toLowerCase() !== name.toLowerCase());
  writeColors([...colors, { name, value }]);
  colorNameInput.value = "";
  renderVariantRows(buildVariantsFromFields(readVariantsFromTable()));
});

colorChips.addEventListener("click", (event) => {
  const name = event.target.dataset.removeColor;
  const chip = event.target.closest(".color-chip");
  if (!name && chip) {
    colorNameInput.value = chip.dataset.colorName;
    colorValueInput.value = chip.dataset.colorValue;
    updateActiveColorEditor(chip.dataset.colorName);
    return;
  }
  if (!name) return;
  const colors = parseColors(productForm.elements.colorsText.value)
    .filter((color) => color.name !== name);
  const images = getColorImages();
  delete images[name];
  productForm.dataset.colorImages = JSON.stringify(images);
  writeColors(colors.length ? colors : parseColors("Black:#111111, Cream:#f6efe4, Green:#0f766e"));
  renderVariantRows(buildVariantsFromFields(readVariantsFromTable()));
});

activeColorFile.addEventListener("click", (event) => {
  event.target.value = "";
});

activeColorFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file || !activeColorForImage) return;
  const image = await prepareImageFile(file);
  setColorImage(activeColorForImage, image);
  const firstColor = parseColors(productForm.elements.colorsText.value)[0]?.name;
  const mainImage = productForm.elements.image.value;
  if (!selectedImageData || !mainImage || mainImage === defaultProductImage || activeColorForImage === firstColor) {
    setMainProductImage(image);
  }
});

document.querySelector("[data-preset-colors]").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  colorNameInput.value = button.dataset.colorNamePreset;
  colorValueInput.value = button.dataset.colorValuePreset;
});

productTable.addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  const stockId = event.target.dataset.stock;
  if (editId) editProduct(editId);
  if (deleteId) deleteProduct(deleteId);
  if (stockId) openStockDialog(stockId);
});

orderList.addEventListener("input", (event) => {
  const orderNo = event.target.dataset.status;
  if (!orderNo) return;
  CaptainStore.updateOrderStatus(orderNo, event.target.value);
  renderAll();
});

orderList.addEventListener("click", (event) => {
  const orderNo = event.target.dataset.deleteOrder;
  if (!orderNo) return;
  CaptainStore.deleteOrder(orderNo);
  renderAll();
});

document.querySelector("[data-reset-demo]").addEventListener("click", () => {
  CaptainStore.resetDemo();
  clearForm();
  renderAll();
});

document.querySelector("[data-close-stock]").addEventListener("click", () => {
  stockDialog.close();
});

stockForm.elements.colorName.addEventListener("input", updateStockCurrent);
stockForm.elements.size.addEventListener("input", updateStockCurrent);
stockForm.elements.quantity.addEventListener("focus", (event) => {
  clearZeroOnFocus(event.target);
});
stockForm.elements.quantity.addEventListener("input", (event) => {
  cleanNumberInput(event.target);
});

stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  CaptainStore.addStock(
    stockForm.elements.productId.value,
    stockForm.elements.colorName.value,
    stockForm.elements.size.value,
    stockForm.elements.quantity.value,
  );
  stockDialog.close();
  renderAll();
});

renderAll();
clearForm();
