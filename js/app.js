const session = requireAuth();
let state = loadState();
let html5QrScanner = null;
let isCameraScanning = false;
let posQrScanner = null;
let posCameraActive = false;
let posCart = [];
let sessionReceipts = [];

const pageTitles = {
  dashboard: "Dashboard",
  checkout: "POS Checkout",
  products: "Products",
  sales: "Sales Processing",
  inventory: "Inventory & Expenses",
  reports: "Reports & Profit and Loss",
  customers: "Customers",
  users: "Users & Audit Trail",
  settings: "System Settings"
};

function initShell() {
  document.getElementById("user-badge").textContent = `${session.name} (${session.role})`;
  document.getElementById("logout-btn").addEventListener("click", logoutUser);

  // Restrict Owner-only tabs
  if (session.role !== "Owner") {
    document.querySelectorAll(".owner-only").forEach((el) => el.classList.add("hidden"));
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if ((tab === "users" || tab === "settings") && session.role !== "Owner") {
        alert("Owner access required.");
        return;
      }
      switchTab(tab);
    });
  });

  renderAll();
}

function switchTab(tabName) {
  if (tabName !== "sales" && isCameraScanning) {
    stopCameraScanner();
  }
  if (tabName !== "checkout" && posCameraActive) {
    stopPosCamera();
  }

  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
  });
  document.getElementById("page-title").textContent = pageTitles[tabName] || "CCMC RTW Shop";
  renderAll();

  if (tabName === "sales") {
    document.getElementById("sale-sku-scan")?.focus();
  } else if (tabName === "checkout") {
    document.getElementById("pos-sku-input")?.focus();
  }
}

function renderAll() {
  state = loadState();
  renderDashboard();
  renderCheckoutModule();
  renderProducts();
  populateSalesAndInventoryDropdowns();
  renderSalesLedger();
  renderStockHistory();
  renderReports();
  renderCustomers();
  renderUsersAndAudit();
  renderSettings();
}

// === POS CHECKOUT MODULE ===
function setCheckoutBanner(msg, type = "info") {
  const el = document.getElementById("checkout-banner");
  if (!el) return;
  el.classList.remove("hidden", "alert-info", "alert-error");
  el.classList.add(type === "error" ? "alert-error" : "alert-info");
  el.textContent = msg;
}

function findCatalogItem(rawSku) {
  const code = String(rawSku || "").trim().toUpperCase();
  return state.products.find((p) => p.sku.toUpperCase() === code) || null;
}

function addPosItemToCart(sku, qtyToAdd = 1) {
  const prod = findCatalogItem(sku);
  const scanMsg = document.getElementById("pos-scan-feedback");
  const qty = Math.max(1, parseInt(qtyToAdd, 10) || 1);

  if (!prod) {
    if (scanMsg) scanMsg.textContent = `SKU "${String(sku || "").trim().toUpperCase()}" not found.`;
    setCheckoutBanner("Product SKU not found in catalog.", "error");
    return false;
  }

  if (prod.stock <= 0) {
    if (scanMsg) scanMsg.textContent = `${prod.name} is out of stock.`;
    setCheckoutBanner(`${prod.name} is out of stock.`, "error");
    return false;
  }

  const existing = posCart.find((i) => i.sku === prod.sku);
  const inCart = existing ? existing.qty : 0;

  if (inCart + qty > prod.stock) {
    setCheckoutBanner(`Only ${prod.stock} in stock for ${prod.name} (${inCart} already in cart).`, "error");
    return false;
  }

  if (existing) {
    existing.qty += qty;
  } else {
    posCart.push({
      sku: prod.sku,
      name: prod.name,
      sizeVariant: prod.sizeVariant,
      unitPrice: prod.sellingPrice,
      unitCost: prod.unitCost,
      qty
    });
  }

  if (scanMsg) scanMsg.textContent = `Added ${qty}x ${prod.name} (${prod.sku})`;
  renderCheckoutModule();
  return true;
}

function adjustPosQty(sku, delta) {
  const idx = posCart.findIndex((i) => i.sku === sku);
  if (idx === -1) return;

  const item = posCart[idx];
  const prod = findCatalogItem(sku);
  const nextQty = item.qty + delta;

  if (nextQty <= 0) {
    posCart.splice(idx, 1);
  } else if (prod && nextQty > prod.stock) {
    setCheckoutBanner(`Cannot exceed stock (${prod.stock}) for ${item.name}.`, "error");
    return;
  } else {
    item.qty = nextQty;
  }

  renderCheckoutModule();
}

function removePosItem(sku) {
  posCart = posCart.filter((i) => i.sku !== sku);
  renderCheckoutModule();
}

