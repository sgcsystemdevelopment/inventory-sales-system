/**
 * Dashboard Script — Inventory & Sales System
 * Handles: Theme, Sidebar, Charts (Chart.js), Summary cards, Transactions table,
 * Supabase live metrics, and Stocks checkout modal.
 */

import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {

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
      themeIcon.className = 'fa-regular fa-sun';
      if (sidebarLogo) sidebarLogo.style.filter = 'brightness(0) invert(1)';
    } else {
      themeIcon.className = 'fa-regular fa-moon';
      if (sidebarLogo) sidebarLogo.style.filter = 'brightness(0) invert(1)';
    }
    updateChartTheme(theme);
  };

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

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

  menuBtn.addEventListener('click', openSidebar);
  sidebarCloseBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // ── CURRENCY FORMATTER ────────────────────────────────────────────────────
  const currency = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── FETCH SUPABASE DATA (WITH SEED/MOCK FALLBACK) ─────────────────────────
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

    // If transactions found in Supabase
    if (txns.length > 0) {
      let totalPaid = 0;
      let totalUnpaid = 0;
      let totalDiscount = 0;

      txns.forEach(t => {
        const amt = Number(t.total) || 0;
        const disc = Number(t.discount) || 0;
        if (t.payment_status === 'paid') totalPaid += amt;
        else if (t.payment_status === 'unpaid') totalUnpaid += amt;
        else totalPaid += amt; // partial or other
        totalDiscount += disc;
      });

      const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const cashOnHand = totalPaid - totalExpense;

      const mappedTxns = txns.map(t => ({
        ref: t.reference_no || `TXN-${t.id.slice(0, 6)}`,
        customer: t.notes || 'Counter Sale',
        date: t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: Number(t.total) || 0,
        discount: Number(t.discount) || 0,
        status: t.payment_status || 'paid'
      }));

      return {
        paid: totalPaid,
        unpaid: totalUnpaid,
        expense: totalExpense,
        discount: totalDiscount,
        cash: cashOnHand,
        chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        chartPaid: [
          Math.round(totalPaid * 0.12),
          Math.round(totalPaid * 0.15),
          Math.round(totalPaid * 0.18),
          Math.round(totalPaid * 0.10),
          Math.round(totalPaid * 0.22),
          Math.round(totalPaid * 0.08),
          Math.round(totalPaid * 0.15)
        ],
        chartUnpaid: [
          Math.round(totalUnpaid * 0.15),
          Math.round(totalUnpaid * 0.20),
          Math.round(totalUnpaid * 0.10),
          Math.round(totalUnpaid * 0.25),
          Math.round(totalUnpaid * 0.10),
          Math.round(totalUnpaid * 0.10),
          Math.round(totalUnpaid * 0.10)
        ],
        chartExpense: [
          Math.round(totalExpense * 0.14),
          Math.round(totalExpense * 0.14),
          Math.round(totalExpense * 0.14),
          Math.round(totalExpense * 0.14),
          Math.round(totalExpense * 0.16),
          Math.round(totalExpense * 0.14),
          Math.round(totalExpense * 0.14)
        ],
        transactions: mappedTxns
      };
    }

    // Check localStorage transactions
    let localTxns = [];
    try { localTxns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}

    // Fallback Mock scale if brand new
    const scale = { today: 1, week: 6.5, month: 28, quarter: 85, year: 320 }[period] || 6.5;
    const baseMock = {
      paid:     Math.round(48500 * scale),
      unpaid:   Math.round(12300 * scale),
      expense:  Math.round(9800  * scale),
      discount: Math.round(3200  * scale),
      cash:     Math.round(31000 * scale),
      chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      chartPaid:    [8200, 7500, 9800, 6300, 11200, 5600, 9800],
      chartUnpaid:  [1200, 2100, 800,  1900, 600,   2400, 1100],
      chartExpense: [1500, 1200, 1800, 900,  2200,  1100, 1700],
      transactions: [
        { ref: 'INV-00234', customer: 'Maria Santos',    date: '2026-11-16', amount: 15800, discount: 500,  status: 'paid' },
        { ref: 'INV-00233', customer: 'Jose Reyes',      date: '2026-11-16', amount: 8200,  discount: 0,    status: 'unpaid' },
        { ref: 'INV-00232', customer: 'Ana Cruz',        date: '2026-11-15', amount: 24500, discount: 1200, status: 'paid' },
        { ref: 'INV-00231', customer: 'Carlo Villanueva',date: '2026-11-15', amount: 5300,  discount: 300,  status: 'partial' },
        { ref: 'INV-00230', customer: 'Grace Lim',       date: '2026-11-14', amount: 11000, discount: 0,    status: 'paid' },
      ]
    };

    if (localTxns.length > 0) {
      const extraPaid = localTxns.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const extraDisc = localTxns.reduce((sum, t) => sum + (Number(t.discount) || 0), 0);
      baseMock.paid += extraPaid;
      baseMock.cash += extraPaid;
      baseMock.discount += extraDisc;

      const formattedLocal = localTxns.map(t => ({
        ref: `TXN-${String(t.id).slice(-5)}`,
        customer: `${t.productName} (x${t.qty})`,
        date: t.date ? t.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: Number(t.total) || 0,
        discount: Number(t.discount) || 0,
        status: 'paid'
      }));

      baseMock.transactions = [...formattedLocal, ...baseMock.transactions];
    }

    return baseMock;
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
    const net = data.paid - data.expense - data.discount;
    animateCount(els.paid,     data.paid);
    animateCount(els.unpaid,   data.unpaid);
    animateCount(els.expense,  data.expense);
    animateCount(els.discount, data.discount);
    animateCount(els.cash,     data.cash);
    animateCount(els.net,      net);
    animateCount(els.donut,    data.paid + data.unpaid + data.expense + data.discount);
  };

  // ── CHARTS ────────────────────────────────────────────────────────────────
  let salesChart, breakdownChart;

  const chartColors = {
    paid:    '#10b981',
    unpaid:  '#f59e0b',
    expense: '#ef4444',
    discount:'#8b5cf6',
    cash:    '#06b6d4',
  };

  const getChartTextColor = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#475569';
  const getGridColor = () =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

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

  const updateChartTheme = () => {
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
  };

  // ── TRANSACTIONS TABLE ────────────────────────────────────────────────────
  let currentPage = 1;
  const perPage = 5;
  let allTransactions = [];

  const renderTable = (transactions) => {
    const tbody = document.getElementById('txnTableBody');
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

    tbody.innerHTML = paged.map(t => `
      <tr>
        <td style="font-weight:700; color:var(--accent);">${t.ref}</td>
        <td>${t.customer}</td>
        <td>${t.date}</td>
        <td style="font-weight:700;">${currency(t.amount)}</td>
        <td style="color: var(--color-discount);">${t.discount > 0 ? currency(t.discount) : '—'}</td>
        <td>
          <span class="badge ${t.status}">
            <i class="fa-solid fa-circle" style="font-size:0.45rem;"></i>
            ${t.status.charAt(0).toUpperCase() + t.status.slice(1)}
          </span>
        </td>
      </tr>`).join('');

    info.textContent = `Showing ${start + 1}–${Math.min(start + perPage, transactions.length)} of ${transactions.length} records`;
    pageNum.textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
  };

  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(filterTransactions()); }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    currentPage++; renderTable(filterTransactions());
  });

  const filterTransactions = () => {
    const q = tableSearch.value.trim().toLowerCase();
    if (!q) return allTransactions;
    return allTransactions.filter(t =>
      t.ref.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q)
    );
  };

  tableSearch.addEventListener('input', () => {
    currentPage = 1;
    renderTable(filterTransactions());
  });

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

  // ── SIDEBAR STOCKS LIST + CHECKOUT MODAL ──────────────────────────────────
  let _checkoutItem = null;

  function fmt(n) {
    return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function getStocksList() {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name');

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(i => ({
          id: i.id,
          name: i.name,
          batch: i.batch,
          stocks: Number(i.quantity) || 0,
          price: parseFloat(i.unit_price) || 0
        }));
        localStorage.setItem('inv_stocks_data', JSON.stringify(mapped));
        return mapped;
      }
    } catch (_) {}

    try {
      return JSON.parse(localStorage.getItem('inv_stocks_data') || '[]');
    } catch (_) {
      return [];
    }
  }

  async function renderSidebarStocks() {
    const container = document.getElementById('sidebarStocksList');
    if (!container) return;

    const stocks = await getStocksList();
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
      el.addEventListener('click', async () => {
        const id = el.dataset.id;
        const all = await getStocksList();
        const found = all.find(s => String(s.id) === String(id));
        if (found) openCheckoutModal(found);
      });
    });
  }

  function updateCheckoutSummary() {
    if (!_checkoutItem) return;
    const qty = Math.max(1, parseInt(document.getElementById('coQtyInput').value) || 1);
    const disc = Math.max(0, parseFloat(document.getElementById('coDiscountInput').value) || 0);
    const price = Number(_checkoutItem.price) || 0;
    const subtotal = qty * price;
    const discountAmt = Math.min(disc, subtotal);
    const total = subtotal - discountAmt;
    document.getElementById('coSubtotal').textContent = fmt(subtotal);
    document.getElementById('coDiscount').textContent = '-' + fmt(discountAmt);
    document.getElementById('coGrandTotal').textContent = fmt(total);
  }

  function openCheckoutModal(item) {
    _checkoutItem = item;
    const qty = Number(item.stocks) || 0;
    document.getElementById('coProductName').textContent = item.name;
    document.getElementById('coUnitPrice').textContent = fmt(item.price) + '/unit';
    const stockBadge = document.getElementById('coStockAvail');
    stockBadge.textContent = qty + ' units available';
    stockBadge.className = 'co-stock-badge' + (qty === 0 ? ' out' : qty <= 10 ? ' low' : '');
    document.getElementById('coBatchTag').textContent = item.batch ? 'Batch: ' + item.batch : '';
    const qtyInput = document.getElementById('coQtyInput');
    qtyInput.value = qty > 0 ? 1 : 0;
    qtyInput.max = qty;
    document.getElementById('coDiscountInput').value = 0;
    document.getElementById('coQtyMinus').disabled = true;
    document.getElementById('coQtyPlus').disabled = qty <= 1;
    document.getElementById('confirmCheckoutBtn').disabled = qty === 0;
    updateCheckoutSummary();
    const modal = document.getElementById('checkoutModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 220);
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
    document.getElementById('closeCheckoutBtn').addEventListener('click', closeCheckoutModal);
    document.getElementById('cancelCheckoutBtn').addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutModalOverlay').addEventListener('click', closeCheckoutModal);

    document.getElementById('coQtyMinus').addEventListener('click', () => {
      const inp = document.getElementById('coQtyInput');
      const val = Math.max(1, parseInt(inp.value) - 1);
      inp.value = val;
      document.getElementById('coQtyMinus').disabled = val <= 1;
      document.getElementById('coQtyPlus').disabled = _checkoutItem && val >= Number(_checkoutItem.stocks);
      updateCheckoutSummary();
    });

    document.getElementById('coQtyPlus').addEventListener('click', () => {
      const inp = document.getElementById('coQtyInput');
      const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
      const val = Math.min(max, parseInt(inp.value) + 1);
      inp.value = val;
      document.getElementById('coQtyMinus').disabled = val <= 1;
      document.getElementById('coQtyPlus').disabled = val >= max;
      updateCheckoutSummary();
    });

    document.getElementById('coQtyInput').addEventListener('input', () => {
      const inp = document.getElementById('coQtyInput');
      const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
      let val = parseInt(inp.value) || 1;
      val = Math.max(1, Math.min(val, max));
      inp.value = val;
      document.getElementById('coQtyMinus').disabled = val <= 1;
      document.getElementById('coQtyPlus').disabled = val >= max;
      updateCheckoutSummary();
    });

    document.getElementById('coDiscountInput').addEventListener('input', updateCheckoutSummary);

    document.getElementById('confirmCheckoutBtn').addEventListener('click', async () => {
      if (!_checkoutItem) return;
      const qty = parseInt(document.getElementById('coQtyInput').value) || 1;
      const disc = Math.max(0, parseFloat(document.getElementById('coDiscountInput').value) || 0);
      const price = Number(_checkoutItem.price) || 0;
      const subtotal = qty * price;
      const discountAmt = Math.min(disc, subtotal);
      const total = subtotal - discountAmt;

      // Deduct stock from localStorage
      let all = [];
      try { all = JSON.parse(localStorage.getItem('inv_stocks_data') || '[]'); } catch (e) {}
      const idx = all.findIndex(s => String(s.id) === String(_checkoutItem.id));
      if (idx !== -1) {
        all[idx].stocks = Math.max(0, Number(all[idx].stocks) - qty);
        all[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('inv_stocks_data', JSON.stringify(all));
      }

      // Record transaction in Supabase
      try {
        const { data: txn } = await supabase
          .from('transactions')
          .insert([{
            type: 'sale',
            payment_status: 'paid',
            subtotal,
            discount: discountAmt,
            total
          }])
          .select()
          .single();

        if (txn) {
          await supabase.from('transaction_items').insert([{
            transaction_id: txn.id,
            stock_item_id: _checkoutItem.id.startsWith('stk_') ? null : _checkoutItem.id,
            product_name: _checkoutItem.name,
            batch: _checkoutItem.batch,
            unit_price: price,
            quantity: qty,
            item_discount: discountAmt
          }]);
        }
      } catch (err) {
        console.warn('Supabase checkout fallback:', err);
      }

      // Record transaction locally
      let txns = [];
      try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
      txns.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        productId: _checkoutItem.id,
        productName: _checkoutItem.name,
        batch: _checkoutItem.batch,
        qty,
        unitPrice: price,
        subtotal,
        discount: discountAmt,
        total,
        type: 'sale'
      });
      localStorage.setItem('inv_transactions', JSON.stringify(txns));

      const itemName = _checkoutItem.name;
      closeCheckoutModal();
      await renderSidebarStocks();
      await loadDashboard('week');
      showToast(`Checkout done! ${itemName} ×${qty} — ${fmt(total)}`);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModal.classList.contains('open')) closeCheckoutModal();
    });
  }

  // ── INITIAL LOAD ─────────────────────────────────────────────────────────
  await renderSidebarStocks();
  await loadDashboard('week');

});
