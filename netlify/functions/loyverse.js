const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function requireConfig() {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  const storeId = process.env.LOYVERSE_STORE_ID;
  const paymentTypeId = process.env.LOYVERSE_PAYMENT_TYPE_ID;

  if (!token || !storeId || !paymentTypeId) {
    return {
      error: "Missing Loyverse env vars. Set LOYVERSE_ACCESS_TOKEN, LOYVERSE_STORE_ID, and LOYVERSE_PAYMENT_TYPE_ID.",
    };
  }

  return { token, storeId, paymentTypeId };
}

async function loyverseFetch(path, options = {}) {
  const config = requireConfig();
  if (config.error) {
    return { configError: config.error };
  }

  const response = await fetch(`${LOYVERSE_API_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    return { apiError: data || { message: response.statusText }, status: response.status };
  }

  return { data, config };
}

function toStoreProduct(item) {
  const variant = item.variants?.[0] || {};
  const inventory = variant.stores?.[0] || {};

  return {
    id: variant.variant_id || item.id,
    loyverseItemId: item.id,
    loyverseVariantId: variant.variant_id,
    name: item.item_name || item.name || "Loyverse Item",
    category: "tops",
    label: item.category_name || "ສິນຄ້າ",
    price: Number(variant.default_price || item.default_price || 0),
    stock: Number(inventory.in_stock || inventory.available_for_sale || 0),
    description: item.description || "ສິນຄ້າຈາກ Loyverse",
    colors: ["#111111", "#f6efe4", "#0f766e"],
    image: item.image_url || "assets/captain21-logo.jpeg",
  };
}

async function listProducts() {
  const result = await loyverseFetch("/items");
  if (result.configError) return json(500, { error: result.configError });
  if (result.apiError) return json(result.status, { error: result.apiError });

  const items = result.data?.items || [];
  return json(200, { products: items.map(toStoreProduct) });
}

function toReceiptPayload(order, config) {
  return {
    source: "CAPTAIN21 web store",
    store_id: config.storeId,
    receipt_date: new Date().toISOString(),
    line_items: order.items.map((item) => ({
      variant_id: item.sku,
      quantity: item.qty,
      price: item.unitPrice,
    })),
    payments: [
      {
        payment_type_id: config.paymentTypeId,
        paid_at: new Date().toISOString(),
        amount: order.totals.total,
      },
    ],
    note: [
      `Customer: ${order.customer.name}`,
      `Phone: ${order.customer.phone}`,
      `Address: ${order.customer.address}`,
    ].join("\n"),
  };
}

async function createReceipt(event) {
  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!order.items?.length) {
    return json(400, { error: "Order requires at least one item" });
  }

  const config = requireConfig();
  if (config.error) return json(500, { error: config.error });

  const result = await loyverseFetch("/receipts", {
    method: "POST",
    body: JSON.stringify(toReceiptPayload(order, config)),
  });

  if (result.apiError) return json(result.status, { error: result.apiError });

  return json(200, {
    ok: true,
    orderNo: result.data?.receipt_number || result.data?.id || `LOY-${Date.now().toString().slice(-6)}`,
    receipt: result.data,
  });
}

exports.handler = async (event) => {
  try {
    const route = event.path.split("/").pop();

    if (event.httpMethod === "GET" && route === "products") {
      return listProducts();
    }

    if (event.httpMethod === "POST" && route === "orders") {
      return createReceipt(event);
    }

    return json(404, { error: "Route not found" });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