function renderPosDropdownsAndStock() {
  const custSelect = document.getElementById("pos-customer-select");
  const prodSelect = document.getElementById("pos-product-select");
  const stockTbody = document.getElementById("pos-stock-tbody");
  const tagsBox = document.getElementById("pos-quick-tags");

  if (custSelect) {
    const prevCust = custSelect.value;
    custSelect.innerHTML = state.customers
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    if (prevCust && state.customers.some((c) => c.id === prevCust)) {
      custSelect.value = prevCust;
    }
  }

  if (prodSelect) {
    const prevProd = prodSelect.value;
    prodSelect.innerHTML = state.products.length
      ? state.products
          .map(
            (p) =>
              `<option value="${p.sku}" ${p.stock <= 0 ? "disabled" : ""}>${p.sku} — ${p.name} (${p.sizeVariant}) [${p.stock} left | ${formatPeso(p.sellingPrice)}]</option>`
          )
          .join("")
      : `<option value="">No products in catalog</option>`;
    if (prevProd && state.products.some((p) => p.sku === prevProd)) {
      prodSelect.value = prevProd;
    }
  }

  if (stockTbody) {
    stockTbody.innerHTML = state.products.length
      ? state.products
          .map(
            (p) => `
            <tr>
              <td><strong>${p.sku}</strong></td>
              <td>${p.name} <small>(${p.sizeVariant})</small></td>
              <td>${formatPeso(p.sellingPrice)}</td>
              <td>${p.stock}</td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="kpi-sub">No products registered yet. Add items in Products first.</td></tr>`;
  }

  if (tagsBox) {
    tagsBox.innerHTML = state.products.length
      ? state.products
          .map(
            (p) => `
            <button type="button" class="tag-chip-btn" data-pos-tag="${p.sku}" ${p.stock <= 0 ? "disabled" : ""}>
              <div><strong>${p.sku}</strong></div>
              <div class="kpi-sub">${p.name} · ${formatPeso(p.sellingPrice)} (${p.stock})</div>
            </button>`
          )
          .join("")
      : `<p class="kpi-sub">Add products in the Products tab to generate quick-scan tags.</p>`;

    tagsBox.querySelectorAll("[data-pos-tag]").forEach((btn) => {
      btn.addEventListener("click", () => addPosItemToCart(btn.getAttribute("data-pos-tag"), 1));
    });
  }
}

function renderPosCartAndTotals() {
  const tbody = document.getElementById("pos-cart-tbody");
  const discInput = document.getElementById("pos-discount-input");
  const completeBtn = document.getElementById("pos-complete-btn");

  const subtotal = posCart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const rawDisc = Math.max(0, Number(discInput?.value) || 0);
  const discount = Math.min(rawDisc, subtotal);
  const totalDue = Math.max(0, subtotal - discount);

  if (tbody) {
    tbody.innerHTML = posCart.length
      ? posCart
          .map(
            (i) => `
            <tr>
              <td><strong>${i.name}</strong><br><small>${i.sku} · ${i.sizeVariant}</small></td>
              <td>
                <button type="button" class="btn btn-secondary btn-sm" onclick="adjustPosQty('${i.sku}', -1)">−</button>
                <strong style="margin: 0 0.35rem;">${i.qty}</strong>
                <button type="button" class="btn btn-secondary btn-sm" onclick="adjustPosQty('${i.sku}', 1)">+</button>
              </td>
              <td>${formatPeso(i.unitPrice * i.qty)}</td>
              <td><button type="button" class="btn btn-secondary btn-sm" onclick="removePosItem('${i.sku}')">✕</button></td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="kpi-sub">Cart is empty.</td></tr>`;
  }

  document.getElementById("pos-subtotal").textContent = formatPeso(subtotal);
  document.getElementById("pos-discount-display").textContent = `-${formatPeso(discount)}`;
  document.getElementById("pos-grand-total").textContent = formatPeso(totalDue);
  if (completeBtn) completeBtn.disabled = posCart.length === 0;
}

function renderSessionReceipts() {
  const logEl = document.getElementById("pos-receipts-log");
  const countEl = document.getElementById("pos-receipt-count");
  if (countEl) countEl.textContent = `${sessionReceipts.length} receipt(s)`;
  if (!logEl) return;

  if (!sessionReceipts.length) {
    logEl.innerHTML = `<p class="kpi-sub">No checkouts completed yet in this session.</p>`;
    return;
  }

  logEl.innerHTML = sessionReceipts
    .slice()
    .reverse()
    .map(
      (r) => `
      <div class="receipt-card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
          <strong>${r.receiptId}</strong>
          <span class="kpi-sub">${r.time}</span>
        </div>
        <div class="kpi-sub" style="margin-bottom: 0.5rem;">Customer: ${r.customerName}</div>
        ${r.items.map((i) => `<div style="font-size: 0.85rem;">${i.qty}× ${i.name} — ${formatPeso(i.qty * i.unitPrice)}</div>`).join("")}
        <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid #eee4dd; font-weight: 600;">
          Paid: ${formatPeso(r.totalDue)}
        </div>
      </div>`
    )
    .join("");
}

function renderCheckoutModule() {
  renderPosDropdownsAndStock();
  renderPosCartAndTotals();
  renderSessionReceipts();
}

document.getElementById("pos-sku-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (addPosItemToCart(e.target.value, 1)) e.target.value = "";
  }
});

document.getElementById("pos-sku-add-btn").addEventListener("click", () => {
  const input = document.getElementById("pos-sku-input");
  if (addPosItemToCart(input.value, 1)) {
    input.value = "";
    input.focus();
  }
});

document.getElementById("pos-manual-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const sku = document.getElementById("pos-product-select").value;
  const qty = parseInt(document.getElementById("pos-qty-input").value, 10) || 1;
  if (addPosItemToCart(sku, qty)) {
    document.getElementById("pos-qty-input").value = "1";
  }
});

document.getElementById("pos-discount-input").addEventListener("input", renderPosCartAndTotals);

