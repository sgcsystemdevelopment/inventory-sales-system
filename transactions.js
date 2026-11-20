/**
 * Transactions History — Inventory & Sales System
 * Unified read-only ledger from Supabase: transactions + expenses
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';
import { renderGlobalSidebarStocks, setupCheckoutModalEvents } from './checkoutManager.js';

const initTransactions = async () => {

  // ── ELEMENT REFS ─────────────────────────────────────────────────────────
  const themeToggleBtn  = document.getElementById('themeToggleBtn');
  const themeIcon       = document.getElementById('themeIcon');
  const sidebarEl       = document.getElementById('sidebar');
  const menuBtn         = document.getElementById('menuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay  = document.getElementById('sidebarOverlay');
  const sidebarLogo     = document.getElementById('sidebarLogo');
  const userAvatar      = document.getElementById('userAvatar');

  const statTotalTxn    = document.getElementById('statTotalTxn');
  const statRevenue     = document.getElementById('statRevenue');
  const statExpenses    = document.getElementById('statExpenses');
  const statNet         = document.getElementById('statNet');

  const txnTableBody    = document.getElementById('txnTableBody');
  const txnTableInfo    = document.getElementById('txnTableInfo');
  const txnPageNum      = document.getElementById('txnPageNum');
  const prevTxnPage     = document.getElementById('prevTxnPage');
  const nextTxnPage     = document.getElementById('nextTxnPage');
  const txnSearch       = document.getElementById('txnSearch');
  const txnDateFrom     = document.getElementById('txnDateFrom');
  const txnDateTo       = document.getElementById('txnDateTo');
  const txnTypeFilter   = document.getElementById('txnTypeFilter');
  const btnExportCsv    = document.getElementById('btnExportCsv');
  const btnExportPdf    = document.getElementById('btnExportPdf');

  const txnDetailModal  = document.getElementById('txnDetailModal');
  const txnDetailOverlay= document.getElementById('txnDetailOverlay');
  const closeTxnDetail  = document.getElementById('closeTxnDetailBtn');
  const txnDetailTitle  = document.getElementById('txnDetailTitle');
  const txnDetailSubtitle = document.getElementById('txnDetailSubtitle');
  const txnDetailBody   = document.getElementById('txnDetailBody');

  // Edit Transaction Modal Elements
  const editTxnModal       = document.getElementById('editTxnModal');
  const editTxnModalOverlay= document.getElementById('editTxnModalOverlay');
  const closeEditTxnModalBtn = document.getElementById('closeEditTxnModalBtn');
  const cancelEditTxnBtn   = document.getElementById('cancelEditTxnBtn');
  const editTxnForm        = document.getElementById('editTxnForm');
  const editTxnModalTitle  = document.getElementById('editTxnModalTitle');
  const editTxnModalSubtitle = document.getElementById('editTxnModalSubtitle');
  const editTxnId          = document.getElementById('editTxnId');
  const editTxnType        = document.getElementById('editTxnType');
  const editTxnItemId      = document.getElementById('editTxnItemId');
  const editTxnStockId     = document.getElementById('editTxnStockId');
  const editTxnOldQty      = document.getElementById('editTxnOldQty');
  const editTxnRef         = document.getElementById('editTxnRef');
  const editTxnDate        = document.getElementById('editTxnDate');
  const editTxnProductGroup= document.getElementById('editTxnProductGroup');
  const editTxnProductName = document.getElementById('editTxnProductName');
  const editTxnProductLabel= document.getElementById('editTxnProductLabel');
  const editTxnProductIcon = document.getElementById('editTxnProductIcon');
  const editTxnQtyGroup    = document.getElementById('editTxnQtyGroup');
  const editTxnQty         = document.getElementById('editTxnQty');
  const editTxnPriceGroup  = document.getElementById('editTxnPriceGroup');
  const editTxnUnitPrice   = document.getElementById('editTxnUnitPrice');
  const editTxnDiscountGroup = document.getElementById('editTxnDiscountGroup');
  const editTxnDiscount    = document.getElementById('editTxnDiscount');
  const editTxnTotalGroup  = document.getElementById('editTxnTotalGroup');
  const editTxnTotal       = document.getElementById('editTxnTotal');
  const editTxnStatus      = document.getElementById('editTxnStatus');
  const editTxnSoldToGroup = document.getElementById('editTxnSoldToGroup');
  const editTxnCustomer    = document.getElementById('editTxnCustomer');
  const editTxnNotes       = document.getElementById('editTxnNotes');
  const saveEditTxnBtn     = document.getElementById('saveEditTxnBtn');

  const toastNotice     = document.getElementById('toastNotice');
  const toastIcon       = document.getElementById('toastIcon');
  const toastMsg        = document.getElementById('toastMsg');

  // ── THEME ─────────────────────────────────────────────────────────────────
  const initTheme = () => {
    const saved = localStorage.getItem('inv_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(saved);
  };
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('inv_theme', theme);
    if (themeIcon) themeIcon.className = theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    if (sidebarLogo) sidebarLogo.style.filter = 'brightness(0) invert(1)';
  };
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }
  initTheme();

  // ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────
  const closeSidebar = () => {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };
  if (menuBtn) menuBtn.addEventListener('click', () => {
    sidebarEl.classList.add('open');
    sidebarOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
  if (sidebarOverlay)  sidebarOverlay.addEventListener('click', closeSidebar);

  // ── USER SESSION ──────────────────────────────────────────────────────────
  const sessionData = sessionStorage.getItem('inv_current_user');
  if (sessionData && userAvatar) {
    try {
      const user = JSON.parse(sessionData);
      if (user.username) userAvatar.title = `${user.username} (${user.roleName || user.role})`;
    } catch (e) {}
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // ── SIDEBAR STOCKS & CHECKOUT MODAL ───────────────────────────────────────
  renderGlobalSidebarStocks('sidebarStocksList');
  setupCheckoutModalEvents(async () => {
    await loadAllTransactions();
  });

  // ── TOAST ─────────────────────────────────────────────────────────────────
  let toastTimer;
  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    toastNotice.className = `toast-notice show ${type}`;
    toastNotice.style.display = 'flex';
    toastIcon.className = type === 'danger' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check';
    toastTimer = setTimeout(() => {
      toastNotice.classList.remove('show');
      setTimeout(() => { toastNotice.style.display = 'none'; }, 400);
    }, 3200);
  };

  // ── CURRENCY & DATE ───────────────────────────────────────────────────────
  const currency = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── DATA ──────────────────────────────────────────────────────────────────
  let allRecords = [];

  async function loadAllTransactions() {
    let txns = [], expenses = [];

    try {
      const { data } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });
      if (Array.isArray(data)) txns = data;
    } catch(e) { console.warn('Txn fetch fallback:', e); }

    try {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (Array.isArray(data)) expenses = data;
    } catch(e) { console.warn('Expense fetch fallback:', e); }

    const mappedTxns = txns.map(t => {
      const items = Array.isArray(t.transaction_items) ? t.transaction_items : [];
      const itemDesc = items.map(it => `${it.product_name || 'Item'} ×${it.quantity || 1}`).join(', ');
      return {
        id: t.id,
        type: 'sale',
        ref: t.reference_no || `TXN-${String(t.id).slice(0, 6).toUpperCase()}`,
        description: itemDesc || t.notes || 'Counter Sale',
        amount: Number(t.total) || 0,
        date: t.created_at ? t.created_at.slice(0, 10) : '',
        status: t.payment_status || 'paid',
        items: items,
        _raw: t
      };
    });

    const mappedExp = expenses.map(e => ({
      id: e.id,
      type: 'expense',
      ref: `EXP-${String(e.id).slice(0, 6).toUpperCase()}`,
      description: e.title || e.category || 'Expense',
      amount: Number(e.amount) || 0,
      date: e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : ''),
      status: 'recorded',
      items: [],
      _raw: e
    }));

    // Merge local fallback if Supabase empty
    if (!txns.length) {
      let localTxns = [];
      try { localTxns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch(e) {}
      localTxns.forEach(t => mappedTxns.push({
        id: t.id,
        type: 'sale',
        ref: `TXN-${String(t.id).slice(-5)}`,
        description: `${t.productName || ''} ×${t.qty || ''}`.trim() || 'Counter Sale',
        amount: Number(t.total) || 0,
        date: t.date ? t.date.slice(0, 10) : '',
        status: t.paymentStatus || 'paid',
        items: [{
          stock_item_id: t.productId,
          product_name: t.productName,
          quantity: t.qty,
          unit_price: t.price,
          item_discount: t.discount
        }],
        _raw: t
      }));
    }
    if (!expenses.length) {
      let localExp = [];
      try { localExp = JSON.parse(localStorage.getItem('inv_expenses_data') || '[]'); } catch(e) {}
      localExp.forEach(e => mappedExp.push({
        id: e.id,
        type: 'expense',
        ref: `EXP-${String(e.id).slice(-5)}`,
        description: e.title || e.category || 'Expense',
        amount: Number(e.amount) || 0,
        date: e.date || '',
        status: 'recorded',
        items: [],
        _raw: e
      }));
    }

    allRecords = [...mappedTxns, ...mappedExp].sort((a, b) => b.date.localeCompare(a.date));
    updateSummaryCards();
    currentPage = 1;
    renderTable();
  }

  function updateSummaryCards() {
    const salesTotal   = allRecords.filter(r => r.type === 'sale').reduce((s, r) => s + r.amount, 0);
    const expTotal     = allRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const net          = salesTotal - expTotal;
    if (statTotalTxn) statTotalTxn.textContent = allRecords.length.toLocaleString();
    if (statRevenue)  statRevenue.textContent  = currency(salesTotal);
    if (statExpenses) statExpenses.textContent = currency(expTotal);
    if (statNet) {
      statNet.textContent = currency(net);
      statNet.style.color = net >= 0 ? '#10b981' : '#ef4444';
    }
  }

  // ── FILTER ────────────────────────────────────────────────────────────────
  let currentPage = 1;
  const perPage = 15;

  function getFiltered() {
    const q    = txnSearch    ? txnSearch.value.trim().toLowerCase()    : '';
    const from = txnDateFrom  ? txnDateFrom.value  : '';
    const to   = txnDateTo    ? txnDateTo.value    : '';
    const type = txnTypeFilter? txnTypeFilter.value : 'all';

    return allRecords.filter(r => {
      if (type !== 'all' && r.type !== type) return false;
      if (from && r.date < from) return false;
      if (to   && r.date > to)   return false;
      if (q) {
        const hay = `${r.ref} ${r.description} ${r.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ── RENDER TABLE ──────────────────────────────────────────────────────────
  const typeBadgeMap = {
    sale:    { cls: 'sale',    icon: 'fa-shopping-cart',       label: 'Sale' },
    expense: { cls: 'expense', icon: 'fa-file-invoice-dollar', label: 'Expense' },
  };

  function renderTable() {
    const filtered = getFiltered();
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);

    if (total === 0) {
      txnTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions found.</p></div>
      </td></tr>`;
      txnTableInfo.textContent = 'Showing 0 records';
      txnPageNum.textContent = '1 / 1';
      prevTxnPage.disabled = true;
      nextTxnPage.disabled = true;
      return;
    }

    txnTableBody.innerHTML = paged.map((r, i) => {
      const tb = typeBadgeMap[r.type] || { cls: 'sale', icon: 'fa-circle', label: 'Other' };
      const statusClass = r.status === 'paid' ? 'paid' : r.status === 'unpaid' ? 'unpaid' : r.status === 'recorded' ? 'discount' : 'paid';
      return `<tr class="txn-row" data-ref="${r.ref}">
        <td><span class="type-badge ${tb.cls}"><i class="fa-solid ${tb.icon}"></i>${tb.label}</span></td>
        <td style="font-weight:700;color:var(--accent);">${r.ref}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.description || '—'}</td>
        <td>${formatDate(r.date)}</td>
        <td style="text-align:right;font-weight:700;">${currency(r.amount)}</td>
        <td style="text-align:center;">
          <div class="action-btns" onclick="event.stopPropagation()">
            <button type="button" class="btn-icon-action edit btn-txn-edit" data-idx="${start + i}" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" class="btn-icon-action delete btn-txn-delete" data-idx="${start + i}" title="Delete">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
        <td><span class="badge ${statusClass}" style="font-size:0.72rem;">
          <i class="fa-solid fa-circle" style="font-size:0.4rem;"></i>
          ${(r.status || 'paid').charAt(0).toUpperCase() + (r.status || 'paid').slice(1)}
        </span></td>
      </tr>`;
    }).join('');

    txnTableInfo.textContent = `Showing ${start + 1}–${Math.min(start + perPage, total)} of ${total} records`;
    txnPageNum.textContent = `${currentPage} / ${totalPages}`;
    prevTxnPage.disabled = currentPage === 1;
    nextTxnPage.disabled = currentPage >= totalPages;

    // Row click → detail modal
    txnTableBody.querySelectorAll('.txn-row').forEach((row, i) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon-action')) return;
        openDetailModal(paged[i]);
      });
    });

    // Action button listeners
    txnTableBody.querySelectorAll('.btn-txn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        if (filtered[idx]) openEditModal(filtered[idx]);
      });
    });

    txnTableBody.querySelectorAll('.btn-txn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        if (filtered[idx]) handleDeleteTransaction(filtered[idx]);
      });
    });
  }

  if (prevTxnPage) prevTxnPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  if (nextTxnPage) nextTxnPage.addEventListener('click', () => { currentPage++; renderTable(); });
  if (txnSearch)       txnSearch.addEventListener('input', () => { currentPage = 1; renderTable(); });
  if (txnDateFrom)     txnDateFrom.addEventListener('change', () => { currentPage = 1; renderTable(); });
  if (txnDateTo)       txnDateTo.addEventListener('change', () => { currentPage = 1; renderTable(); });
  if (txnTypeFilter)   txnTypeFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });

  // ── DETAIL MODAL ──────────────────────────────────────────────────────────
  function openDetailModal(record) {
    if (!txnDetailModal) return;
    txnDetailTitle.textContent = record.type === 'expense' ? 'Expense Detail' : 'Sale Detail';
    txnDetailSubtitle.textContent = `Reference: ${record.ref}`;

    const rows = [
      ['Type',        record.type === 'expense' ? 'Expense' : 'Sale'],
      ['Reference',   record.ref],
      ['Description', record.description || '—'],
      ['Date',        formatDate(record.date)],
      ['Amount',      currency(record.amount)],
      ['Status',      (record.status || '—').charAt(0).toUpperCase() + (record.status || '').slice(1)],
    ];
    if (record.type === 'sale' && record._raw) {
      if (record._raw.discount > 0) rows.push(['Discount', currency(record._raw.discount)]);
      if (record._raw.subtotal)     rows.push(['Subtotal', currency(record._raw.subtotal)]);
      if (record._raw.notes)        rows.push(['Notes',    record._raw.notes]);
    }
    if (record.type === 'expense' && record._raw) {
      if (record._raw.category) rows.push(['Category', record._raw.category]);
    }

    txnDetailBody.innerHTML = rows.map(([label, val]) =>
      `<div class="txn-detail-row"><span class="txn-detail-label">${label}</span><span class="txn-detail-value">${val}</span></div>`
    ).join('');

    txnDetailModal.classList.add('active');
  }

  function closeDetailModal() {
    if (!txnDetailModal) return;
    txnDetailModal.classList.remove('active');
  }

  if (closeTxnDetail)   closeTxnDetail.addEventListener('click', closeDetailModal);
  if (txnDetailOverlay) txnDetailOverlay.addEventListener('click', closeDetailModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (txnDetailModal && txnDetailModal.classList.contains('active')) closeDetailModal();
      if (editTxnModal && editTxnModal.classList.contains('active')) closeEditModal();
    }
  });

  // ── EDIT & DELETE TRANSACTION ─────────────────────────────────────────────
  function openEditModal(record) {
    if (!editTxnModal) return;
    editTxnId.value = record.id;
    editTxnType.value = record.type;
    editTxnRef.value = record.ref || '';
    editTxnDate.value = record.date || new Date().toISOString().slice(0, 10);
    editTxnStatus.value = record.status || 'paid';

    if (record.type === 'sale') {
      editTxnModalTitle.textContent = 'Edit Checkout Sale';
      editTxnModalSubtitle.textContent = 'Update checkout details or correct mis-input';
      editTxnProductLabel.textContent = 'Product Name *';
      editTxnProductIcon.className = 'fa-solid fa-box field-icon';
      if (editTxnQtyGroup) editTxnQtyGroup.style.display = 'block';
      if (editTxnPriceGroup) editTxnPriceGroup.style.display = 'block';
      if (editTxnDiscountGroup) editTxnDiscountGroup.style.display = 'block';
      if (editTxnSoldToGroup) editTxnSoldToGroup.style.display = 'block';

      const items = Array.isArray(record.items) && record.items.length > 0
        ? record.items
        : (record._raw?.transaction_items || []);
      const item = items[0] || {};

      editTxnItemId.value = item.id || '';
      editTxnStockId.value = item.stock_item_id || '';
      const itemQty = Number(item.quantity) || 1;
      editTxnOldQty.value = itemQty;
      editTxnQty.value = itemQty;
      editTxnProductName.value = item.product_name || record.description || '';
      const unitP = item.unit_price != null ? Number(item.unit_price) : (Number(record.amount) / itemQty);
      editTxnUnitPrice.value = isNaN(unitP) ? '0.00' : unitP.toFixed(2);
      editTxnDiscount.value = Number(item.item_discount || record._raw?.discount || 0).toFixed(2);
      editTxnTotal.value = Number(record.amount || 0).toFixed(2);

      let cust = record._raw?.customer || record._raw?.soldTo || '';
      const rawNotes = record._raw?.notes || '';
      if (!cust && rawNotes) {
        const m = rawNotes.match(/Sold to:\s*([^|]+)/i);
        if (m) cust = m[1].trim();
      }
      editTxnCustomer.value = cust;
      editTxnNotes.value = rawNotes.replace(/\|\s*Sold to:.*$/i, '').trim();
    } else {
      editTxnModalTitle.textContent = 'Edit Expense';
      editTxnModalSubtitle.textContent = 'Update expense details';
      editTxnProductLabel.textContent = 'Expense Title / Category *';
      editTxnProductIcon.className = 'fa-solid fa-file-invoice-dollar field-icon';
      if (editTxnQtyGroup) editTxnQtyGroup.style.display = 'none';
      if (editTxnPriceGroup) editTxnPriceGroup.style.display = 'none';
      if (editTxnDiscountGroup) editTxnDiscountGroup.style.display = 'none';
      if (editTxnSoldToGroup) editTxnSoldToGroup.style.display = 'none';

      editTxnItemId.value = '';
      editTxnStockId.value = '';
      editTxnOldQty.value = '1';
      editTxnProductName.value = record._raw?.title || record.description || '';
      editTxnTotal.value = Number(record.amount || 0).toFixed(2);
      editTxnCustomer.value = '';
      editTxnNotes.value = record._raw?.description || '';
    }

    editTxnModal.classList.add('active');
  }

  function closeEditModal() {
    if (!editTxnModal) return;
    editTxnModal.classList.remove('active');
  }

  if (closeEditTxnModalBtn) closeEditTxnModalBtn.addEventListener('click', closeEditModal);
  if (cancelEditTxnBtn)     cancelEditTxnBtn.addEventListener('click', closeEditModal);
  if (editTxnModalOverlay)  editTxnModalOverlay.addEventListener('click', closeEditModal);

  const recalcSaleTotal = () => {
    if (editTxnType.value !== 'sale') return;
    const q = parseFloat(editTxnQty.value) || 0;
    const p = parseFloat(editTxnUnitPrice.value) || 0;
    const d = parseFloat(editTxnDiscount.value) || 0;
    const sub = q * p;
    const tot = Math.max(0, sub - d);
    editTxnTotal.value = tot.toFixed(2);
  };
  if (editTxnQty) editTxnQty.addEventListener('input', recalcSaleTotal);
  if (editTxnUnitPrice) editTxnUnitPrice.addEventListener('input', recalcSaleTotal);
  if (editTxnDiscount) editTxnDiscount.addEventListener('input', recalcSaleTotal);

  if (editTxnForm) {
    editTxnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editTxnId.value;
      const type = editTxnType.value;
      const dateVal = editTxnDate.value;
      const prodName = editTxnProductName.value.trim();
      const totalVal = parseFloat(editTxnTotal.value) || 0;
      const statusVal = editTxnStatus.value;
      const notesVal = editTxnNotes.value.trim();

      if (type === 'sale') {
        const newQty = parseInt(editTxnQty.value) || 1;
        const oldQty = parseInt(editTxnOldQty.value) || 1;
        const unitPrice = parseFloat(editTxnUnitPrice.value) || 0;
        const discountVal = parseFloat(editTxnDiscount.value) || 0;
        const customerVal = editTxnCustomer.value.trim();
        const itemId = editTxnItemId.value;
        const stockId = editTxnStockId.value;
        const subtotalVal = newQty * unitPrice;
        const qtyDiff = newQty - oldQty; // e.g. 5 -> 2 = -3 (return 3 to stock)

        const customerSuffix = customerVal ? ` | Sold to: ${customerVal}` : '';
        const finalNotes = (notesVal ? notesVal : 'Counter Sale') + customerSuffix;

        // 1. Stock Adjustment in Supabase & Local
        if (qtyDiff !== 0) {
          if (stockId) {
            try {
              const { data: stItem } = await supabase.from('stock_items').select('quantity').eq('id', stockId).single();
              if (stItem) {
                const updatedQuantity = Math.max(0, (Number(stItem.quantity) || 0) - qtyDiff);
                await supabase.from('stock_items').update({ quantity: updatedQuantity }).eq('id', stockId);
              }
            } catch(err) { console.warn('Supabase stock update error:', err); }
          }
          try {
            const rawStocks = localStorage.getItem('inv_stocks_data');
            if (rawStocks) {
              let sArr = JSON.parse(rawStocks);
              const sIdx = sArr.findIndex(s => (stockId && String(s.id) === String(stockId)) || (prodName && s.name === prodName));
              if (sIdx !== -1) {
                sArr[sIdx].stocks = Math.max(0, (Number(sArr[sIdx].stocks) || 0) - qtyDiff);
                localStorage.setItem('inv_stocks_data', JSON.stringify(sArr));
              }
            }
          } catch(err) {}
        }

        // 2. Update Supabase transactions & transaction_items
        try {
          await supabase.from('transactions').update({
            subtotal: subtotalVal,
            discount: discountVal,
            total: totalVal,
            payment_status: statusVal,
            notes: finalNotes
          }).eq('id', id);

          if (itemId) {
            await supabase.from('transaction_items').update({
              product_name: prodName,
              quantity: newQty,
              unit_price: unitPrice,
              item_discount: discountVal
            }).eq('id', itemId);
          }
        } catch(err) { console.warn('Supabase transaction update error:', err); }

        // 3. Update localStorage inv_transactions
        try {
          const rawTxns = localStorage.getItem('inv_transactions');
          if (rawTxns) {
            let tArr = JSON.parse(rawTxns);
            const tIdx = tArr.findIndex(t => String(t.id) === String(id));
            if (tIdx !== -1) {
              tArr[tIdx].productName = prodName;
              tArr[tIdx].qty = newQty;
              tArr[tIdx].price = unitPrice;
              tArr[tIdx].subtotal = subtotalVal;
              tArr[tIdx].discount = discountVal;
              tArr[tIdx].total = totalVal;
              tArr[tIdx].paymentStatus = statusVal;
              tArr[tIdx].customer = customerVal;
              tArr[tIdx].soldTo = customerVal;
              tArr[tIdx].date = dateVal;
              localStorage.setItem('inv_transactions', JSON.stringify(tArr));
            }
          }
        } catch(err) {}

        renderGlobalSidebarStocks('sidebarStocksList');
        showToast('Checkout transaction updated successfully!', 'success');
      } else {
        // Expense edit
        try {
          await supabase.from('expenses').update({
            title: prodName,
            amount: totalVal,
            expense_date: dateVal,
            description: notesVal
          }).eq('id', id);
        } catch(err) { console.warn('Supabase expense update error:', err); }

        try {
          const rawExp = localStorage.getItem('inv_expenses_data');
          if (rawExp) {
            let eArr = JSON.parse(rawExp);
            const eIdx = eArr.findIndex(e => String(e.id) === String(id));
            if (eIdx !== -1) {
              eArr[eIdx].title = prodName;
              eArr[eIdx].amount = totalVal;
              eArr[eIdx].date = dateVal;
              eArr[eIdx].description = notesVal;
              localStorage.setItem('inv_expenses_data', JSON.stringify(eArr));
            }
          }
        } catch(err) {}

        showToast('Expense updated successfully!', 'success');
      }

      closeEditModal();
      await loadAllTransactions();
    });
  }

  async function handleDeleteTransaction(record) {
    const isSale = record.type === 'sale';
    const confirmMsg = isSale
      ? `Are you sure you want to delete this checkout transaction?\n\nReference: ${record.ref}\nDescription: ${record.description}\nAmount: ${currency(record.amount)}\n\n⚠️ Deleting this will restore the checked-out stock back to inventory.`
      : `Are you sure you want to delete this expense record?\n\nReference: ${record.ref}\nDescription: ${record.description}\nAmount: ${currency(record.amount)}`;

    if (!window.confirm(confirmMsg)) return;

    if (isSale) {
      // 1. Restore stock in Supabase & Local
      const items = Array.isArray(record.items) && record.items.length > 0
        ? record.items
        : (record._raw?.transaction_items || []);

      for (const it of items) {
        const qty = Number(it.quantity) || 0;
        const stockId = it.stock_item_id;
        if (qty > 0 && stockId) {
          try {
            const { data: stData } = await supabase
              .from('stock_items')
              .select('quantity')
              .eq('id', stockId)
              .single();
            if (stData) {
              const restoredQty = (Number(stData.quantity) || 0) + qty;
              await supabase.from('stock_items').update({ quantity: restoredQty }).eq('id', stockId);
            }
          } catch (e) {
            console.warn('Error restoring Supabase stock:', e);
          }
        }
      }

      // Restore in localStorage inv_stocks_data
      try {
        const rawStocks = localStorage.getItem('inv_stocks_data');
        if (rawStocks) {
          let stocksArr = JSON.parse(rawStocks);
          items.forEach(it => {
            const qty = Number(it.quantity) || 0;
            const stockId = it.stock_item_id;
            const pName = it.product_name;
            const sIdx = stocksArr.findIndex(s => (stockId && String(s.id) === String(stockId)) || (pName && s.name === pName));
            if (sIdx !== -1) {
              stocksArr[sIdx].stocks = (Number(stocksArr[sIdx].stocks) || 0) + qty;
            }
          });
          localStorage.setItem('inv_stocks_data', JSON.stringify(stocksArr));
        }
      } catch (e) {
        console.warn('Error restoring local stock:', e);
      }

      // 2. Delete from Supabase
      try {
        await supabase.from('transaction_items').delete().eq('transaction_id', record.id);
        const { error: delErr } = await supabase.from('transactions').delete().eq('id', record.id);
        if (delErr) console.warn('Supabase delete error:', delErr);
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }

      // 3. Delete from localStorage inv_transactions
      try {
        const rawTxns = localStorage.getItem('inv_transactions');
        if (rawTxns) {
          let txnsArr = JSON.parse(rawTxns);
          txnsArr = txnsArr.filter(t => String(t.id) !== String(record.id) && t.ref !== record.ref);
          localStorage.setItem('inv_transactions', JSON.stringify(txnsArr));
        }
      } catch (e) {}

      renderGlobalSidebarStocks('sidebarStocksList');
      showToast('Checkout deleted and stock restored!', 'success');
    } else {
      // Expense delete
      try {
        await supabase.from('expenses').delete().eq('id', record.id);
      } catch (e) {
        console.warn('Supabase delete expense error:', e);
      }

      try {
        const rawExp = localStorage.getItem('inv_expenses_data');
        if (rawExp) {
          let expArr = JSON.parse(rawExp);
          expArr = expArr.filter(e => String(e.id) !== String(record.id));
          localStorage.setItem('inv_expenses_data', JSON.stringify(expArr));
        }
      } catch (e) {}

      showToast('Expense record deleted!', 'success');
    }

    await loadAllTransactions();
  }

  // ── EXPORT CSV ────────────────────────────────────────────────────────────
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const filtered = getFiltered();
      const header = 'Type,Reference,Description,Date,Amount,Status';
      const rows = filtered.map(r =>
        `"${r.type}","${r.ref}","${(r.description || '').replace(/"/g,'""')}","${r.date}","${r.amount}","${r.status}"`
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully!');
    });
  }

  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      window.print();
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  await loadAllTransactions();

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTransactions);
} else {
  initTransactions();
}
