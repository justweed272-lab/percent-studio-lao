const CAPTAIN_STORAGE_KEYS = {
  products: "captain21.products",
  orders: "captain21.orders",
};

const CAPTAIN_DEFAULT_PRODUCTS = [
  {
    id: "C21-F1-001",
    name: "F1 Shirt",
    category: "tops",
    label: "ເສື້ອ",
    price: 300000,
    stock: 200,
    description: "ເສື້ອ F1 ຜ້ານຸ່ມ ໃສ່ສະບາຍ",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      {
        name: "Black",
        value: "#111111",
        image: "assets/products/f1-shirt.jpeg",
      },
      {
        name: "White",
        value: "#f7f3e8",
        image: "assets/products/f1-shirt-alt.jpeg",
      },
    ],
    variants: [
      { colorName: "Black", colorValue: "#111111", size: "S", stock: 50 },
      { colorName: "Black", colorValue: "#111111", size: "M", stock: 50 },
      { colorName: "Black", colorValue: "#111111", size: "L", stock: 50 },
      { colorName: "Black", colorValue: "#111111", size: "XL", stock: 50 },
      { colorName: "White", colorValue: "#f7f3e8", size: "S", stock: 0 },
      { colorName: "White", colorValue: "#f7f3e8", size: "M", stock: 0 },
      { colorName: "White", colorValue: "#f7f3e8", size: "L", stock: 0 },
      { colorName: "White", colorValue: "#f7f3e8", size: "XL", stock: 0 },
    ],
    image: "assets/products/f1-shirt.jpeg",
  },
  {
    id: "C21-TOP-001",
    name: "Captain Shirt",
    category: "tops",
    label: "ເສື້ອ",
    price: 225000,
    stock: 100,
    description: "ເສື້ອ CAPTAIN21 ສີຂາວແຂນຂຽວ ລາຍປັກດ້ານຫຼັງ",
    colors: ["#f7f3e8", "#0c3f2d", "#d94d6a"],
    image: "assets/products/captain-shirt.svg",
  },
  {
    id: "C21-TOP-101",
    name: "Linen Relax Shirt",
    category: "tops",
    label: "ເສື້ອ",
    price: 129000,
    stock: 18,
    description: "ເສື້ອເຊີດລິນິນຊົງຫຼວມ ໃສ່ງ່າຍສຳລັບໄປເຮັດວຽກ ແລະ ມື້ພັກຜ່ອນ",
    colors: ["#f6efe4", "#1f3d36", "#d8b26e"],
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "C21-DRS-204",
    name: "Midi Wrap Dress",
    category: "dresses",
    label: "ເດຣສ",
    price: 189000,
    stock: 9,
    description: "ເດຣສຜູກແອວຄວາມຍາວກາງນ່ອງ ເນື້ອຜ້ານຸ່ມ ແລະ ລະບາຍອາກາດດີ",
    colors: ["#182622", "#9b3b4f", "#e7d9c4"],
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "C21-OUT-311",
    name: "City Cropped Jacket",
    category: "outerwear",
    label: "ແຈັກເກັດ",
    price: 249000,
    stock: 6,
    description: "ແຈັກເກັດຄຣອບຊົງຄົມ ເໝາະກັບລຸກ smart casual",
    colors: ["#232323", "#c8862c", "#6e8f8b"],
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "C21-BOT-144",
    name: "Wide Leg Tailored Pants",
    category: "bottoms",
    label: "ໂສ້ງ",
    price: 159000,
    stock: 15,
    description: "ໂສ້ງຂາກວ້າງແອວສູງ ຕັດເຢັບຮຽບງ່າຍ ໃສ່ຊ້ຳໄດ້ທຸກອາທິດ",
    colors: ["#111111", "#bbb1a2", "#35524a"],
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "C21-TOP-172",
    name: "Rib Knit Tank",
    category: "tops",
    label: "ເສື້ອ",
    price: 69000,
    stock: 24,
    description: "ເສື້ອກ້າມໄໝພົມ rib knit ໃສ່ດ່ຽວ ຫຼື ເລເຢີກັບແຈັກເກັດ",
    colors: ["#faf4e8", "#59706c", "#b96b77"],
    image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "C21-BOT-220",
    name: "Pleated Satin Skirt",
    category: "bottoms",
    label: "ກະໂປງ",
    price: 139000,
    stock: 11,
    description: "ກະໂປງພລີດຜ້າຊາຕິນ ນ້ຳໜັກເບົາ ເຄື່ອນໄຫວສວຍ",
    colors: ["#d4af37", "#1d2939", "#f4d6d8"],
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a13d24?auto=format&fit=crop&w=900&q=80",
  },
];

const DEFAULT_PRODUCT_IMAGE = "assets/products/captain-shirt.svg";

function cleanImageSource(image) {
  if (!image || image.includes("fakepath") || image.endsWith("captain-shirt.jpeg")) {
    return DEFAULT_PRODUCT_IMAGE;
  }
  if (image.endsWith("f1-shirt.svg")) {
    return "assets/products/f1-shirt.jpeg";
  }
  return image;
}