document.getElementById("pos-clear-cart-btn").addEventListener("click", () => {
  posCart = [];
  document.getElementById("pos-discount-input").value = "0";
  renderCheckoutModule();
  setCheckoutBanner("Cart cleared.", "info");
});

document.getElementById("pos-complete-btn").addEventListener("click", () => {
  if (!posCart.length) return;

  for (const item of posCart) {
    const prod = findCatalogItem(item.sku);
    if (!prod || item.qty > prod.stock) {
      setCheckoutBanner(`Insufficient stock for ${item.name}.`, "error");
      return;
    }
  }

  const custId = document.getElementById("pos-customer-select").value;
  const cust = state.customers.find((c) => c.id === custId) || state.customers[0];
  const subtotal = posCart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const rawDisc = Math.max(0, Number(document.getElementById("pos-discount-input").value) || 0);
  const discount = Math.min(rawDisc, subtotal);
  const totalDue = Math.max(0, subtotal - discount);
  const today = new Date().toISOString().slice(0, 10);
  const receiptId = "CHK-" + (1001 + state.sales.length);

  posCart.forEach((item) => {
    const prod = findCatalogItem(item.sku);
    prod.stock -= item.qty;
    const lineDisc = subtotal > 0 ? Number((((item.unitPrice * item.qty) / subtotal) * discount).toFixed(2)) : 0;
    const saleId = "SL-" + (1001 + state.sales.length);

    state.sales.push({
      id: saleId,
      date: today,
      customerId: cust ? cust.id : "walk-in",
      customerName: cust ? cust.name : "Walk-in Customer",
      sku: prod.sku,
      productName: prod.name,
      qty: item.qty,
      unitPrice: prod.sellingPrice,
      unitCostAtSale: prod.unitCost,
      discount: lineDisc,
      status: "Completed"
    });
  });

  logAudit(
    state,
    session.username,
    session.role,
    `POS Checkout ${receiptId} (${cust ? cust.name : "Walk-in"}): ${posCart.map((i) => `${i.qty}x ${i.sku}`).join(", ")}`
  );
  saveState(state);

  sessionReceipts.push({
    receiptId,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    customerName: cust ? cust.name : "Walk-in Customer",
    items: posCart.map((i) => ({ ...i })),
    totalDue
  });

  posCart = [];
  document.getElementById("pos-discount-input").value = "0";
  renderAll();
  setCheckoutBanner(`Checkout ${receiptId} completed — Total Due: ${formatPeso(totalDue)}. Stock and ledger updated.`, "info");
});

async function stopPosCamera() {
  const readerEl = document.getElementById("pos-qr-reader");
  const btnEl = document.getElementById("pos-camera-btn");
  if (posQrScanner && posCameraActive) {
    try {
      await posQrScanner.stop();
      await posQrScanner.clear();
    } catch {}
  }
  posCameraActive = false;
  if (readerEl) readerEl.classList.add("hidden");
  if (btnEl) btnEl.textContent = "Scan Camera";
}

document.getElementById("pos-camera-btn").addEventListener("click", async () => {
  const scanMsg = document.getElementById("pos-scan-feedback");
  const readerEl = document.getElementById("pos-qr-reader");
  const btnEl = document.getElementById("pos-camera-btn");

  if (posCameraActive) {
    await stopPosCamera();
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    scanMsg.textContent = "Camera library failed to load.";
    return;
  }

  readerEl.classList.remove("hidden");
  btnEl.textContent = "Stop Camera";
  scanMsg.textContent = "Starting camera...";

  try {
    posQrScanner = new Html5Qrcode("pos-qr-reader");
    await posQrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 140 } },
      async (decodedText) => {
        addPosItemToCart(decodedText, 1);
        await stopPosCamera();
      },
      () => {}
    );
    posCameraActive = true;
    scanMsg.textContent = "Point camera at a QR code or barcode...";
  } catch {
    scanMsg.textContent = "Camera unavailable. Check permissions or scan/type SKU.";
    await stopPosCamera();
  }
});

function getDateFilterValues(periodId, startId, endId) {
  const period = document.getElementById(periodId)?.value || "all";
  const startDate = document.getElementById(startId)?.value || "";
  const endDate = document.getElementById(endId)?.value || "";
  return { period, options: { startDate, endDate } };
}

function syncCustomDateVisibility(periodId, containerId) {
  const period = document.getElementById(periodId)?.value || "all";
  const container = document.getElementById(containerId);
  if (container) {
    container.classList.toggle("hidden", period !== "custom");
  }
}

