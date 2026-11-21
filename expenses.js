/**
 * Expenses Script — Inventory & Sales System
 * Handles: Theme, Sidebar, Expenses CRUD, Supabase sync, Filters, Search,
 * Pagination, Summary Cards, and Sidebar Stocks display.
 *
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';

const initExpenses = async () => {

  // ── ELEMENT REFERENCES ──────────────────────────────────────────────────
  const themeToggleBtn    = document.getElementById('themeToggleBtn');
  const themeIcon         = document.getElementById('themeIcon');
  const sidebarEl         = document.getElementById('sidebar');
  const menuBtn           = document.getElementById('menuBtn');
  const sidebarCloseBtn   = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay    = document.getElementById('sidebarOverlay');
  const sidebarLogo       = document.getElementById('sidebarLogo');

  // Summary card elements
  const statTotalExpenses = document.getElementById('statTotalExpenses');
  const statMonthExpenses = document.getElementById('statMonthExpenses');
  const statTotalEntries  = document.getElementById('statTotalEntries');
  const statTopCategory   = document.getElementById('statTopCategory');

  // Table & Controls
  const expensesTableBody = document.getElementById('expensesTableBody');
  const expenseSearch     = document.getElementById('expenseSearch');
  const expenseDateFilter = document.getElementById('expenseDateFilter');
  const expenseCatFilter  = document.getElementById('expenseCategoryFilter');
  const expenseTableInfo  = document.getElementById('expenseTableInfo');
  const expensePageNum    = document.getElementById('expensePageNum');
  const prevExpensePage   = document.getElementById('prevExpensePage');
  const nextExpensePage   = document.getElementById('nextExpensePage');

  // Add Expense triggers
  const topAddExpenseBtn  = document.getElementById('topAddExpenseBtn');
  const tableAddExpenseBtn= document.getElementById('tableAddExpenseBtn');

  // Modal elements
  const expenseModal      = document.getElementById('expenseModal');
  const expenseModalOverlay = document.getElementById('expenseModalOverlay');
  const closeExpenseModalBtn = document.getElementById('closeExpenseModalBtn');
  const cancelExpenseBtn  = document.getElementById('cancelExpenseBtn');
  const expenseForm       = document.getElementById('expenseForm');
  const expenseModalTitle = document.getElementById('expenseModalTitle');
  const expenseModalSubtitle = document.getElementById('expenseModalSubtitle');
  const saveExpenseBtnText = document.getElementById('saveExpenseBtnText');
  const editExpenseId     = document.getElementById('editExpenseId');
  const expenseDate       = document.getElementById('expenseDate');
  const expenseAmount     = document.getElementById('expenseAmount');
  const expenseCategory   = document.getElementById('expenseCategory');
  const expenseTitle      = document.getElementById('expenseTitle');
  const expenseDescription= document.getElementById('expenseDescription');

  // Toast
  const toastNotice       = document.getElementById('toastNotice');
  const toastIcon         = document.getElementById('toastIcon');
  const toastMsg          = document.getElementById('toastMsg');

  // ── CHECKOUT STATE ───────────────────────────────────────────────────────
  let _checkoutItem = null;
  let _payMode = 'cash';

  // ── THEME ───────────────────────────────────────────────────────────────
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
  };

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // ── SIDEBAR TOGGLE ──────────────────────────────────────────────────────
  menuBtn.addEventListener('click', () => {
    sidebarEl.classList.add('open');
    sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeSidebar = () => {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  sidebarCloseBtn.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // ── USER SESSION & LOGOUT ───────────────────────────────────────────────
  const sessionData = sessionStorage.getItem('inv_current_user');
  const userAvatar = document.getElementById('userAvatar');
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

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // ── TOAST HELPER ────────────────────────────────────────────────────────
  let toastTimer;
  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toastNotice.className = `toast-notice show ${type}`;
    toastIcon.className = type === 'success'
      ? 'fa-solid fa-circle-check'
      : type === 'danger'
        ? 'fa-solid fa-triangle-exclamation'
        : 'fa-solid fa-circle-info';

    toastTimer = setTimeout(() => {
      toastNotice.classList.remove('show');
    }, 3200);
  };

  // ── CURRENCY FORMATTER ──────────────────────────────────────────────────
  const currency = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTodayISO = () => new Date().toISOString().slice(0, 10);

  // ── CHECKOUT HELPERS ─────────────────────────────────────────────────────
  const currencyFmt = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function updateCheckoutSummary() {
    if (!_checkoutItem) return;
    const qtyInp = document.getElementById('coQtyInput');
    const qty = Math.max(1, parseInt(qtyInp ? qtyInp.value : 1) || 1);
    const price = Number(_checkoutItem.price) || 0;
    const subtotal = qty * price;
    const subtotalEl = document.getElementById('coSubtotal');
    if (subtotalEl) subtotalEl.textContent = currencyFmt(subtotal);
    const chargeRow = document.getElementById('summaryChargeRow');
    const discountRow = document.getElementById('summaryDiscountRow');
    const chargeValEl = document.getElementById('coCharge');
    const discValEl = document.getElementById('coDiscount');
    const partialValEl = document.getElementById('coPartial');
    const partialRow = document.getElementById('summaryPartialRow');
    const totalLabelEl = document.getElementById('coTotalLabel');
    const totalEl = document.getElementById('coGrandTotal');
    if (_payMode === 'credit') {
      const chargeInp = document.getElementById('coChargeInput');
      const chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
      const total = subtotal + chargeAmt;
      if (chargeRow) chargeRow.style.display = 'flex';
      if (discountRow) discountRow.style.display = 'none';
      if (partialRow) partialRow.style.display = 'none';
      if (chargeValEl) chargeValEl.textContent = '+' + currencyFmt(chargeAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Total (Credit)';
      if (totalEl) totalEl.textContent = currencyFmt(total);
    } else if (_payMode === 'partial') {
      const partialInp = document.getElementById('coPartialInput');
      const rawPartial = Math.max(0, parseFloat(partialInp ? partialInp.value : 0) || 0);
      const partialAmt = Math.min(rawPartial, subtotal);
      const remainingCredit = Math.max(0, subtotal - partialAmt);
      if (chargeRow) chargeRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'none';
      if (partialRow) partialRow.style.display = 'flex';
      if (partialValEl) partialValEl.textContent = '-' + currencyFmt(partialAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Remaining Unpaid';
      if (totalEl) totalEl.textContent = currencyFmt(remainingCredit);
    } else {
      const discInp = document.getElementById('coDiscountInput');
      const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
      const discountAmt = Math.min(discVal, subtotal);
      const total = Math.max(0, subtotal - discountAmt);
      if (chargeRow) chargeRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'flex';
      if (partialRow) partialRow.style.display = 'none';
      if (discValEl) discValEl.textContent = '-' + currencyFmt(discountAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Total';
      if (totalEl) totalEl.textContent = currencyFmt(total);
    }
  }

  function setPayMode(mode) {
    _payMode = mode;
    const payModeCash    = document.getElementById('payModeCash');
    const payModeCredit  = document.getElementById('payModeCredit');
    const payModePartial = document.getElementById('payModePartial');
    const cashSection    = document.getElementById('cashSection');
    const creditSection  = document.getElementById('creditSection');
    const partialSection = document.getElementById('partialSection');
    if (payModeCash)    payModeCash.classList.toggle('active', mode === 'cash');
    if (payModeCredit)  payModeCredit.classList.toggle('active', mode === 'credit');
    if (payModePartial) payModePartial.classList.toggle('active', mode === 'partial');

    if (cashSection)    cashSection.style.display = mode === 'cash' ? 'block' : 'none';
    if (creditSection)  creditSection.style.display = mode === 'credit' ? 'block' : 'none';
    if (partialSection) partialSection.style.display = mode === 'partial' ? 'block' : 'none';
    updateCheckoutSummary();
  }

  function openCheckoutModal(item) {
    _checkoutItem = item;
    const qty = Number(item.stocks) || 0;
    const pName  = document.getElementById('coProductName');
    const pPrice = document.getElementById('coUnitPrice');
    const pStock = document.getElementById('coStockAvail');
    const pBatch = document.getElementById('coBatchTag');
    if (pName)  pName.textContent  = item.name;
    if (pPrice) pPrice.textContent = currencyFmt(item.price) + '/unit';
    if (pStock) {
      pStock.textContent = qty + ' units available';
      pStock.className = 'co-stock-badge' + (qty === 0 ? ' out' : qty <= 10 ? ' low' : '');
    }
    if (pBatch) pBatch.textContent = item.batch ? 'Batch: ' + item.batch : '';
    const qtyInput = document.getElementById('coQtyInput');
    if (qtyInput) { qtyInput.value = qty > 0 ? 1 : 0; qtyInput.max = qty; }
    const discInp   = document.getElementById('coDiscountInput');
    if (discInp)   discInp.value = '';
    const chargeInp = document.getElementById('coChargeInput');
    if (chargeInp) chargeInp.value = '';
    const partialInp = document.getElementById('coPartialInput');
    if (partialInp) partialInp.value = '';
    const soldToInp = document.getElementById('coSoldToInput');
    if (soldToInp) soldToInp.value = '';
    const minusBtn  = document.getElementById('coQtyMinus');
    const plusBtn   = document.getElementById('coQtyPlus');
    const confirmBtn = document.getElementById('confirmCheckoutBtn');
    if (minusBtn)   minusBtn.disabled  = true;
    if (plusBtn)    plusBtn.disabled   = qty <= 1;
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

  // ── DATA PERSISTENCE ────────────────────────────────────────────────────
  const STORAGE_KEY = 'inv_expenses_data';
  let inMemoryExpenses = [];

  function getLocalExpenses() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function getExpenses() {
    return inMemoryExpenses.length ? inMemoryExpenses : getLocalExpenses();
  }

  function syncLocal(expenses) {
    inMemoryExpenses = expenses;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    updateSummaryCards();
    renderTable();
  }

  // ── LOAD FROM SUPABASE ──────────────────────────────────────────────────
  async function loadExpenses() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(item => ({
          id: item.id,
          date: item.expense_date || item.created_at,
          amount: parseFloat(item.amount) || 0,
          category: item.category || 'other',
          title: item.title || '',
          description: item.description || '',
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        syncLocal(mapped);
        return;
      }
    } catch (err) {
      console.warn('Supabase expense fetch fallback:', err);
    }

    // Fallback to local
    const local = getLocalExpenses();
    syncLocal(local);
  }

  // ── SIDEBAR STOCKS (READ-ONLY FROM SHARED localStorage) ─────────────────
  function renderSidebarStocks() {
    const container = document.getElementById('sidebarStocksList');
    if (!container) return;

    let stocks = [];
    try {
      const raw = localStorage.getItem('inv_stocks_data');
      if (raw) stocks = JSON.parse(raw);
    } catch (e) {}

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
        let allStocks = [];
        try { allStocks = JSON.parse(localStorage.getItem('inv_stocks_data') || '[]'); } catch(e) {}
        const found = allStocks.find(s => String(s.id) === String(id));
        if (found) openCheckoutModal(found);
      });
    });
  }

  renderSidebarStocks();

  // ── SUMMARY CARDS ───────────────────────────────────────────────────────
  function updateSummaryCards() {
    const expenses = getExpenses();
    const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthExpenses = expenses.filter(e => e.date >= thisMonthStart);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Top category
    const catTotals = {};
    expenses.forEach(e => {
      const cat = e.category || 'other';
      catTotals[cat] = (catTotals[cat] || 0) + (Number(e.amount) || 0);
    });
    let topCat = '—';
    let topCatVal = 0;
    Object.entries(catTotals).forEach(([cat, val]) => {
      if (val > topCatVal) {
        topCat = cat.charAt(0).toUpperCase() + cat.slice(1);
        topCatVal = val;
      }
    });

    if (statTotalExpenses) statTotalExpenses.textContent = currency(total);
    if (statMonthExpenses) statMonthExpenses.textContent = currency(monthTotal);
    if (statTotalEntries) statTotalEntries.textContent = expenses.length.toLocaleString();
    if (statTopCategory) statTopCategory.textContent = topCat;
  }

  // ── TABLE RENDERING ─────────────────────────────────────────────────────
  let currentPage = 1;
  const perPage = 10;

  function getFilteredExpenses() {
    let expenses = getExpenses();
    const query = (expenseSearch ? expenseSearch.value.trim().toLowerCase() : '');
    const dateVal = (expenseDateFilter ? expenseDateFilter.value : '');
    const catVal = (expenseCatFilter ? expenseCatFilter.value : 'all');

    if (query) {
      expenses = expenses.filter(e =>
        (e.title || '').toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query) ||
        (e.category || '').toLowerCase().includes(query) ||
        String(e.amount).includes(query)
      );
    }

    if (dateVal) {
      expenses = expenses.filter(e => e.date === dateVal);
    }

    if (catVal !== 'all') {
      expenses = expenses.filter(e => e.category === catVal);
    }

    return expenses;
  }

  function renderTable() {
    const filtered = getFilteredExpenses();
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    if (total === 0) {
      expensesTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i>
        <p>No expenses found.</p></div></td></tr>`;
      expenseTableInfo.textContent = 'Showing 0 records';
      expensePageNum.textContent = '1 / 1';
      prevExpensePage.disabled = true;
      nextExpensePage.disabled = true;
      return;
    }

    expensesTableBody.innerHTML = paginated.map((item, idx) => {
      const cat = item.category || 'other';
      const catIcon = {
        utilities: 'fa-bolt',
        supplies: 'fa-box',
        salary: 'fa-users',
        rent: 'fa-building',
        maintenance: 'fa-wrench',
        transport: 'fa-truck',
        marketing: 'fa-bullhorn',
        other: 'fa-ellipsis'
      }[cat] || 'fa-ellipsis';

      return `
        <tr>
          <td style="font-weight:600; color:var(--text-muted);">${start + idx + 1}</td>
          <td>
            <div style="font-size:0.83rem; font-weight:500;">
              <i class="fa-regular fa-calendar" style="margin-right:4px; font-size:0.75rem; color:var(--accent);"></i>
              ${formatDate(item.date)}
            </div>
          </td>
          <td style="text-align:right; font-weight:700; color:#ef4444;">
            ${currency(item.amount)}
          </td>
          <td>
            <span class="category-badge ${cat}">
              <i class="fa-solid ${catIcon}"></i>
              ${cat}
            </span>
          </td>
          <td>
            <div style="max-width:250px;">
              <div style="font-weight:600; font-size:0.85rem;">${item.title || '—'}</div>
              ${item.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.description}</div>` : ''}
            </div>
          </td>
          <td style="text-align:center;">
            <div class="action-btns">
              <button class="btn-icon-action edit" onclick="handleEditExpense('${item.id}')" title="Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon-action delete" onclick="handleDeleteExpense('${item.id}')" title="Delete">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    expenseTableInfo.textContent = `Showing ${start + 1}–${Math.min(start + perPage, total)} of ${total} records`;
    expensePageNum.textContent = `${currentPage} / ${totalPages}`;
    prevExpensePage.disabled = currentPage === 1;
    nextExpensePage.disabled = currentPage >= totalPages;
  }

  // Pagination
  prevExpensePage.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
  });

  nextExpensePage.addEventListener('click', () => {
    currentPage++;
    renderTable();
  });

  // Filter listeners
  if (expenseSearch) {
    expenseSearch.addEventListener('input', () => { currentPage = 1; renderTable(); });
  }
  if (expenseDateFilter) {
    expenseDateFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
  }
  if (expenseCatFilter) {
    expenseCatFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
  }

  // ── MODAL MANAGEMENT ────────────────────────────────────────────────────
  const openExpenseModal = (itemToEdit = null) => {
    expenseForm.reset();

    if (itemToEdit) {
      expenseModalTitle.textContent = 'Edit Expense';
      expenseModalSubtitle.textContent = `Update details for "${itemToEdit.title}"`;
      saveExpenseBtnText.textContent = 'Update Expense';
      editExpenseId.value = itemToEdit.id;
      expenseDate.value = itemToEdit.date || getTodayISO();
      expenseAmount.value = itemToEdit.amount || '';
      expenseCategory.value = itemToEdit.category || 'other';
      expenseTitle.value = itemToEdit.title || '';
      expenseDescription.value = itemToEdit.description || '';
    } else {
      expenseModalTitle.textContent = 'Add Expense';
      expenseModalSubtitle.textContent = 'Record a new business expense';
      saveExpenseBtnText.textContent = 'Save Expense';
      editExpenseId.value = '';
      expenseDate.value = getTodayISO();
    }

    expenseModal.classList.add('active');
    setTimeout(() => expenseDate.focus(), 150);
  };

  const closeExpenseModal = () => {
    expenseModal.classList.remove('active');
  };

  // Open modal triggers
  if (tableAddExpenseBtn) tableAddExpenseBtn.addEventListener('click', () => openExpenseModal());

  // Close modal triggers
  closeExpenseModalBtn.addEventListener('click', closeExpenseModal);
  cancelExpenseBtn.addEventListener('click', closeExpenseModal);
  expenseModalOverlay.addEventListener('click', closeExpenseModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeExpenseModal();
  });

  // ── FORM SUBMIT (ADD / EDIT) ────────────────────────────────────────────
  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = expenseDate.value;
    const amountVal = parseFloat(expenseAmount.value);
    const categoryVal = expenseCategory.value;
    const titleVal = expenseTitle.value.trim();
    const descriptionVal = expenseDescription.value.trim();
    const targetId = editExpenseId.value;

    if (!dateVal || isNaN(amountVal) || amountVal <= 0 || !categoryVal || !titleVal) {
      showToast('Please fill in all required fields.', 'danger');
      return;
    }

    const expenses = [...getExpenses()];

    if (targetId) {
      // ── EDIT existing expense ──
      const idx = expenses.findIndex(e => String(e.id) === String(targetId));
      if (idx !== -1) {
        expenses[idx].date = dateVal;
        expenses[idx].amount = amountVal;
        expenses[idx].category = categoryVal;
        expenses[idx].title = titleVal;
        expenses[idx].description = descriptionVal;
        expenses[idx].updatedAt = new Date().toISOString();
        syncLocal(expenses);
        showToast(`Expense "${titleVal}" updated!`);
      }

      // Update in Supabase
      try {
        await supabase
          .from('expenses')
          .update({
            expense_date: dateVal,
            amount: amountVal,
            category: categoryVal,
            title: titleVal,
            description: descriptionVal
          })
          .eq('id', targetId);
      } catch (err) {
        console.warn('Supabase expense update fallback:', err);
      }

    } else {
      // ── ADD new expense ──
      const tempId = 'exp_' + Date.now();
      const newExpense = {
        id: tempId,
        date: dateVal,
        amount: amountVal,
        category: categoryVal,
        title: titleVal,
        description: descriptionVal,
        createdAt: new Date().toISOString()
      };
      expenses.unshift(newExpense);
      syncLocal(expenses);
      showToast(`Expense "${titleVal}" added!`);

      // Insert in Supabase
      try {
        const { data: inserted } = await supabase
          .from('expenses')
          .insert([{
            expense_date: dateVal,
            amount: amountVal,
            category: categoryVal,
            title: titleVal,
            description: descriptionVal
          }])
          .select();

        if (inserted && inserted[0]) {
          newExpense.id = inserted[0].id;
          syncLocal(expenses);
        }
      } catch (err) {
        console.warn('Supabase expense insert fallback:', err);
      }
    }

    closeExpenseModal();
  });

  // ── GLOBAL ACTION HANDLERS (EDIT / DELETE) ──────────────────────────────
  window.handleEditExpense = (id) => {
    const found = getExpenses().find(e => String(e.id) === String(id));
    if (found) openExpenseModal(found);
  };

  window.handleDeleteExpense = async (id) => {
    const expenses = getExpenses();
    const found = expenses.find(e => String(e.id) === String(id));
    if (!found) return;

    const confirmed = confirm(`Are you sure you want to delete this expense?\n\nTitle: ${found.title}\nAmount: ${currency(found.amount)}\nDate: ${formatDate(found.date)}`);
    if (confirmed) {
      const updated = expenses.filter(e => String(e.id) !== String(id));
      syncLocal(updated);
      showToast(`Expense "${found.title}" deleted.`, 'danger');

      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase expense delete fallback:', err);
      }
    }
  };

  // ── CHECKOUT MODAL EVENTS ────────────────────────────────────────────────
  const checkoutModalEl = document.getElementById('checkoutModal');
  if (checkoutModalEl) {
    const coCloseBtn    = document.getElementById('closeCheckoutBtn');
    const coCancelBtn   = document.getElementById('cancelCheckoutBtn');
    const coOverlay     = document.getElementById('checkoutModalOverlay');
    if (coCloseBtn)  coCloseBtn.addEventListener('click', closeCheckoutModal);
    if (coCancelBtn) coCancelBtn.addEventListener('click', closeCheckoutModal);
    if (coOverlay)   coOverlay.addEventListener('click', closeCheckoutModal);

    const coMinusBtn    = document.getElementById('coQtyMinus');
    const coPlusBtn     = document.getElementById('coQtyPlus');
    const coQtyInp      = document.getElementById('coQtyInput');
    const coDiscInp     = document.getElementById('coDiscountInput');
    const coChargeInp   = document.getElementById('coChargeInput');
    const coPartialInp  = document.getElementById('coPartialInput');
    const coApplyDisc   = document.getElementById('btnApplyDiscount');
    const coApplyCharge = document.getElementById('btnApplyCharge');
    const coApplyPartial = document.getElementById('btnApplyPartial');
    const coPayCash     = document.getElementById('payModeCash');
    const coPayCredit   = document.getElementById('payModeCredit');
    const coPayPartial  = document.getElementById('payModePartial');
    const coConfirmBtn  = document.getElementById('confirmCheckoutBtn');

    if (coPayCash)    coPayCash.addEventListener('click', () => setPayMode('cash'));
    if (coPayCredit)  coPayCredit.addEventListener('click', () => setPayMode('credit'));
    if (coPayPartial) coPayPartial.addEventListener('click', () => setPayMode('partial'));
    if (coApplyDisc)    coApplyDisc.addEventListener('click', () => { updateCheckoutSummary(); showToast('Discount applied to summary'); });
    if (coApplyCharge)  coApplyCharge.addEventListener('click', () => { updateCheckoutSummary(); showToast('Charge added to summary'); });
    if (coApplyPartial) coApplyPartial.addEventListener('click', () => { updateCheckoutSummary(); showToast('Partial payment applied to summary'); });

    if (coMinusBtn) {
      coMinusBtn.addEventListener('click', () => {
        const val = Math.max(1, parseInt(coQtyInp.value) - 1);
        coQtyInp.value = val;
        coMinusBtn.disabled = val <= 1;
        if (coPlusBtn) coPlusBtn.disabled = _checkoutItem && val >= Number(_checkoutItem.stocks);
        updateCheckoutSummary();
      });
    }
    if (coPlusBtn) {
      coPlusBtn.addEventListener('click', () => {
        const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
        const val = Math.min(max, parseInt(coQtyInp.value) + 1);
        coQtyInp.value = val;
        if (coMinusBtn) coMinusBtn.disabled = val <= 1;
        coPlusBtn.disabled = val >= max;
        updateCheckoutSummary();
      });
    }
    if (coQtyInp) {
      coQtyInp.addEventListener('input', () => {
        const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
        let val = parseInt(coQtyInp.value) || 1;
        val = Math.max(1, Math.min(val, max));
        coQtyInp.value = val;
        if (coMinusBtn) coMinusBtn.disabled = val <= 1;
        if (coPlusBtn)  coPlusBtn.disabled  = val >= max;
        updateCheckoutSummary();
      });
    }
    if (coDiscInp)    coDiscInp.addEventListener('input', updateCheckoutSummary);
    if (coChargeInp)  coChargeInp.addEventListener('input', updateCheckoutSummary);
    if (coPartialInp) coPartialInp.addEventListener('input', updateCheckoutSummary);

    if (coConfirmBtn) {
      let _isCheckingOut = false;
      coConfirmBtn.addEventListener('click', async () => {
        if (!_checkoutItem || _isCheckingOut) return;
        _isCheckingOut = true;
        setTimeout(() => { _isCheckingOut = false; }, 800);
        const qty       = parseInt(coQtyInp.value) || 1;
        const price     = Number(_checkoutItem.price) || 0;
        const subtotal  = qty * price;
        const isCredit  = _payMode === 'credit';
        const isPartial = _payMode === 'partial';
        const paymentStatus = (isCredit || isPartial) ? 'unpaid' : 'paid';
        let discountAmt = 0, chargeAmt = 0, partialAmt = 0, total = subtotal;
        if (isCredit) {
          chargeAmt = Math.max(0, parseFloat(coChargeInp ? coChargeInp.value : 0) || 0);
          total = subtotal + chargeAmt;
        } else if (isPartial) {
          const rawPartial = Math.max(0, parseFloat(coPartialInp ? coPartialInp.value : 0) || 0);
          partialAmt = Math.min(rawPartial, subtotal);
          total = Math.max(0, subtotal - partialAmt);
        } else {
          const rawDisc = Math.max(0, parseFloat(coDiscInp ? coDiscInp.value : 0) || 0);
          discountAmt = Math.min(rawDisc, subtotal);
          total = Math.max(0, subtotal - discountAmt);
        }
        const currentStock = Number(_checkoutItem.stocks) || 0;
        if (qty > currentStock) {
          showToast(`Cannot checkout ${qty} units. Only ${currentStock} in stock.`, 'danger');
          return;
        }

        // 1. Instant local stock deduction
        let allStocks = [];
        try { allStocks = JSON.parse(localStorage.getItem('inv_stocks_data') || '[]'); } catch(e) {}
        const idx = allStocks.findIndex(s => String(s.id) === String(_checkoutItem.id));
        if (idx !== -1) {
          allStocks[idx].stocks = Math.max(0, Number(allStocks[idx].stocks) - qty);
          allStocks[idx].updatedAt = new Date().toISOString();
          localStorage.setItem('inv_stocks_data', JSON.stringify(allStocks));
        }

        // 2. Instant local transaction log
        const soldToVal = (document.getElementById('coSoldToInput')?.value || '').trim();
        const customerNote = soldToVal ? ` | Sold to: ${soldToVal}` : '';
        const notes = (isCredit
          ? (chargeAmt > 0 ? `Credit Sale (Charge: ₱${chargeAmt.toFixed(2)})` : 'Credit Sale')
          : isPartial
          ? `Partial Sale (Paid: ₱${partialAmt.toFixed(2)}, Remaining Balance: ₱${total.toFixed(2)})`
          : (discountAmt > 0 ? `Cash Sale (Discount: ₱${discountAmt.toFixed(2)})` : 'Cash Sale')) + customerNote;

        const localTxnId = Date.now();
        let txns = [];
        try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch(e) {}
        txns.unshift({
          id: localTxnId,
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
          partial: partialAmt,
          total,
          type: 'sale',
          paymentStatus,
          payMode: _payMode,
          notes
        });
        localStorage.setItem('inv_transactions', JSON.stringify(txns));

        // 3. Instant UI feedback & Modal close (0ms delay)
        const itemName = _checkoutItem.name;
        const checkoutItemId = _checkoutItem.id;
        const checkoutItemBatch = _checkoutItem.batch || '';
        const modeLabel = isCredit ? 'Credit' : isPartial ? 'Partial' : 'Cash';

        closeCheckoutModal();
        renderSidebarStocks();
        showToast(`Checkout done! ${itemName} ×${qty} — ${currencyFmt(total)} (${modeLabel})`);

        // 4. Non-blocking background sync to Supabase
        (async () => {
          try {
            const isStkLocalId = String(checkoutItemId).startsWith('stk_');
            const txnPromise = supabase
              .from('transactions')
              .insert([{ type: 'sale', payment_status: paymentStatus, subtotal, discount: discountAmt, total, notes }])
              .select()
              .single();

            const stockPromise = (!isStkLocalId && idx !== -1)
              ? supabase.from('stock_items').update({ quantity: allStocks[idx].stocks }).eq('id', checkoutItemId)
              : Promise.resolve();

            const [{ data: txn, error: txnErr }] = await Promise.all([txnPromise, stockPromise]);

            if (txn && !txnErr) {
              // Update local transaction with remote Supabase ID & ref to prevent duplicate inputs
              try {
                let curTxns = JSON.parse(localStorage.getItem('inv_transactions') || '[]');
                const tIdx = curTxns.findIndex(t => String(t.id) === String(localTxnId));
                if (tIdx !== -1) {
                  curTxns[tIdx].supabaseId = txn.id;
                  curTxns[tIdx].ref = txn.reference_no;
                  localStorage.setItem('inv_transactions', JSON.stringify(curTxns));
                }
              } catch(e) {}

              await supabase.from('transaction_items').insert([{
                transaction_id: txn.id,
                stock_item_id: isStkLocalId ? null : checkoutItemId,
                product_name: itemName,
                batch: checkoutItemBatch,
                unit_price: price,
                quantity: qty,
                item_discount: discountAmt
              }]);
            }
          } catch (err) {
            console.warn('Supabase checkout background sync:', err);
          }
        })();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModalEl.classList.contains('active')) closeCheckoutModal();
    });
  }

  // ── INITIAL LOAD ────────────────────────────────────────────────────────
  await loadExpenses();

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExpenses);
} else {
  initExpenses();
}
