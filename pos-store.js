const SUPABASE_URL = "https://aoimaluvplwbdqpcgkgi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaW1hbHV2cGx3YmRxcGNna2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTM0NzEsImV4cCI6MjA5Mzc4OTQ3MX0.uUkRmTFrU0XuGDYlhIAR7UvqWrE0ylNW-RdZtCJDTGQ";

const categoryLabels = {
  tops: "เสื้อ",
  dresses: "เดรส",
  outerwear: "แจ็กเก็ต",
  bottoms: "โส้ง/กระโปรง",
};

const defaultProductImage = "assets/products/captain-shirt.jpeg";
let supabaseClient = null;
let productsCache = [];
let ordersCache = [];

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase?.createClient) {
    throw new Error("Supabase SDK is not loaded. Check the CDN script before pos-store.js.");
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeProduct(row = {}) {
  const category = row.category || "tops";
  const image = row.image || row.image_url || defaultProductImage;
  const colors = parseJsonArray(row.colors, [{ name: "ทั่วไป", value: "#111111", image }])
    .map((color) => (typeof color === "string" ? { name: color, value: "#111111", image } : { ...color, image: color.image || image }));
  const sizes = parseJsonArray(row.sizes, ["Free Size"]);
  const variants = parseJsonArray(row.variants, []);
  const stock = Number(row.stock ?? variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0));

  return {
    ...row,
    id: String(row.id),
    name: row.name || "CAPTAIN21 Product",
    category,
    label: row.label || categoryLabels[category] || category,
    price: Number(row.price || 0),
    stock,
    description: row.description || "สินค้า CAPTAIN21",
    sizes,
    colors,
    variants,
    image,
    image_url: image,
  };
}

function normalizeOrder(row = {}) {
  const orderNo = row.order_no || row.orderNo || row.id || `C21-${Date.now().toString().slice(-6)}`;
  const customer = row.customer || {
    name: row.customer_name || "",
    phone: row.customer_phone || "",
    address: row.address || "",
  };
  const totals = row.totals || {
    total: Number(row.total_amount || 0),
  };
  const payment = row.payment || {
    method: row.payment_method || "cod",
    status: row.payment_status || row.status || "pending_review",
    slip: row.payment_slip || "",
  };

  return {
    ...row,
    orderNo: String(orderNo),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    customer,
    items: parseJsonArray(row.items, []),
    totals,
    payment,
    status: row.status || "new",
  };
}

function productToRow(product) {
  const normalized = normalizeProduct(product);
  return {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    label: normalized.label,
    price: normalized.price,
    stock: normalized.stock,
    description: normalized.description,
    sizes: normalized.sizes,
    colors: normalized.colors,
    variants: normalized.variants,
    image: normalized.image,
    image_url: normalized.image_url,
  };
}

function orderToRow(order) {
  return {
    customer_name: order.customer?.name || "",
    customer_phone: order.customer?.phone || "",
    address: order.customer?.address || "",
    items: order.items || [],
    total_amount: Number(order.totals?.total || 0),
    status: order.status || "new",
    payment_method: order.payment?.method || "cod",
  };
}

async function runSupabase(label, callback) {
  try {
    return await callback(getSupabaseClient());
  } catch (error) {
    console.error(`${label}:`, error.message || error);
    throw error;
  }
}

const CaptainStore = {
  async loadProducts() {
    return runSupabase("Load products failed", async (client) => {
      const { data, error } = await client.from("products").select("*").order("id", { ascending: true });
      if (error) throw error;
      productsCache = (data || []).map(normalizeProduct);
      return productsCache;
    });
  },

  async loadOrders() {
    return runSupabase("Load orders failed", async (client) => {
      const { data, error } = await client.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      ordersCache = (data || []).map(normalizeOrder);
      return ordersCache;
    });
  },

  async loadAll() {
    await Promise.all([this.loadProducts(), this.loadOrders()]);
    return { products: productsCache, orders: ordersCache };
  },

  getProducts() {
    return productsCache;
  },

  getOrders() {
    return ordersCache;
  },

  async saveProducts(products) {
    productsCache = products.map(normalizeProduct);
    return runSupabase("Save products failed", async (client) => {
      const { error } = await client.from("products").upsert(productsCache.map(productToRow));
      if (error) throw error;
      return productsCache;
    });
  },

  async saveOrders(orders) {
    ordersCache = orders.map(normalizeOrder);
    return runSupabase("Save orders failed", async (client) => {
      const { error } = await client.from("orders").upsert(ordersCache.map(orderToRow));
      if (error) throw error;
      return ordersCache;
    });
  },

  async createOrder(orderData) {
    const order = normalizeOrder({
      orderNo: `C21-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer: orderData.customer || {
        name: orderData.customerName || "",
        phone: orderData.customerPhone || "",
        address: orderData.address || "",
      },
      items: orderData.items || [],
      totals: orderData.totals || { total: Number(orderData.totalAmount || 0) },
      payment: orderData.payment || { method: orderData.paymentMethod || "cod", status: "cod", slip: "" },
      status: "new",
    });

    const savedOrder = await runSupabase("Create order failed", async (client) => {
      const { data, error } = await client.from("orders").insert([orderToRow(order)]).select("*").single();
      if (error) throw error;
      return normalizeOrder(data);
    });
    order.orderNo = savedOrder.orderNo;

    for (const item of order.items) {
      const productId = String(item.sku || item.id || "");
      const qty = Number(item.qty || item.quantity || 0);
      const product = productsCache.find((entry) => String(entry.id) === productId);
      if (!product || qty <= 0) continue;
      product.stock = Math.max(0, Number(product.stock || 0) - qty);
      if (Array.isArray(product.variants) && item.size && item.color) {
        product.variants = product.variants.map((variant) => (
          String(variant.size) === String(item.size) && String(variant.colorName) === String(item.color)
            ? { ...variant, stock: Math.max(0, Number(variant.stock || 0) - qty) }
            : variant
        ));
      }
      try {
        await runSupabase("Update stock failed", async (client) => {
          const { error } = await client
            .from("products")
            .update({ stock: product.stock, variants: product.variants })
            .eq("id", product.id);
          if (error) throw error;
        });
      } catch (error) {
        console.warn("Order was saved, but stock could not be updated:", error.message || error);
      }
    }

    ordersCache = [order, ...ordersCache];
    return { ok: true, orderNo: order.orderNo, order };
  },

  async updateOrderStatus(orderNo, status) {
    ordersCache = ordersCache.map((order) => (order.orderNo === orderNo ? { ...order, status } : order));
    return runSupabase("Update order status failed", async (client) => {
      const { error } = await client.from("orders").update({ status }).eq("id", orderNo);
      if (error) throw error;
    });
  },

  async deleteOrder(orderNo) {
    ordersCache = ordersCache.filter((order) => order.orderNo !== orderNo);
    return runSupabase("Delete order failed", async (client) => {
      const { error } = await client.from("orders").delete().eq("id", orderNo);
      if (error) throw error;
    });
  },

  async addStock(productId, colorName, size, quantity) {
    const amount = Number(quantity || 0);
    const product = productsCache.find((item) => String(item.id) === String(productId));
    if (!product || amount <= 0) return;

    product.variants = product.variants.map((variant) => (
      variant.colorName === colorName && variant.size === size
        ? { ...variant, stock: Number(variant.stock || 0) + amount }
        : variant
    ));
    product.stock = product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
    await this.saveProducts(productsCache);
  },

  async resetDemo() {
    await this.loadAll();
  },
};

window.CaptainStore = CaptainStore;
window.supabaseClient = getSupabaseClient();