function renderDashboard() {
  syncCustomDateVisibility("dash-period", "dash-custom-dates");
  const { period, options } = getDateFilterValues("dash-period", "dash-start-date", "dash-end-date");

  const pnl = computeProfitAndLoss(state, period, options);
  const lowStockItems = state.products.filter((p) => p.stock <= state.lowStockThreshold);

  const kpisHtml = `
    <div class="card">
      <div class="kpi-label">Net Sales</div>
      <div class="kpi-value">${formatPeso(pnl.netSales)}</div>
      <div class="kpi-sub">Gross: ${formatPeso(pnl.grossSales)}</div>
    </div>
    <div class="card">
      <div class="kpi-label">Low Stock Items</div>
      <div class="kpi-value">${lowStockItems.length}</div>
      <div class="kpi-sub">Threshold: ≤ ${state.lowStockThreshold} units</div>
    </div>
    <div class="card">
      <div class="kpi-label">Active SKUs</div>
      <div class="kpi-value">${state.products.length}</div>
      <div class="kpi-sub">Total units: ${state.products.reduce((s, p) => s + p.stock, 0)}</div>
    </div>
    <div class="card">
      <div class="kpi-label">Net Profit (Owner View)</div>
      <div class="kpi-value">${session.role === "Owner" ? formatPeso(pnl.netProfit) : "Restricted"}</div>
      <div class="kpi-sub">${session.role === "Owner" ? `Margin: ${pnl.netMargin}` : "Staff account"}</div>
    </div>
  `;
  document.getElementById("dashboard-kpis").innerHTML = kpisHtml;

  // Category bars filtered by selected date period
  const catTotals = {};
  state.sales
    .filter((s) => s.status !== "Voided" && isDateInPeriod(s.date, period, options))
    .forEach((s) => {
      const prod = state.products.find((p) => p.sku === s.sku);
      const cat = prod ? prod.category : "Sportswear";
      const net = Math.max(0, s.unitPrice * s.qty - (Number(s.discount) || 0));
      catTotals[cat] = (catTotals[cat] || 0) + net;
    });

  const maxCat = Math.max(1, ...Object.values(catTotals));
  const barsContainer = document.getElementById("category-bars");
  const entries = Object.entries(catTotals);
  barsContainer.innerHTML = entries.length
    ? entries
        .map(
          ([cat, val]) => `
        <div class="bar-row">
          <div class="bar-meta"><span>${cat}</span><strong>${formatPeso(val)}</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(val / maxCat) * 100}%"></div></div>
        </div>`
        )
        .join("")
    : `<p class="kpi-sub">No completed sales in this date range.</p>`;

  // Low stock list
  const lowContainer = document.getElementById("low-stock-list");
  lowContainer.innerHTML = lowStockItems.length
    ? lowStockItems
        .map(
          (p) => `
        <div class="bar-row">
          <div class="bar-meta">
            <span>${p.name} (${p.sizeVariant})</span>
            <span class="badge ${p.stock === 0 ? "badge-danger" : "badge-neutral"}">${p.stock} left</span>
          </div>
        </div>`
        )
        .join("")
    : `<span class="badge badge-success">All products are well stocked</span>`;

  // Recent sales filtered by selected date period
  const filteredSales = state.sales.filter((s) => isDateInPeriod(s.date, period, options));
  const recentTbody = document.getElementById("recent-sales-tbody");
  recentTbody.innerHTML = filteredSales.length
    ? filteredSales
        .slice()
        .reverse()
        .slice(0, 6)
        .map((s) => {
          const total = Math.max(0, s.unitPrice * s.qty - (Number(s.discount) || 0));
          const badgeClass = s.status === "Voided" ? "badge-danger" : "badge-success";
          return `
            <tr>
              <td>${s.id}</td>
              <td>${s.date}</td>
              <td>${s.customerName}</td>
              <td>${s.productName}</td>
              <td>${s.qty}</td>
              <td>${formatPeso(s.discount)}</td>
              <td>${formatPeso(total)}</td>
              <td><span class="badge ${badgeClass}">${s.status}</span></td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="8" class="kpi-sub">No sales transactions in this date range.</td></tr>`;
}

["dash-period", "dash-start-date", "dash-end-date"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderDashboard);
});

function renderProducts() {
  const q = (document.getElementById("product-search")?.value || "").toLowerCase();
  const cat = document.getElementById("product-category-filter")?.value || "ALL";

  const filtered = state.products.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesCat = cat === "ALL" || p.category === cat;
    return matchesQuery && matchesCat;
  });

  document.getElementById("products-tbody").innerHTML = filtered
    .map((p) => {
      let badge = `<span class="badge badge-success">In Stock</span>`;
      if (p.stock === 0) badge = `<span class="badge badge-danger">Out of Stock</span>`;
      else if (p.stock <= state.lowStockThreshold) badge = `<span class="badge badge-neutral">Low Stock</span>`;

      return `
        <tr>
          <td>${p.sku}</td>
          <td><strong>${p.name}</strong><br><small>${p.category}</small></td>
          <td>${p.sizeVariant}</td>
          <td>${formatPeso(p.unitCost)}</td>
          <td>${formatPeso(p.sellingPrice)}</td>
          <td>${p.stock}</td>
          <td>${badge}</td>
        </tr>`;
    })
    .join("");
}

document.getElementById("product-search").addEventListener("input", renderProducts);
document.getElementById("product-category-filter").addEventListener("change", renderProducts);

document.getElementById("product-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const sku = document.getElementById("prod-sku").value.trim().toUpperCase();
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value;
  const sizeVariant = document.getElementById("prod-size").value.trim();
  const unitCost = Number(document.getElementById("prod-cost").value);
  const sellingPrice = Number(document.getElementById("prod-price").value);
  const stock = parseInt(document.getElementById("prod-stock").value, 10);

  const existingIndex = state.products.findIndex((p) => p.sku === sku);
  if (existingIndex >= 0) {
    state.products[existingIndex] = { ...state.products[existingIndex], name, category, sizeVariant, unitCost, sellingPrice, stock };
    logAudit(state, session.username, session.role, `Updated product ${sku} (${name})`);
  } else {
    state.products.push({ sku, name, category, sizeVariant, unitCost, sellingPrice, stock });
    logAudit(state, session.username, session.role, `Added product ${sku} (${name})`);
  }

  saveState(state);
  e.target.reset();
  renderAll();
});

