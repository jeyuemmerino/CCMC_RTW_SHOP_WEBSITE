const STORAGE_KEY = "ccmc_rtw_system_clean_v1";

const DEFAULT_STATE = {
  lowStockThreshold: 8,
  users: [
    { id: "USR-01", name: "Myla Astillero", username: "owner", password: "123", role: "Owner", active: true },
    { id: "USR-02", name: "Floor Staff 1", username: "staff", password: "123", role: "Staff", active: true }
  ],
  products: [],
  customers: [
    { id: "CUST-001", name: "Walk-in Customer", contact: "N/A", notes: "Default walk-in profile" }
  ],
  sales: [],
  stockLogs: [],
  returns: [],
  inventoryLosses: [],
  expenses: [],
  auditTrail: []
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    return structuredClone(DEFAULT_STATE);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function logAudit(state, actor, role, action) {
  state.auditTrail.unshift({
    id: "AUD-" + String(state.auditTrail.length + 1).padStart(3, "0"),
    timestamp: new Date().toLocaleString(),
    actor,
    role,
    action
  });
}

function formatPeso(amount) {
  const num = Number(amount) || 0;
  return "₱" + num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Weighted Average Cost (WAC):
 * NewAverageCost = ((Qe * Ce) + (Qn * Cn)) / (Qe + Qn)
 */
function computeWeightedAverageCost(existingQty, existingCost, newQty, newCost) {
  const totalQty = existingQty + newQty;
  if (totalQty <= 0) return existingCost;
  return ((existingQty * existingCost) + (newQty * newCost)) / totalQty;
}

/**
 * Profit & Loss Computation per CCMC RTW Shop rules
 */
function computeProfitAndLoss(state) {
  const activeSales = state.sales.filter((s) => s.status !== "Voided");

  const grossSales = activeSales.reduce((sum, s) => sum + s.unitPrice * s.qty, 0);
  const discounts = activeSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
  const salesReturns = state.returns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
  const netSales = grossSales - discounts - salesReturns;

  const rawCogs = activeSales.reduce((sum, s) => sum + s.unitCostAtSale * s.qty, 0);
  const returnedCostReversal = state.returns.reduce((sum, r) => sum + (Number(r.unitCost) || 0) * r.qty, 0);
  const cogs = Math.max(0, rawCogs - returnedCostReversal);

  const grossProfit = netSales - cogs;
  const grossMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) + "%" : "N/A";

  const damagedReturnLosses = state.returns
    .filter((r) => !r.resalable)
    .reduce((sum, r) => sum + (Number(r.unitCost) || 0) * r.qty, 0);

  const recordedLosses = state.inventoryLosses.reduce((sum, l) => sum + (Number(l.lossAmount) || 0), 0);
  const inventoryLosses = damagedReturnLosses + recordedLosses;

  const operatingExpenses = state.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = grossProfit - inventoryLosses - operatingExpenses;
  const netMargin = netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) + "%" : "N/A";

  const categories = new Set(state.expenses.map((e) => e.category.toLowerCase()));
  const isProvisional = !(categories.has("rent") && categories.has("utilities"));

  return {
    grossSales,
    discounts,
    salesReturns,
    netSales,
    cogs,
    grossProfit,
    grossMargin,
    inventoryLosses,
    operatingExpenses,
    netProfit,
    netMargin,
    isProvisional
  };
}