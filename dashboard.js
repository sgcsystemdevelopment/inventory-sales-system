/**
 * Dashboard Script — Inventory & Sales System
 * Handles: Theme, Sidebar, Charts (Chart.js), Summary cards, Transactions table,
 * Supabase live metrics, and Stocks checkout modal (synced with Inventory).
 */

import { supabase } from './supabaseClient.js';

const initDashboard = async () => {

  let salesChart = null;
  let breakdownChart = null;

  // ── DATA PERSISTENCE & SUPABASE SYNC (MATCHING INVENTORY) ─────────────────
  const STORAGE_KEY = 'inv_stocks_data';

  let inMemoryStocks = [];

  // ── ELEMENT REFS ─────────────────────────────────────────────────────────
  const themeToggleBtn  = document.getElementById('themeToggleBtn');
  const themeIcon       = document.getElementById('themeIcon');
  const sidebarEl       = document.getElementById('sidebar');
  const menuBtn         = document.getElementById('menuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay  = document.getElementById('sidebarOverlay');
  const dateRangeSelect = document.getElementById('dateRangeSelect');
  const tableSearch     = document.getElementById('tableSearch');
  const sidebarLogo     = document.getElementById('sidebarLogo');

  // Summary value elements
  const els = {
    paid:     document.getElementById('val-paid'),
    unpaid:   document.getElementById('val-unpaid'),
    expense:  document.getElementById('val-expense'),
    discount: document.getElementById('val-discount'),
    cash:     document.getElementById('val-cash'),
    net:      document.getElementById('val-net'),
    donut:    document.getElementById('donutTotal'),
  };

  // ── THEME ─────────────────────────────────────────────────────────────────
  const initTheme = () => {
    const saved = localStorage.getItem('inv_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(saved);
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('inv_theme', theme);
    if (theme === 'dark') {
      if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
      if (sidebarLogo) sidebarLogo.style.filter = 'brightness(0) invert(1)';
    } else {
      if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
      if (sidebarLogo) sidebarLogo.style.filter = 'brightness(0) invert(1)';
    }
    updateChartTheme();
  };

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  initTheme();

  // ── IMMEDIATELY POPULATE SIDEBAR STOCKS ──────────────────────────────────
  renderSidebarStocks();
  loadStocks();

  // ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────
  const openSidebar = () => {
    sidebarEl.classList.add('open');
    sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeSidebar = () => {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // ── CURRENCY FORMATTER ────────────────────────────────────────────────────
  const currency = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function getLocalStocks() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function getStocks() {
    return inMemoryStocks.length ? inMemoryStocks : getLocalStocks();
  }

  function syncLocal(stocks) {
    inMemoryStocks = stocks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
    renderSidebarStocks();
  }

  async function loadStocks() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(item => ({
          id: item.id,
          date: item.date_added || item.created_at,
          batch: item.batch,
          name: item.name,
          stocks: Number(item.quantity) || 0,
          price: parseFloat(item.unit_price) || 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        syncLocal(mapped);
        return;
      }
    } catch (err) {
      console.warn('Supabase stock fetch fallback:', err);
    }

    const local = getLocalStocks();
    syncLocal(local);
  }

  // ── RENDER SIDEBAR STOCKS ────────────────────────────────────────────────
  function renderSidebarStocks() {
    const container = document.getElementById('sidebarStocksList');
    if (!container) return;
    const stocks = getStocks();
    if (!Array.isArray(stocks) || stocks.length === 0) {
      container.innerHTML = '<span class="sidebar-stock-empty">No stocks added yet.</span>';
      return;
    }
    container.innerHTML = stocks.map(item => {
      const qty = Number(item.stocks) || 0;
      const cls = qty === 0 ? 'out-of-stock' : qty <= 10 ? 'low-stock' : '';
      const badgeLabel = qty === 0 ? 'Out' : (qty <= 10 ? qty + ' low' : qty);
      return `<div class="sidebar-stock-item ${cls}" data-id="${item.id}" title="${item.name}">
        <span class="stock-icon"><i class="fa-solid fa-box-open"></i></span>
        <span class="stock-item-name">${item.name}</span>
        <span class="stock-item-badge">${badgeLabel}</span>
      </div>`;
    }).join('');

    container.querySelectorAll('.sidebar-stock-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const found = getStocks().find(s => String(s.id) === String(id));
        if (found) openCheckoutModal(found);
      });
    });
  }

  // ── CHECKOUT MODAL ───────────────────────────────────────────────────────
  let _checkoutItem = null;
  let _payMode = 'cash'; // 'cash' | 'credit'

  function updateCheckoutSummary() {
    if (!_checkoutItem) return;
    const qtyInp = document.getElementById('coQtyInput');
    const qty = Math.max(1, parseInt(qtyInp ? qtyInp.value : 1) || 1);
    const price = Number(_checkoutItem.price) || 0;
    const subtotal = qty * price;

    const subtotalEl = document.getElementById('coSubtotal');
    if (subtotalEl) subtotalEl.textContent = currency(subtotal);

    const chargeRow = document.getElementById('summaryChargeRow');
    const discountRow = document.getElementById('summaryDiscountRow');
    const chargeValEl = document.getElementById('coCharge');
    const discValEl = document.getElementById('coDiscount');
    const totalEl = document.getElementById('coGrandTotal');

    if (_payMode === 'credit') {
      const chargeInp = document.getElementById('coChargeInput');
      const chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
      const total = subtotal + chargeAmt;

      if (chargeRow) chargeRow.style.display = 'flex';
      if (discountRow) discountRow.style.display = 'none';
      if (chargeValEl) chargeValEl.textContent = '+' + currency(chargeAmt);
      if (totalEl) totalEl.textContent = currency(total);
    } else {
      const discInp = document.getElementById('coDiscountInput');
      const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
      const discountAmt = Math.min(discVal, subtotal);
      const total = Math.max(0, subtotal - discountAmt);

      if (chargeRow) chargeRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'flex';
      if (discValEl) discValEl.textContent = '-' + currency(discountAmt);
      if (totalEl) totalEl.textContent = currency(total);
    }
  }

  function setPayMode(mode) {
    _payMode = mode;
    const payModeCash = document.getElementById('payModeCash');
    const payModeCredit = document.getElementById('payModeCredit');
    const cashSection = document.getElementById('cashSection');
    const creditSection = document.getElementById('creditSection');

    if (mode === 'credit') {
      if (payModeCash) payModeCash.classList.remove('active');
      if (payModeCredit) payModeCredit.classList.add('active');
      if (cashSection) cashSection.style.display = 'none';
      if (creditSection) creditSection.style.display = 'block';
    } else {
      if (payModeCash) payModeCash.classList.add('active');
      if (payModeCredit) payModeCredit.classList.remove('active');
      if (cashSection) cashSection.style.display = 'block';
      if (creditSection) creditSection.style.display = 'none';
    }
    updateCheckoutSummary();
  }

  function openCheckoutModal(item) {
    _checkoutItem = item;
    const qty = Number(item.stocks) || 0;
    document.getElementById('coProductName').textContent = item.name;
    document.getElementById('coUnitPrice').textContent = currency(item.price) + '/unit';
    const stockBadge = document.getElementById('coStockAvail');
    stockBadge.textContent = qty + ' units available';
    stockBadge.className = 'co-stock-badge' + (qty === 0 ? ' out' : qty <= 10 ? ' low' : '');
    document.getElementById('coBatchTag').textContent = item.batch ? 'Batch: ' + item.batch : '';
    const qtyInput = document.getElementById('coQtyInput');
    qtyInput.value = qty > 0 ? 1 : 0;
    qtyInput.max = qty;

    const discInp = document.getElementById('coDiscountInput');
    if (discInp) discInp.value = '';
    const chargeInp = document.getElementById('coChargeInput');
    if (chargeInp) chargeInp.value = '';
    const soldToInp = document.getElementById('coSoldToInput');
    if (soldToInp) soldToInp.value = '';

    const minusBtn = document.getElementById('coQtyMinus');
    const plusBtn = document.getElementById('coQtyPlus');
    const confirmBtn = document.getElementById('confirmCheckoutBtn');

    if (minusBtn) minusBtn.disabled = true;
    if (plusBtn) plusBtn.disabled = qty <= 1;
    if (confirmBtn) confirmBtn.disabled = qty === 0;

    setPayMode('cash');

    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.classList.remove('active');
    _checkoutItem = null;
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById('toastNotice');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    if (toastIcon) toastIcon.className = isError ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check';
    toast.style.display = 'flex';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.style.display = 'none'; }, 400); }, 3200);
  }

  const checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) {
    const closeBtn = document.getElementById('closeCheckoutBtn');
    const cancelBtn = document.getElementById('cancelCheckoutBtn');
    const overlay = document.getElementById('checkoutModalOverlay');
    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCheckoutModal);
    if (overlay) overlay.addEventListener('click', closeCheckoutModal);

    const minusBtn = document.getElementById('coQtyMinus');
    const plusBtn = document.getElementById('coQtyPlus');
    const qtyInp = document.getElementById('coQtyInput');
    const discInp = document.getElementById('coDiscountInput');
    const chargeInp = document.getElementById('coChargeInput');
    const btnApplyDiscount = document.getElementById('btnApplyDiscount');
    const btnApplyCharge = document.getElementById('btnApplyCharge');
    const payModeCash = document.getElementById('payModeCash');
    const payModeCredit = document.getElementById('payModeCredit');
    const confirmBtn = document.getElementById('confirmCheckoutBtn');

    if (payModeCash) {
      payModeCash.addEventListener('click', () => setPayMode('cash'));
    }
    if (payModeCredit) {
      payModeCredit.addEventListener('click', () => setPayMode('credit'));
    }

    if (btnApplyDiscount) {
      btnApplyDiscount.addEventListener('click', () => {
        updateCheckoutSummary();
        showToast('Discount applied to summary');
      });
    }
    if (btnApplyCharge) {
      btnApplyCharge.addEventListener('click', () => {
        updateCheckoutSummary();
        showToast('Additional charge added to summary');
      });
    }

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        const val = Math.max(1, parseInt(qtyInp.value) - 1);
        qtyInp.value = val;
        minusBtn.disabled = val <= 1;
        plusBtn.disabled = _checkoutItem && val >= Number(_checkoutItem.stocks);
        updateCheckoutSummary();
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
        const val = Math.min(max, parseInt(qtyInp.value) + 1);
        qtyInp.value = val;
        minusBtn.disabled = val <= 1;
        plusBtn.disabled = val >= max;
        updateCheckoutSummary();
      });
    }

    if (qtyInp) {
      qtyInp.addEventListener('input', () => {
        const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
        let val = parseInt(qtyInp.value) || 1;
        val = Math.max(1, Math.min(val, max));
        qtyInp.value = val;
        minusBtn.disabled = val <= 1;
        plusBtn.disabled = val >= max;
        updateCheckoutSummary();
      });
    }

    if (discInp) {
      discInp.addEventListener('input', updateCheckoutSummary);
    }
    if (chargeInp) {
      chargeInp.addEventListener('input', updateCheckoutSummary);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (!_checkoutItem) return;
        const qty = parseInt(qtyInp.value) || 1;
        const price = Number(_checkoutItem.price) || 0;
        const subtotal = qty * price;
        const isCredit = _payMode === 'credit';
        const paymentStatus = isCredit ? 'unpaid' : 'paid';

        let discountAmt = 0;
        let chargeAmt = 0;
        let total = subtotal;

        if (isCredit) {
          chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
          total = subtotal + chargeAmt;
        } else {
          const rawDisc = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
          discountAmt = Math.min(rawDisc, subtotal);
          total = Math.max(0, subtotal - discountAmt);
        }

        // Check stock availability
        const currentStock = Number(_checkoutItem.stocks) || 0;
        if (qty > currentStock) {
          showToast(`Cannot checkout ${qty} units. Only ${currentStock} in stock.`, true);
          return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

        // Deduct locally
        const all = [...getStocks()];
        const idx = all.findIndex(s => String(s.id) === String(_checkoutItem.id));
        if (idx !== -1) {
          all[idx].stocks = Math.max(0, Number(all[idx].stocks) - qty);
          all[idx].updatedAt = new Date().toISOString();
          syncLocal(all);
        }

        // Record in Supabase
        try {
          const soldToVal = (document.getElementById('coSoldToInput')?.value || '').trim();
          const customerNote = soldToVal ? ` | Sold to: ${soldToVal}` : '';
          const notes = (isCredit 
            ? `Credit Sale (Charge: ₱${chargeAmt.toFixed(2)})` 
            : (discountAmt > 0 ? `Cash Sale (Discount: ₱${discountAmt.toFixed(2)})` : 'Cash Sale')) + customerNote;

          const { data: txn, error: txnErr } = await supabase
            .from('transactions')
            .insert([{
              type: 'sale',
              payment_status: paymentStatus,
              subtotal,
              discount: discountAmt,
              total,
              notes
            }])
            .select()
            .single();

          if (txn && !txnErr) {
            const isStkLocalId = String(_checkoutItem.id).startsWith('stk_');
            await supabase.from('transaction_items').insert([{
              transaction_id: txn.id,
              stock_item_id: isStkLocalId ? null : _checkoutItem.id,
              product_name: _checkoutItem.name,
              batch: _checkoutItem.batch || '',
              unit_price: price,
              quantity: qty,
              item_discount: discountAmt
            }]);
          }

          // Also update stock_items quantity in Supabase
          if (!String(_checkoutItem.id).startsWith('stk_') && idx !== -1) {
            await supabase
              .from('stock_items')
              .update({ quantity: all[idx].stocks })
              .eq('id', _checkoutItem.id);
          }
        } catch (err) {
          console.warn('Supabase checkout fallback:', err);
        }

        // Record locally
        const soldToVal = (document.getElementById('coSoldToInput')?.value || '').trim();
        let txns = [];
        try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
        txns.unshift({
          id: Date.now(),
          date: new Date().toISOString(),
          productId: _checkoutItem.id,
          productName: _checkoutItem.name,
          batch: _checkoutItem.batch || '',
          customer: soldToVal,
          soldTo: soldToVal,
          qty,
          unitPrice: price,
          subtotal,
          discount: discountAmt,
          charge: chargeAmt,
          total,
          type: 'sale',
          paymentStatus,
          payMode: _payMode
        });
        localStorage.setItem('inv_transactions', JSON.stringify(txns));

        const itemName = _checkoutItem.name;
        const modeLabel = isCredit ? 'Credit' : 'Cash';
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submit Checkout';

        closeCheckoutModal();
        renderSidebarStocks();
        await loadDashboard(dateRangeSelect ? dateRangeSelect.value : 'week');
        showToast(`Checkout done! ${itemName} ×${qty} — ${currency(total)} (${modeLabel})`);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModal.classList.contains('active')) closeCheckoutModal();
    });
  }

  // ── FETCH SUPABASE DASHBOARD DATA (AGGREGATED BY ACTUAL TRANSACTION DATES) ───────────────
  const fetchDashboardData = async (period = 'week') => {
    let txns = [];
    let expenses = [];

    try {
      const { data: dbTxns } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (Array.isArray(dbTxns) && dbTxns.length > 0) {
        txns = dbTxns;
      }
    } catch (e) {
      console.warn('Transactions fetch fallback:', e);
    }

    try {
      const { data: dbExpenses } = await supabase
        .from('expenses')
        .select('*');

      if (Array.isArray(dbExpenses) && dbExpenses.length > 0) {
        expenses = dbExpenses;
      }
    } catch (e) {
      console.warn('Expenses fetch fallback:', e);
    }

    // Also merge any local offline transactions / expenses if Supabase has none
    if (txns.length === 0) {
      try {
        const local = JSON.parse(localStorage.getItem('inv_transactions') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          txns = local.map(t => ({
            id: t.id,
            reference_no: `TXN-${String(t.id).slice(-6)}`,
            total: t.total,
            discount: t.discount || 0,
            payment_status: t.paymentStatus || 'paid',
            notes: t.notes || (t.productName ? `${t.productName} (x${t.qty})` : 'Sale'),
            created_at: t.date || new Date().toISOString()
          }));
        }
      } catch (e) {}
    }

    if (expenses.length === 0) {
      try {
        const localExp = JSON.parse(localStorage.getItem('inv_expenses_data') || '[]');
        if (Array.isArray(localExp) && localExp.length > 0) {
          expenses = localExp;
        }
      } catch (e) {}
    }

    // ── DATE RANGE FILTERING ────────────────────────────────────────────────
    const now = new Date();
    const getStartDate = () => {
      const d = new Date(now);
      if (period === 'today') {
        d.setHours(0, 0, 0, 0);
        return d;
      } else if (period === 'week') {
        // Start of current week (Monday)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
      } else if (period === 'month') {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
      } else if (period === 'quarter') {
        const currentQuarter = Math.floor(d.getMonth() / 3);
        d.setMonth(currentQuarter * 3, 1);
        d.setHours(0, 0, 0, 0);
        return d;
      } else if (period === 'year') {
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      return new Date(0);
    };

    const startDate = getStartDate();

    const getItemDate = (item, dateField) => {
      const val = item[dateField] || item.created_at;
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const filteredTxns = txns.filter(t => {
      const d = getItemDate(t, 'created_at');
      return d ? d >= startDate : true;
    });

    const filteredExpenses = expenses.filter(e => {
      const d = getItemDate(e, 'expense_date');
      return d ? d >= startDate : true;
    });

    // ── SUMMARY TOTALS ──────────────────────────────────────────────────────
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalDiscount = 0;

    filteredTxns.forEach(t => {
      const disc = Number(t.discount) || 0;
      const amt = t.total !== undefined && t.total !== null && !isNaN(Number(t.total))
        ? Number(t.total)
        : Math.max(0, (Number(t.subtotal) || 0) + (Number(t.charge) || 0) - disc);

      if (t.payment_status === 'paid') totalPaid += amt;
      else if (t.payment_status === 'unpaid') totalUnpaid += amt;
      else totalPaid += amt;
      totalDiscount += disc;
    });

    // Gross Sales includes overall checkouts: Paid + Unpaid + Total Discounts
    const grossSales = totalPaid + totalUnpaid + totalDiscount;

    const totalExpense = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const cashOnHand = totalPaid - totalExpense;

    // ── MAP TO TABLE TRANSACTIONS ───────────────────────────────────────────
    const mappedTxns = filteredTxns.map(t => ({
      type: 'sale',
      ref: t.reference_no || `TXN-${String(t.id).slice(0, 6)}`,
      description: t.notes || 'Counter Sale',
      date: t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      amount: Number(t.total) || 0,
      discount: Number(t.discount) || 0,
      status: t.payment_status || 'paid'
    }));

    const mappedExpenses = filteredExpenses.map(e => ({
      type: 'expense',
      ref: `EXP-${String(e.id).slice(0, 6)}`,
      description: e.title || e.category || 'Expense',
      date: e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      amount: Number(e.amount) || 0,
      discount: 0,
      status: 'recorded'
    }));

    const allMapped = [...mappedTxns, ...mappedExpenses].sort((a, b) => b.date.localeCompare(a.date));

    // ── GENERATE ACTUAL DATE BUCKETS FOR SALES OVERVIEW BAR CHART ────────────
    let chartLabels = [];
    let chartPaid = [];
    let chartUnpaid = [];
    let chartExpense = [];

    const padZero = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;

    if (period === 'today') {
      // 6 time buckets throughout the day (4h intervals)
      const hours = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'];
      chartLabels = hours;
      chartPaid = new Array(6).fill(0);
      chartUnpaid = new Array(6).fill(0);
      chartExpense = new Array(6).fill(0);

      const todayStr = toYMD(now);
      filteredTxns.forEach(t => {
        const d = getItemDate(t, 'created_at');
        if (!d || toYMD(d) !== todayStr) return;
        const bucket = Math.min(5, Math.floor(d.getHours() / 4));
        const amt = Number(t.total) || 0;
        if (t.payment_status === 'unpaid') chartUnpaid[bucket] += amt;
        else chartPaid[bucket] += amt;
      });

      filteredExpenses.forEach(e => {
        const d = getItemDate(e, 'expense_date');
        if (!d || toYMD(d) !== todayStr) return;
        const bucket = Math.min(5, Math.floor(d.getHours() / 4));
        chartExpense[bucket] += Number(e.amount) || 0;
      });

    } else if (period === 'week') {
      // Monday through Sunday of the current week
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekDates = [];
      const monday = new Date(startDate);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const ymd = toYMD(d);
        weekDates.push(ymd);
        chartLabels.push(dayNames[i]);
      }

      chartPaid = new Array(7).fill(0);
      chartUnpaid = new Array(7).fill(0);
      chartExpense = new Array(7).fill(0);

      filteredTxns.forEach(t => {
        const d = getItemDate(t, 'created_at');
        if (!d) return;
        const ymd = toYMD(d);
        const idx = weekDates.indexOf(ymd);
        if (idx !== -1) {
          const amt = Number(t.total) || 0;
          if (t.payment_status === 'unpaid') chartUnpaid[idx] += amt;
          else chartPaid[idx] += amt;
        }
      });

      filteredExpenses.forEach(e => {
        const d = getItemDate(e, 'expense_date');
        if (!d) return;
        const ymd = toYMD(d);
        const idx = weekDates.indexOf(ymd);
        if (idx !== -1) {
          chartExpense[idx] += Number(e.amount) || 0;
        }
      });

    } else if (period === 'month') {
      // 4 Weekly buckets for the current month
      chartLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4+'];
      chartPaid = [0, 0, 0, 0];
      chartUnpaid = [0, 0, 0, 0];
      chartExpense = [0, 0, 0, 0];

      filteredTxns.forEach(t => {
        const d = getItemDate(t, 'created_at');
        if (!d) return;
        const weekBucket = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        const amt = Number(t.total) || 0;
        if (t.payment_status === 'unpaid') chartUnpaid[weekBucket] += amt;
        else chartPaid[weekBucket] += amt;
      });

      filteredExpenses.forEach(e => {
        const d = getItemDate(e, 'expense_date');
        if (!d) return;
        const weekBucket = Math.min(3, Math.floor((d.getDate() - 1) / 7));
        chartExpense[weekBucket] += Number(e.amount) || 0;
      });

    } else if (period === 'quarter') {
      // 3 Months of the current quarter
      const startMonth = startDate.getMonth();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      chartLabels = [monthNames[startMonth], monthNames[startMonth + 1], monthNames[startMonth + 2]];
      chartPaid = [0, 0, 0];
      chartUnpaid = [0, 0, 0];
      chartExpense = [0, 0, 0];

      filteredTxns.forEach(t => {
        const d = getItemDate(t, 'created_at');
        if (!d) return;
        const bucket = d.getMonth() - startMonth;
        if (bucket >= 0 && bucket < 3) {
          const amt = Number(t.total) || 0;
          if (t.payment_status === 'unpaid') chartUnpaid[bucket] += amt;
          else chartPaid[bucket] += amt;
        }
      });

      filteredExpenses.forEach(e => {
        const d = getItemDate(e, 'expense_date');
        if (!d) return;
        const bucket = d.getMonth() - startMonth;
        if (bucket >= 0 && bucket < 3) {
          chartExpense[bucket] += Number(e.amount) || 0;
        }
      });

    } else {
      // 'year' - 12 Months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      chartLabels = monthNames;
      chartPaid = new Array(12).fill(0);
      chartUnpaid = new Array(12).fill(0);
      chartExpense = new Array(12).fill(0);

      filteredTxns.forEach(t => {
        const d = getItemDate(t, 'created_at');
        if (!d) return;
        const m = d.getMonth();
        const amt = Number(t.total) || 0;
        if (t.payment_status === 'unpaid') chartUnpaid[m] += amt;
        else chartPaid[m] += amt;
      });

      filteredExpenses.forEach(e => {
        const d = getItemDate(e, 'expense_date');
        if (!d) return;
        const m = d.getMonth();
        chartExpense[m] += Number(e.amount) || 0;
      });
    }

    return {
      grossSales: grossSales,
      paid: totalPaid,
      unpaid: totalUnpaid,
      expense: totalExpense,
      discount: totalDiscount,
      cash: cashOnHand,
      chartLabels,
      chartPaid,
      chartUnpaid,
      chartExpense,
      transactions: allMapped
    };
  };

  // ── UPDATE CARDS ──────────────────────────────────────────────────────────
  const animateCount = (el, target, prefix = '₱') => {
    if (!el) return;
    const start = 0;
    const duration = 800;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const val = Math.round(start + (target - start) * eased);
      el.textContent = prefix + val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (elapsed < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  };

  const updateCards = (data) => {
    const net = (data.unpaid || 0) + (data.cash || 0);
    animateCount(els.paid,     data.grossSales !== undefined ? data.grossSales : data.paid);
    animateCount(els.unpaid,   data.unpaid);
    animateCount(els.expense,  data.expense);
    animateCount(els.discount, data.discount);
    animateCount(els.cash,     data.cash);
    animateCount(els.net,      net);
    animateCount(els.donut,    data.paid + data.unpaid + data.expense + data.discount);
  };

  // ── CHARTS ────────────────────────────────────────────────────────────────
  const chartColors = {
    paid:    '#10b981',
    unpaid:  '#f59e0b',
    expense: '#ef4444',
    discount:'#8b5cf6',
    cash:    '#06b6d4',
  };

  function getChartTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#475569';
  }

  function getGridColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  }

  const initCharts = (data) => {
    const barEl = document.getElementById('salesChart');
    const donutEl = document.getElementById('breakdownChart');
    if (!barEl || !donutEl) return;

    const ctxBar   = barEl.getContext('2d');
    const ctxDonut = donutEl.getContext('2d');
    const textColor = getChartTextColor();
    const gridColor = getGridColor();

    if (salesChart) salesChart.destroy();
    if (breakdownChart) breakdownChart.destroy();

    salesChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: data.chartLabels,
        datasets: [
          {
            label: 'Paid',
            data: data.chartPaid,
            backgroundColor: chartColors.paid,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Unpaid',
            data: data.chartUnpaid,
            backgroundColor: chartColors.unpaid,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expense',
            data: data.chartExpense,
            backgroundColor: chartColors.expense,
            borderRadius: 6,
            borderSkipped: false,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${currency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              callback: (val) => '₱' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)
            }
          }
        }
      }
    });

    breakdownChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Unpaid', 'Expense', 'Discount', 'Cash'],
        datasets: [{
          data: [data.paid, data.unpaid, data.expense, data.discount, data.cash],
          backgroundColor: [
            chartColors.paid,
            chartColors.unpaid,
            chartColors.expense,
            chartColors.discount,
            chartColors.cash,
          ],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 10,
              padding: 12,
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${currency(ctx.raw)}`
            }
          }
        }
      }
    });
  };

  function updateChartTheme() {
    if (!salesChart && !breakdownChart) return;
    const textColor = getChartTextColor();
    const gridColor = getGridColor();
    if (salesChart) {
      salesChart.options.plugins.legend.labels.color = textColor;
      salesChart.options.scales.x.ticks.color = textColor;
      salesChart.options.scales.y.ticks.color = textColor;
      salesChart.options.scales.y.grid.color = gridColor;
      salesChart.update();
    }
    if (breakdownChart) {
      breakdownChart.options.plugins.legend.labels.color = textColor;
      breakdownChart.update();
    }
  }

  // ── TRANSACTIONS TABLE ────────────────────────────────────────────────────
  let currentPage = 1;
  const perPage = 5;
  let allTransactions = [];

  const renderTable = (transactions) => {
    const tbody = document.getElementById('transactionTableBody') || document.getElementById('txnTableBody');
    const info = document.getElementById('tableInfo');
    const pageNum = document.getElementById('pageNum');
    if (!tbody || !info || !pageNum) return;

    const totalPages = Math.ceil(transactions.length / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const paged = transactions.slice(start, start + perPage);

    if (paged.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No transactions found</td></tr>`;
      info.textContent = 'Showing 0 records';
      pageNum.textContent = '1 / 1';
      return;
    }

    const typeBadgeMap = {
      sale:    { cls: 'paid',    icon: 'fa-shopping-cart',         label: 'Sale' },
      expense: { cls: 'expense', icon: 'fa-file-invoice-dollar',   label: 'Expense' },
    };
    tbody.innerHTML = paged.map(t => {
      const tb = typeBadgeMap[t.type] || { cls: 'paid', icon: 'fa-circle', label: 'Sale' };
      return `
      <tr>
        <td><span class="badge ${tb.cls}" style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;"><i class="fa-solid ${tb.icon}" style="font-size:0.65rem;"></i>${tb.label}</span></td>
        <td style="font-weight:700; color:var(--accent);">${t.ref}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.description || t.customer || '—'}</td>
        <td>${t.date}</td>
        <td style="font-weight:700;">${currency(t.amount)}</td>
        <td>
          <span class="badge ${t.status || 'paid'}">
            <i class="fa-solid fa-circle" style="font-size:0.45rem;"></i>
            ${((t.status || 'paid').charAt(0).toUpperCase() + (t.status || 'paid').slice(1))}
          </span>
        </td>
      </tr>`;
    }).join('');

    info.textContent = `Showing ${start + 1}–${Math.min(start + perPage, transactions.length)} of ${transactions.length} records`;
    pageNum.textContent = `${currentPage} / ${totalPages}`;
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  };

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderTable(filterTransactions()); }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++; renderTable(filterTransactions());
    });
  }

  const filterTransactions = () => {
    if (!tableSearch) return allTransactions;
    const q = tableSearch.value.trim().toLowerCase();
    if (!q) return allTransactions;
    return allTransactions.filter(t =>
      (t.ref || '').toLowerCase().includes(q) ||
      (t.description || t.customer || '').toLowerCase().includes(q) ||
      (t.status || '').toLowerCase().includes(q)
    );
  };

  if (tableSearch) {
    tableSearch.addEventListener('input', () => {
      currentPage = 1;
      renderTable(filterTransactions());
    });
  }

  // ── LOAD DASHBOARD ────────────────────────────────────────────────────────
  const loadDashboard = async (period = 'week') => {
    const data = await fetchDashboardData(period);
    updateCards(data);
    allTransactions = data.transactions;
    currentPage = 1;
    renderTable(allTransactions);

    if (salesChart) {
      salesChart.data.labels = data.chartLabels;
      salesChart.data.datasets[0].data = data.chartPaid;
      salesChart.data.datasets[1].data = data.chartUnpaid;
      salesChart.data.datasets[2].data = data.chartExpense;
      salesChart.update();

      breakdownChart.data.datasets[0].data = [data.paid, data.unpaid, data.expense, data.discount, data.cash];
      breakdownChart.update();
    } else {
      initCharts(data);
    }
  };

  if (dateRangeSelect) {
    dateRangeSelect.addEventListener('change', (e) => loadDashboard(e.target.value));
  }

  // ── USER SESSION & LOGOUT ────────────────────────────────────────────────
  const userAvatar = document.querySelector('.user-avatar');
  const sessionData = sessionStorage.getItem('inv_current_user');
  if (sessionData) {
    try {
      const user = JSON.parse(sessionData);
      if (userAvatar && user.username) {
        userAvatar.title = `${user.username} (${user.roleName || user.role})`;
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }
  }

  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await supabase.auth.signOut(); } catch (_) {}
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // ── STARTUP: RENDER SIDEBAR STOCKS IMMEDIATELY THEN LOAD FULL DATA ────────
  renderSidebarStocks();
  loadStocks();
  loadDashboard('week');

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