function parseAndImportProducts(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let importedCount = 0;

  lines.forEach((line, index) => {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 7) return;
    if (index === 0 && parts[0].toLowerCase() === "sku") return;

    const [skuRaw, name, category, sizeVariant, costRaw, priceRaw, stockRaw] = parts;
    const sku = skuRaw.toUpperCase();
    const unitCost = Number(costRaw) || 0;
    const sellingPrice = Number(priceRaw) || 0;
    const stock = parseInt(stockRaw, 10) || 0;

    if (!sku || !name) return;

    const existingIndex = state.products.findIndex((p) => p.sku === sku);
    if (existingIndex >= 0) {
      state.products[existingIndex] = {
        ...state.products[existingIndex],
        name,
        category: category || "Sportswear",
        sizeVariant: sizeVariant || "Free Size",
        unitCost,
        sellingPrice,
        stock
      };
    } else {
      state.products.push({
        sku,
        name,
        category: category || "Sportswear",
        sizeVariant: sizeVariant || "Free Size",
        unitCost,
        sellingPrice,
        stock
      });
    }
    importedCount++;
  });

  if (importedCount > 0) {
    logAudit(state, session.username, session.role, `Bulk imported/updated ${importedCount} products`);
    saveState(state);
    renderAll();
  }

  return importedCount;
}

document.getElementById("bulk-csv-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById("bulk-products-text").value = event.target.result;
  };
  reader.readAsText(file);
});

document.getElementById("bulk-import-btn").addEventListener("click", () => {
  const text = document.getElementById("bulk-products-text").value;
  const count = parseAndImportProducts(text);
  const feedback = document.getElementById("bulk-feedback");

  if (count > 0) {
    feedback.textContent = `Successfully imported ${count} product(s).`;
    document.getElementById("bulk-products-text").value = "";
    document.getElementById("bulk-csv-file").value = "";
  } else {
    feedback.textContent = "No valid rows found. Check that each line has 7 comma-separated values.";
  }
});

function populateSalesAndInventoryDropdowns() {
  const custSelect = document.getElementById("sale-customer");
  custSelect.innerHTML = state.customers
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");

  const prodOptions = state.products.length
    ? state.products
        .map((p) => `<option value="${p.sku}">${p.sku} — ${p.name} (${p.stock} in stock | ${formatPeso(p.sellingPrice)})</option>`)
        .join("")
    : `<option value="">No products available — add products first</option>`;

  document.getElementById("sale-product").innerHTML = prodOptions;
  document.getElementById("stockin-product").innerHTML = prodOptions;
  document.getElementById("loss-product").innerHTML = prodOptions;

  const completedSales = state.sales.filter((s) => s.status === "Completed");
  document.getElementById("return-sale").innerHTML = completedSales.length
    ? completedSales
        .map((s) => `<option value="${s.id}">${s.id} — ${s.productName} (Qty: ${s.qty}, ${s.customerName})</option>`)
        .join("")
    : `<option value="">No completed sales</option>`;

  updateSalePreview();
}

function applyScannedSku(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  const scanMsg = document.getElementById("scan-feedback");
  if (!code) return false;

  const matched = state.products.find((p) => p.sku.toUpperCase() === code);
  if (matched) {
    document.getElementById("sale-product").value = matched.sku;
    scanMsg.textContent = `Matched: ${matched.name} (${matched.sizeVariant}) — ${matched.stock} in stock`;
    document.getElementById("sale-sku-scan").value = "";
    updateSalePreview();
    return true;
  }

  scanMsg.textContent = `SKU "${code}" not found in catalog.`;
  return false;
}

// Fast SKU / Barcode Scanner Lookup in Sales (USB/Bluetooth scanners type code + Enter)
document.getElementById("sale-sku-scan").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  applyScannedSku(e.target.value);
});

async function stopCameraScanner() {
  const readerEl = document.getElementById("qr-reader");
  const btnEl = document.getElementById("toggle-camera-btn");

  if (html5QrScanner && isCameraScanning) {
    try {
      await html5QrScanner.stop();
      await html5QrScanner.clear();
    } catch {
      // Ignore cleanup errors if camera already stopped
    }
  }
  isCameraScanning = false;
  if (readerEl) readerEl.classList.add("hidden");
  if (btnEl) btnEl.textContent = "Scan Camera";
}

document.getElementById("toggle-camera-btn").addEventListener("click", async () => {
  const scanMsg = document.getElementById("scan-feedback");
  const readerEl = document.getElementById("qr-reader");
  const btnEl = document.getElementById("toggle-camera-btn");

  if (isCameraScanning) {
    await stopCameraScanner();
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    scanMsg.textContent = "Camera scanner library failed to load. Check internet connection or type SKU directly.";
    return;
  }

  readerEl.classList.remove("hidden");
  btnEl.textContent = "Stop Camera";
  scanMsg.textContent = "Starting camera...";

  try {
    html5QrScanner = new Html5Qrcode("qr-reader");
    await html5QrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 140 } },
      async (decodedText) => {
        applyScannedSku(decodedText);
        await stopCameraScanner();
      },
      () => {}
    );
    isCameraScanning = true;
    scanMsg.textContent = "Point camera at a barcode or QR code...";
  } catch {
    scanMsg.textContent = "Unable to access camera. Allow permission or use a USB scanner / type SKU.";
    await stopCameraScanner();
  }
});

