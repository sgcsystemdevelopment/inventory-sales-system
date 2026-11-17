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
  if (topAddExpenseBtn) topAddExpenseBtn.addEventListener('click', () => openExpenseModal());
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

  // ── INITIAL LOAD ────────────────────────────────────────────────────────
  await loadExpenses();

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExpenses);
} else {
  initExpenses();
}
