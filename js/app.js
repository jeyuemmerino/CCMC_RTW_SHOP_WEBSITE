const session = requireAuth();
let state = loadState();

const pageTitles = {
  dashboard: "Dashboard",
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
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
  });
  document.getElementById("page-title").textContent = pageTitles[tabName] || "CCMC RTW Shop";
  renderAll();
}

function renderAll() {
  state = loadState();
  renderDashboard();
  renderProducts();
  populateSalesAndInventoryDropdowns();
  renderSalesLedger();
  renderStockHistory();
  renderReports();
  renderCustomers();
  renderUsersAndAudit();
  renderSettings();
}

function renderDashboard() {
  const pnl = computeProfitAndLoss(state);
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

  // Category bars
  const catTotals = {};
  state.sales
    .filter((s) => s.status !== "Voided")
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
    : `<p class="kpi-sub">No completed sales yet.</p>`;

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

  // Recent sales
  const recentTbody = document.getElementById("recent-sales-tbody");
  recentTbody.innerHTML = state.sales
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
    .join("");
}

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

function populateSalesAndInventoryDropdowns() {
  const custSelect = document.getElementById("sale-customer");
  custSelect.innerHTML = state.customers
    .map((c) => `<option value="${c.id}">${c.name}</option>`)
    .join("");

  const prodOptions = state.products
    .map((p) => `<option value="${p.sku}">${p.sku} — ${p.name} (${p.stock} in stock | ${formatPeso(p.sellingPrice)})</option>`)
    .join("");

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

function updateSalePreview() {
  const sku = document.getElementById("sale-product").value;
  const qty = Number(document.getElementById("sale-qty").value) || 0;
  const disc = Number(document.getElementById("sale-discount").value) || 0;
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
  const discount = Number(document.getElementById("sale-discount").value) || 0;

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
  const isOwner = session.role === "Owner";
  document.getElementById("pnl-restricted-msg").classList.toggle("hidden", isOwner);
  document.getElementById("pnl-table-wrap").classList.toggle("hidden", !isOwner);

  if (!isOwner) {
    document.getElementById("pnl-provisional-banner").classList.add("hidden");
    return;
  }

  const pnl = computeProfitAndLoss(state);
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