function updateSalePreview() {
  const sku = document.getElementById("sale-product").value;
  const qty = Number(document.getElementById("sale-qty").value) || 0;
  const disc = Math.max(0, Number(document.getElementById("sale-discount").value) || 0);
  const prod = state.products.find((p) => p.sku === sku);
  const subtotal = prod ? prod.sellingPrice * qty : 0;
  const net = Math.max(0, subtotal - disc);
  document.getElementById("sale-preview").textContent =
    `Gross: ${formatPeso(subtotal)} | Discount: -${formatPeso(disc)} | Net Total: ${formatPeso(net)}`;
}

["sale-product", "sale-qty", "sale-discount"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateSalePreview);
});

document.getElementById("sale-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const custId = document.getElementById("sale-customer").value;
  const sku = document.getElementById("sale-product").value;
  const qty = parseInt(document.getElementById("sale-qty").value, 10);
  const discount = Math.max(0, Number(document.getElementById("sale-discount").value) || 0);

  const prod = state.products.find((p) => p.sku === sku);
  const cust = state.customers.find((c) => c.id === custId) || state.customers[0];

  if (!prod || qty > prod.stock) {
    alert("Insufficient stock for this sale.");
    return;
  }

  prod.stock -= qty;
  const saleId = "SL-" + (1001 + state.sales.length);
  state.sales.push({
    id: saleId,
    date: new Date().toISOString().slice(0, 10),
    customerId: cust.id,
    customerName: cust.name,
    sku: prod.sku,
    productName: prod.name,
    qty,
    unitPrice: prod.sellingPrice,
    unitCostAtSale: prod.unitCost,
    discount,
    status: "Completed"
  });

  logAudit(state, session.username, session.role, `Recorded sale ${saleId}: ${qty}x ${prod.name}`);
  saveState(state);
  e.target.reset();
  document.getElementById("scan-feedback").textContent = "";
  renderAll();
});

document.getElementById("return-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const saleId = document.getElementById("return-sale").value;
  const qty = parseInt(document.getElementById("return-qty").value, 10);
  const refundAmount = Number(document.getElementById("return-refund").value) || 0;
  const resalable = document.getElementById("return-condition").value === "resalable";

  const sale = state.sales.find((s) => s.id === saleId);
  const prod = sale ? state.products.find((p) => p.sku === sale.sku) : null;
  if (!sale || !prod) {
    alert("Select a valid completed sale.");
    return;
  }

  if (resalable) {
    prod.stock += qty;
  }

  state.returns.push({
    id: "RET-" + (state.returns.length + 1),
    date: new Date().toISOString().slice(0, 10),
    saleId: sale.id,
    sku: prod.sku,
    productName: prod.name,
    qty,
    refundAmount,
    unitCost: sale.unitCostAtSale,
    resalable
  });

  logAudit(
    state,
    session.username,
    session.role,
    `Processed return on ${sale.id} (${qty}x ${prod.name}, ${resalable ? "Restocked" : "Damaged Loss"})`
  );
  saveState(state);
  e.target.reset();
  renderAll();
});

function voidSale(saleId) {
  if (session.role !== "Owner") {
    alert("Only the Shop Owner can void sales transactions.");
    return;
  }
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === "Voided") return;

  sale.status = "Voided";
  const prod = state.products.find((p) => p.sku === sale.sku);
  if (prod) prod.stock += sale.qty;

  logAudit(state, session.username, session.role, `Voided sale ${sale.id} and restored ${sale.qty} stock`);
  saveState(state);
  renderAll();
}

function renderSalesLedger() {
  document.getElementById("sales-ledger-tbody").innerHTML = state.sales
    .slice()
    .reverse()
    .map((s) => {
      const net = Math.max(0, s.unitPrice * s.qty - (Number(s.discount) || 0));
      const isVoid = s.status === "Voided";
      return `
        <tr>
          <td>${s.id}</td>
          <td>${s.date}</td>
          <td>${s.customerName}</td>
          <td>${s.productName}</td>
          <td>${s.qty}</td>
          <td>${formatPeso(s.discount)}</td>
          <td>${formatPeso(net)}</td>
          <td><span class="badge ${isVoid ? "badge-danger" : "badge-success"}">${s.status}</span></td>
          <td>
            ${!isVoid ? `<button class="btn btn-secondary btn-sm" onclick="voidSale('${s.id}')">Void</button>` : "-"}
          </td>
        </tr>`;
    })
    .join("");
}

document.getElementById("stockin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const sku = document.getElementById("stockin-product").value;
  const newQty = parseInt(document.getElementById("stockin-qty").value, 10);
  const newCost = Number(document.getElementById("stockin-cost").value);
  const reason = document.getElementById("stockin-reason").value.trim() || "Stock-In";

  const prod = state.products.find((p) => p.sku === sku);
  if (!prod) return;

  const updatedWac = computeWeightedAverageCost(prod.stock, prod.unitCost, newQty, newCost);
  prod.stock += newQty;
  prod.unitCost = Number(updatedWac.toFixed(2));

  state.stockLogs.push({
    id: "STK-" + String(state.stockLogs.length + 1).padStart(2, "0"),
    date: new Date().toISOString().slice(0, 10),
    sku: prod.sku,
    productName: prod.name,
    type: "Stock-In",
    qty: newQty,
    unitCost: newCost,
    reason,
    user: session.username
  });

  logAudit(state, session.username, session.role, `Stock-In ${newQty}x ${prod.sku} @ ${formatPeso(newCost)} (New WAC: ${formatPeso(prod.unitCost)})`);
  saveState(state);
  e.target.reset();
  renderAll();
});

