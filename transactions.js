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
        .select('*')
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

    const mappedTxns = txns.map(t => ({
      type: 'sale',
      ref: t.reference_no || `TXN-${String(t.id).slice(0, 6).toUpperCase()}`,
      description: t.notes || 'Counter Sale',
      amount: Number(t.total) || 0,
      date: t.created_at ? t.created_at.slice(0, 10) : '',
      status: t.payment_status || 'paid',
      _raw: t
    }));

    const mappedExp = expenses.map(e => ({
      type: 'expense',
      ref: `EXP-${String(e.id).slice(0, 6).toUpperCase()}`,
      description: e.title || e.category || 'Expense',
      amount: Number(e.amount) || 0,
      date: e.expense_date || (e.created_at ? e.created_at.slice(0, 10) : ''),
      status: 'recorded',
      _raw: e
    }));

    // Merge local fallback if Supabase empty
    if (!txns.length) {
      let localTxns = [];
      try { localTxns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch(e) {}
      localTxns.forEach(t => mappedTxns.push({
        type: 'sale',
        ref: `TXN-${String(t.id).slice(-5)}`,
        description: `${t.productName || ''} ×${t.qty || ''}`,
        amount: Number(t.total) || 0,
        date: t.date ? t.date.slice(0, 10) : '',
        status: t.paymentStatus || 'paid',
        _raw: t
      }));
    }
    if (!expenses.length) {
      let localExp = [];
      try { localExp = JSON.parse(localStorage.getItem('inv_expenses_data') || '[]'); } catch(e) {}
      localExp.forEach(e => mappedExp.push({
        type: 'expense',
        ref: `EXP-${String(e.id).slice(-5)}`,
        description: e.title || e.category || 'Expense',
        amount: Number(e.amount) || 0,
        date: e.date || '',
        status: 'recorded',
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
      txnTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No transactions found.</p></div>
      </td></tr>`;
      txnTableInfo.textContent = 'Showing 0 records';
      txnPageNum.textContent = '1 / 1';
      prevTxnPage.disabled = true;
      nextTxnPage.disabled = true;
      return;
    }

    txnTableBody.innerHTML = paged.map(r => {
      const tb = typeBadgeMap[r.type] || { cls: 'sale', icon: 'fa-circle', label: 'Other' };
      const statusClass = r.status === 'paid' ? 'paid' : r.status === 'unpaid' ? 'unpaid' : r.status === 'recorded' ? 'discount' : 'paid';
      return `<tr class="txn-row" data-ref="${r.ref}">
        <td><span class="type-badge ${tb.cls}"><i class="fa-solid ${tb.icon}"></i>${tb.label}</span></td>
        <td style="font-weight:700;color:var(--accent);">${r.ref}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.description || '—'}</td>
        <td>${formatDate(r.date)}</td>
        <td style="text-align:right;font-weight:700;">${currency(r.amount)}</td>
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
      row.addEventListener('click', () => openDetailModal(paged[i]));
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
    if (e.key === 'Escape' && txnDetailModal && txnDetailModal.classList.contains('active')) closeDetailModal();
  });

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