function normalizeProduct(product) {
  const productImage = cleanImageSource(product.image);
  const colorValues = product.colors?.length ? product.colors : ["#111111", "#f6efe4", "#0f766e"];
  const colorNames = ["Black", "Cream", "Green", "Rose", "Gold"];
  const colors = colorValues.map((color, index) => {
    const normalized = typeof color === "string"
      ? { name: colorNames[index] || `Color ${index + 1}`, value: color }
      : color;
    return {
      ...normalized,
      image: cleanImageSource(normalized.image || productImage),
    };
  });
  const sizes = product.sizes?.length ? product.sizes : ["S", "M", "L", "XL"];
  const existingVariants = product.variants?.length ? product.variants : [];
  const variants = colors.flatMap((color, colorIndex) => sizes.map((size, sizeIndex) => {
    const existing = existingVariants.find((variant) => (
      variant.colorName === color.name && variant.size === size
    ));
    const migratedStock = colorIndex === 0 && sizeIndex === 0 ? Number(product.stock || 0) : 0;
    return {
      colorName: color.name,
      colorValue: color.value,
      size,
      stock: Number(existing?.stock ?? migratedStock),
    };
  }));
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

  return {
    ...product,
    image: productImage,
    sizes,
    colors,
    variants,
    stock,
  };
}

const CaptainStore = {
  read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  getProducts() {
    const products = this.read(CAPTAIN_STORAGE_KEYS.products, null);
    const defaults = CAPTAIN_DEFAULT_PRODUCTS.map(normalizeProduct);
    if (products?.length) {
      const normalizedProducts = products.map(normalizeProduct);
      const merged = [
        ...defaults.filter((defaultProduct) => (
          !normalizedProducts.some((product) => product.id === defaultProduct.id || product.name === defaultProduct.name)
        )),
        ...normalizedProducts,
      ];
      this.write(CAPTAIN_STORAGE_KEYS.products, merged);
      return merged;
    }
    this.write(CAPTAIN_STORAGE_KEYS.products, defaults);
    return defaults;
  },
  saveProducts(products) {
    this.write(CAPTAIN_STORAGE_KEYS.products, products);
  },
  getOrders() {
    return this.read(CAPTAIN_STORAGE_KEYS.orders, []);
  },
  saveOrders(orders) {
    this.write(CAPTAIN_STORAGE_KEYS.orders, orders);
  },
  createOrder(order) {
    const products = this.getProducts();
    const orders = this.getOrders();
    const orderNo = `C21-${Date.now().toString().slice(-6)}`;
    const savedOrder = {
      ...order,
      orderNo,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    const nextProducts = products.map((product) => {
      const variants = product.variants.map((variant) => {
        const soldQty = order.items
          .filter((item) => (
            item.sku === product.id &&
            item.size === variant.size &&
            item.color === variant.colorName
          ))
          .reduce((sum, item) => sum + Number(item.qty), 0);
        if (!soldQty) return variant;
        return { ...variant, stock: Math.max(0, Number(variant.stock) - soldQty) };
      });
      return normalizeProduct({ ...product, variants });
    });

    this.saveProducts(nextProducts);
    this.saveOrders([savedOrder, ...orders]);
    return savedOrder;
  },
  updateOrderStatus(orderNo, status) {
    const orders = this.getOrders().map((order) => (
      order.orderNo === orderNo ? { ...order, status } : order
    ));
    this.saveOrders(orders);
  },
  deleteOrder(orderNo) {
    const orders = this.getOrders();
    const order = orders.find((item) => item.orderNo === orderNo);
    if (!order) return;

    const products = this.getProducts().map((product) => {
      const variants = product.variants.map((variant) => {
        const returnedQty = order.items
          .filter((item) => (
            item.sku === product.id &&
            item.size === variant.size &&
            item.color === variant.colorName
          ))
          .reduce((sum, item) => sum + Number(item.qty), 0);
        if (!returnedQty) return variant;
        return { ...variant, stock: Number(variant.stock) + returnedQty };
      });
      return normalizeProduct({ ...product, variants });
    });

    this.saveProducts(products);
    this.saveOrders(orders.filter((item) => item.orderNo !== orderNo));
  },
  addStock(productId, colorName, size, quantity) {
    const qty = Math.max(0, Number(quantity || 0));
    if (!qty) return;

    const products = this.getProducts().map((product) => {
      if (product.id !== productId) return product;
      const variants = product.variants.map((variant) => (
        variant.colorName === colorName && variant.size === size
          ? { ...variant, stock: Number(variant.stock || 0) + qty }
          : variant
      ));
      return normalizeProduct({ ...product, variants });
    });
    this.saveProducts(products);
  },
  resetDemo() {
    this.saveProducts(CAPTAIN_DEFAULT_PRODUCTS);
    this.saveOrders([]);
  },
};