document.getElementById("le-type").addEventListener("change", (e) => {
  const isLoss = e.target.value === "loss";
  document.getElementById("loss-fields").classList.toggle("hidden", !isLoss);
  document.getElementById("expense-fields").classList.toggle("hidden", isLoss);
});

document.getElementById("loss-expense-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("le-type").value;

  if (type === "loss") {
    const sku = document.getElementById("loss-product").value;
    const qty = parseInt(document.getElementById("loss-qty").value, 10);
    const reason = document.getElementById("loss-reason").value.trim() || "Inventory write-off";
    const prod = state.products.find((p) => p.sku === sku);
    if (!prod || qty > prod.stock) {
      alert("Invalid quantity or exceeds available stock.");
      return;
    }
    prod.stock -= qty;
    const lossAmount = prod.unitCost * qty;

    state.inventoryLosses.push({
      id: "LOSS-" + (state.inventoryLosses.length + 1),
      date: new Date().toISOString().slice(0, 10),
      sku: prod.sku,
      productName: prod.name,
      qty,
      unitCost: prod.unitCost,
      lossAmount,
      reason
    });

    state.stockLogs.push({
      id: "STK-" + String(state.stockLogs.length + 1).padStart(2, "0"),
      date: new Date().toISOString().slice(0, 10),
      sku: prod.sku,
      productName: prod.name,
      type: "Inventory Loss",
      qty: -qty,
      unitCost: prod.unitCost,
      reason,
      user: session.username
    });

    logAudit(state, session.username, session.role, `Recorded inventory loss: ${qty}x ${prod.name} (${formatPeso(lossAmount)})`);
  } else {
    const category = document.getElementById("exp-category").value;
    const amount = Number(document.getElementById("exp-amount").value) || 0;
    const notes = document.getElementById("exp-notes").value.trim() || category;

    state.expenses.push({
      id: "EXP-" + (state.expenses.length + 1),
      date: new Date().toISOString().slice(0, 10),
      category,
      amount,
      notes
    });

    logAudit(state, session.username, session.role, `Recorded operating expense (${category}): ${formatPeso(amount)}`);
  }

  saveState(state);
  e.target.reset();
  renderAll();
});

function renderStockHistory() {
  document.getElementById("stock-history-tbody").innerHTML = state.stockLogs
    .slice()
    .reverse()
    .map(
      (l) => `
      <tr>
        <td>${l.id}</td>
        <td>${l.date}</td>
        <td>${l.productName}</td>
        <td><span class="badge badge-neutral">${l.type}</span></td>
        <td>${l.qty}</td>
        <td>${formatPeso(l.unitCost)}</td>
        <td>${l.reason}</td>
      </tr>`
    )
    .join("");
}

function renderReports() {
  syncCustomDateVisibility("report-period", "report-custom-dates");
  const isOwner = session.role === "Owner";
  const { period, options } = getDateFilterValues("report-period", "report-start-date", "report-end-date");

  document.getElementById("pnl-restricted-msg").classList.toggle("hidden", isOwner);
  document.getElementById("pnl-table-wrap").classList.toggle("hidden", !isOwner);

  // Inventory Valuation Summary (visible to Owner & Staff)
  document.getElementById("inventory-report-tbody").innerHTML = state.products
    .map(
      (p) => `
      <tr>
        <td>${p.sku}</td>
        <td>${p.name} (${p.sizeVariant})</td>
        <td>${p.category}</td>
        <td>${p.stock}</td>
        <td>${formatPeso(p.unitCost)}</td>
        <td>${formatPeso(p.stock * p.unitCost)}</td>
      </tr>`
    )
    .join("");

  if (!isOwner) {
    document.getElementById("pnl-provisional-banner").classList.add("hidden");
    return;
  }

  const pnl = computeProfitAndLoss(state, period, options);
  document.getElementById("pnl-provisional-banner").classList.toggle("hidden", !pnl.isProvisional);

  const rows = [
    ["Gross Sales", formatPeso(pnl.grossSales)],
    ["Less: Discounts", `(${formatPeso(pnl.discounts)})`],
    ["Less: Sales Returns", `(${formatPeso(pnl.salesReturns)})`],
    ["Net Sales", `<strong>${formatPeso(pnl.netSales)}</strong>`],
    ["Less: Cost of Goods Sold (COGS)", `(${formatPeso(pnl.cogs)})`],
    ["Gross Profit", `<strong>${formatPeso(pnl.grossProfit)}</strong> (${pnl.grossMargin} margin)`],
    ["Less: Inventory Losses", `(${formatPeso(pnl.inventoryLosses)})`],
    ["Less: Operating Expenses", `(${formatPeso(pnl.operatingExpenses)})`],
    ["Net Profit / (Loss)", `<strong>${formatPeso(pnl.netProfit)}</strong> (${pnl.netMargin} margin)`]
  ];

  document.getElementById("pnl-tbody").innerHTML = rows
    .map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`)
    .join("");
}

["report-period", "report-start-date", "report-end-date"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderReports);
});

document.getElementById("export-report-btn").addEventListener("click", () => {
  const isOwner = session.role === "Owner";
  const { period, options } = getDateFilterValues("report-period", "report-start-date", "report-end-date");
  const pnl = computeProfitAndLoss(state, period, options);

  const rangeLabel =
    period === "custom"
      ? `CUSTOM (${options.startDate || "Start"} to ${options.endDate || "End"})`
      : period.toUpperCase();

  const csvLines = [
    ["CCMC RTW Shop Report", `Period: ${rangeLabel}`, `Generated: ${new Date().toLocaleDateString()}`].join(","),
    ""
  ];

  // Include Profit & Loss ONLY for authorized Owners
  if (isOwner) {
    csvLines.push(
      "PROFIT & LOSS SUMMARY",
      "Line Item,Amount",
      `Gross Sales,${pnl.grossSales.toFixed(2)}`,
      `Discounts,${pnl.discounts.toFixed(2)}`,
      `Sales Returns,${pnl.salesReturns.toFixed(2)}`,
      `Net Sales,${pnl.netSales.toFixed(2)}`,
      `Cost of Goods Sold (COGS),${pnl.cogs.toFixed(2)}`,
      `Gross Profit,${pnl.grossProfit.toFixed(2)}`,
      `Inventory Losses,${pnl.inventoryLosses.toFixed(2)}`,
      `Operating Expenses,${pnl.operatingExpenses.toFixed(2)}`,
      `Net Profit,${pnl.netProfit.toFixed(2)}`,
      ""
    );
  }

  csvLines.push(
    "INVENTORY SUMMARY",
    "SKU,Product Name,Category,Size/Variant,Stock Qty,WAC Unit Cost,Selling Price",
    ...state.products.map(
      (p) => `"${p.sku}","${p.name}","${p.category}","${p.sizeVariant}",${p.stock},${p.unitCost},${p.sellingPrice}`
    )
  );

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CCMC_RTW_${isOwner ? "Full_Report" : "Inventory_Report"}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  logAudit(state, session.username, session.role, `Exported ${rangeLabel} ${isOwner ? "Full" : "Inventory"} CSV report`);
  saveState(state);
});

function renderCustomers() {
  document.getElementById("customers-tbody").innerHTML = state.customers
    .map((c) => {
      const custSales = state.sales.filter((s) => s.customerId === c.id && s.status !== "Voided");
      const spent = custSales.reduce(
        (sum, s) => sum + Math.max(0, s.unitPrice * s.qty - (Number(s.discount) || 0)),
        0
      );
      return `
        <tr>
          <td>${c.id}</td>
          <td><strong>${c.name}</strong><br><small>${c.notes || ""}</small></td>
          <td>${c.contact}</td>
          <td>${custSales.length}</td>
          <td>${formatPeso(spent)}</td>
        </tr>`;
    })
    .join("");
}

document.getElementById("customer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("cust-name").value.trim();
  const contact = document.getElementById("cust-contact").value.trim() || "N/A";
  const notes = document.getElementById("cust-notes").value.trim();

  const id = "CUST-" + String(state.customers.length + 1).padStart(3, "0");
  state.customers.push({ id, name, contact, notes });
  logAudit(state, session.username, session.role, `Registered customer ${id} (${name})`);
  saveState(state);
  e.target.reset();
  renderAll();
});

function renderUsersAndAudit() {
  if (session.role !== "Owner") return;

  document.getElementById("users-tbody").innerHTML = state.users
    .map(
      (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td><span class="badge ${u.active ? "badge-success" : "badge-danger"}">${u.active ? "Active" : "Inactive"}</span></td>
      </tr>`
    )
    .join("");

  document.getElementById("audit-tbody").innerHTML = state.auditTrail
    .slice(0, 25)
    .map(
      (a) => `
      <tr>
        <td>${a.timestamp}</td>
        <td>${a.actor}</td>
        <td>${a.role}</td>
        <td>${a.action}</td>
      </tr>`
    )
    .join("");
}

document.getElementById("user-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (session.role !== "Owner") return;

  const name = document.getElementById("new-user-name").value.trim();
  const username = document.getElementById("new-user-username").value.trim();
  const password = document.getElementById("new-user-password").value;
  const role = document.getElementById("new-user-role").value;

  if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    alert("Username already exists.");
    return;
  }

  state.users.push({
    id: "USR-" + String(state.users.length + 1).padStart(2, "0"),
    name,
    username,
    password,
    role,
    active: true
  });

  logAudit(state, session.username, session.role, `Created ${role} account for ${username}`);
  saveState(state);
  e.target.reset();
  renderAll();
});

function renderSettings() {
  document.getElementById("low-stock-threshold").value = state.lowStockThreshold;
}

document.getElementById("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (session.role !== "Owner") return;
  state.lowStockThreshold = parseInt(document.getElementById("low-stock-threshold").value, 10) || 8;
  logAudit(state, session.username, session.role, `Updated low-stock threshold to ${state.lowStockThreshold}`);
  saveState(state);
  renderAll();
  document.getElementById("settings-feedback").textContent = "Settings saved.";
});

document.getElementById("reset-demo-btn").addEventListener("click", () => {
  if (session.role !== "Owner") return;
  if (!confirm("Clear all recorded data and reset to a clean slate?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  renderAll();
  document.getElementById("settings-feedback").textContent = "System data cleared.";
});

initShell();