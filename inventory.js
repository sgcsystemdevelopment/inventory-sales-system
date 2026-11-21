/**
 * Inventory & Stock Management Script — Simpal System
 * Manages: Stocks CRUD (Date, Batch, Name, Stocks, Price), Supabase integration,
 * Metrics, Filters, Search, Export, Modals, Dynamic Sidebar, and Checkout.
 */

import { supabase } from './supabaseClient.js';

const initInventory = async () => {

  // ── ELEMENT REFERENCES ───────────────────────────────────────────────────
  const themeToggleBtn       = document.getElementById('themeToggleBtn');
  const themeIcon            = document.getElementById('themeIcon');
  const sidebarEl            = document.getElementById('sidebar');
  const menuBtn              = document.getElementById('menuBtn');
  const sidebarCloseBtn      = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay       = document.getElementById('sidebarOverlay');
  const sidebarLogo          = document.getElementById('sidebarLogo');
  const userAvatar           = document.getElementById('userAvatar');
  const logoutBtn            = document.getElementById('logoutBtn');

  // Metric elements
  const statTotalItems       = document.getElementById('statTotalItems');
  const statTotalQty         = document.getElementById('statTotalQty');
  const statTotalValue       = document.getElementById('statTotalValue');
  const statLowStock         = document.getElementById('statLowStock');
  const sidebarStockCountBadge = document.getElementById('sidebarStockCountBadge');

  // Table & Controls
  const stocksTableBody      = document.getElementById('stocksTableBody');
  const stockSearch          = document.getElementById('stockSearch');
  const statusFilter         = document.getElementById('statusFilter');
  const exportCsvBtn         = document.getElementById('exportCsvBtn');
  const stockTableInfo       = document.getElementById('stockTableInfo');
  const stockPageNum         = document.getElementById('stockPageNum');
  const prevStockPage        = document.getElementById('prevStockPage');
  const nextStockPage        = document.getElementById('nextStockPage');

  // Trigger Buttons
  const tableInputStockBtn   = document.getElementById('tableInputStockBtn');
  const sidebarInputStocksBtn= document.getElementById('sidebarInputStocksBtn');

  // Input / Edit Stock Modal
  const stockModal           = document.getElementById('stockModal');
  const modalOverlay         = document.getElementById('modalOverlay');
  const closeModalBtn        = document.getElementById('closeModalBtn');
  const cancelModalBtn       = document.getElementById('cancelModalBtn');
  const stockForm            = document.getElementById('stockForm');
  const modalTitle           = document.getElementById('modalTitle');
  const modalSubtitle        = document.getElementById('modalSubtitle');
  const saveBtnText          = document.getElementById('saveBtnText');
  const editStockId          = document.getElementById('editStockId');
  const stockDate            = document.getElementById('stockDate');
  const stockBatch           = document.getElementById('stockBatch');
  const stockName            = document.getElementById('stockName');
  const stockQty             = document.getElementById('stockQty');
  const stockPrice           = document.getElementById('stockPrice');
  const previewTotalVal      = document.getElementById('previewTotalVal');
  const btnAutoBatch         = document.getElementById('btnAutoBatch');

  // Quick Restock Modal
  const quickRestockModal    = document.getElementById('quickRestockModal');
  const quickRestockOverlay  = document.getElementById('quickRestockOverlay');
  const closeRestockModalBtn = document.getElementById('closeRestockModalBtn');
  const cancelRestockBtn     = document.getElementById('cancelRestockBtn');
  const quickRestockForm     = document.getElementById('quickRestockForm');
  const restockStockId       = document.getElementById('restockStockId');
  const restockItemName      = document.getElementById('restockItemName');
  const addUnitsInput        = document.getElementById('addUnitsInput');

  // Toast Notice
  const toastNotice          = document.getElementById('toastNotice');
  const toastIcon            = document.getElementById('toastIcon');
  const toastMsg             = document.getElementById('toastMsg');

  // ── THEME INITIALIZATION ─────────────────────────────────────────────────
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

  // ── USER SESSION & LOGOUT ────────────────────────────────────────────────
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // ── SIDEBAR CONTROLS ─────────────────────────────────────────────────────
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

  // ── TOAST HELPER ─────────────────────────────────────────────────────────
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

  // ── CURRENCY & FORMATTING HELPERS ────────────────────────────────────────
  const currency = (val) =>
    '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNowDateTimeLocal = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // ── DATA PERSISTENCE & SUPABASE SYNC ─────────────────────────────────────
  const STORAGE_KEY = 'inv_stocks_data';

  let inMemoryStocks = [];

  const getLocalStocks = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const syncLocal = (stocks) => {
    inMemoryStocks = stocks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
    updateMetrics();
    renderTable();
    renderSidebarStocks();
  };

  // Load from Supabase with fallback to localStorage
  const loadStocks = async () => {
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
      console.warn('Supabase fetch bypassed, using local cached stocks:', err);
    }

    // Fallback if Supabase table is empty or offline
    const local = getLocalStocks();
    syncLocal(local);
  };

  const getStocks = () => inMemoryStocks.length ? inMemoryStocks : getLocalStocks();

  // ── GENERATE BATCH NUMBER ────────────────────────────────────────────────
  const generateBatchCode = () => {
    const stocks = getStocks();
    const currentYear = new Date().getFullYear();
    const batchNums = stocks
      .map(s => {
        const match = s.batch && s.batch.match(/BATCH-\d{4}-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const nextNum = batchNums.length ? Math.max(...batchNums) + 1 : stocks.length + 1;
    return `BATCH-${currentYear}-${String(nextNum).padStart(3, '0')}`;
  };

  if (btnAutoBatch) {
    btnAutoBatch.addEventListener('click', () => {
      stockBatch.value = generateBatchCode();
    });
  }

  // ── LIVE FORM VALUATION PREVIEW ──────────────────────────────────────────
  const updateValuationPreview = () => {
    const qty = parseFloat(stockQty.value) || 0;
    const prc = parseFloat(stockPrice.value) || 0;
    previewTotalVal.textContent = currency(qty * prc);
  };

  stockQty.addEventListener('input', updateValuationPreview);
  stockPrice.addEventListener('input', updateValuationPreview);

  // ── UPDATE METRICS CARDS ─────────────────────────────────────────────────
  const updateMetrics = () => {
    const stocks = getStocks();
    const totalItems = stocks.length;
    const totalQty = stocks.reduce((sum, s) => sum + (Number(s.stocks) || 0), 0);
    const totalVal = stocks.reduce((sum, s) => sum + ((Number(s.stocks) || 0) * (Number(s.price) || 0)), 0);
    const lowStockCount = stocks.filter(s => Number(s.stocks) <= 10).length;

    statTotalItems.textContent = totalItems.toLocaleString();
    statTotalQty.textContent = totalQty.toLocaleString();
    statTotalValue.textContent = currency(totalVal);
    statLowStock.textContent = lowStockCount.toLocaleString();

    if (sidebarStockCountBadge) {
      sidebarStockCountBadge.textContent = totalItems;
    }
  };

  // ── TABLE PAGINATION & FILTERING ─────────────────────────────────────────
  let currentPage = 1;
  const perPage = 10;

  const getFilteredStocks = () => {
    const stocks = getStocks();
    const query = stockSearch.value.trim().toLowerCase();
    const status = statusFilter.value;

    return stocks.filter(item => {
      const matchSearch = 
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.batch && item.batch.toLowerCase().includes(query));

      const qty = Number(item.stocks) || 0;
      let matchStatus = true;
      if (status === 'in-stock') matchStatus = qty > 10;
      else if (status === 'low-stock') matchStatus = qty > 0 && qty <= 10;
      else if (status === 'out-of-stock') matchStatus = qty === 0;

      return matchSearch && matchStatus;
    });
  };

  const renderTable = () => {
    const filtered = getFilteredStocks();
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    if (paginated.length === 0) {
      stocksTableBody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <i class="fa-solid fa-boxes-stacked"></i>
              <p>No inventory records found matching your filters. Click <strong>Input Stock</strong> to add new items.</p>
            </div>
          </td>
        </tr>`;
      stockTableInfo.textContent = 'Showing 0 of 0 records';
      stockPageNum.textContent = '1 / 1';
      prevStockPage.disabled = true;
      nextStockPage.disabled = true;
      return;
    }

    stocksTableBody.innerHTML = paginated.map((item, idx) => {
      const qty = Number(item.stocks) || 0;
      const prc = Number(item.price) || 0;
      const totalVal = qty * prc;

      let badgeClass = 'in-stock';
      let badgeLabel = 'In Stock';
      let badgeIcon = 'fa-circle-check';

      if (qty === 0) {
        badgeClass = 'out-of-stock';
        badgeLabel = 'Out of Stock';
        badgeIcon = 'fa-circle-xmark';
      } else if (qty <= 10) {
        badgeClass = 'low-stock';
        badgeLabel = 'Low Stock';
        badgeIcon = 'fa-triangle-exclamation';
      }

      return `
        <tr>
          <td style="font-weight:600; color:var(--text-muted);">${start + idx + 1}</td>
          <td>
            <div style="font-size:0.83rem; font-weight:500;">
              <i class="fa-regular fa-clock" style="margin-right:4px; font-size:0.75rem; color:var(--accent);"></i>
              ${formatTimestamp(item.date)}
            </div>
          </td>
          <td>
            <span class="batch-tag">${item.batch || '—'}</span>
          </td>
          <td>
            <span class="stock-item-name" title="${item.name}">${item.name}</span>
          </td>
          <td style="text-align:right;">
            <span class="stock-qty-cell ${qty <= 10 ? 'alert' : ''}">${qty.toLocaleString()}</span>
          </td>
          <td style="text-align:right; font-weight:600;">
            ${currency(prc)}
          </td>
          <td style="text-align:right; font-weight:700; color:var(--accent);">
            ${currency(totalVal)}
          </td>
          <td>
            <span class="stock-badge ${badgeClass}">
              <i class="fa-solid ${badgeIcon}"></i>
              ${badgeLabel}
            </span>
          </td>
          <td style="text-align:center;">
            <div class="action-btns">
              <button class="btn-icon-action add-qty" onclick="handleQuickRestock('${item.id}')" title="Quick Restock / Add Qty">
                <i class="fa-solid fa-plus"></i>
              </button>
              <button class="btn-icon-action edit" onclick="handleEditStock('${item.id}')" title="Edit Item">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon-action delete" onclick="handleDeleteStock('${item.id}')" title="Delete Item">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    stockTableInfo.textContent = `Showing ${start + 1}–${Math.min(start + perPage, total)} of ${total} records`;
    stockPageNum.textContent = `${currentPage} / ${totalPages}`;
    prevStockPage.disabled = currentPage === 1;
    nextStockPage.disabled = currentPage >= totalPages;
  };

  prevStockPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  nextStockPage.addEventListener('click', () => {
    currentPage++;
    renderTable();
  });

  stockSearch.addEventListener('input', () => {
    currentPage = 1;
    renderTable();
  });

  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });

  // ── MODAL MANAGEMENT (INPUT / EDIT) ──────────────────────────────────────
  const openInputStockModal = (itemToEdit = null) => {
    stockForm.reset();

    if (itemToEdit) {
      modalTitle.textContent = 'Edit Stock Item';
      modalSubtitle.textContent = `Update inventory details for ${itemToEdit.name}`;
      saveBtnText.textContent = 'Update Stock';
      editStockId.value = itemToEdit.id;

      let dateInputVal = itemToEdit.date;
      if (dateInputVal && dateInputVal.includes('Z')) {
        const d = new Date(dateInputVal);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        dateInputVal = d.toISOString().slice(0, 16);
      } else if (dateInputVal && dateInputVal.length > 16) {
        dateInputVal = dateInputVal.slice(0, 16);
      }
      stockDate.value = dateInputVal || getNowDateTimeLocal();
      stockBatch.value = itemToEdit.batch || '';
      stockName.value = itemToEdit.name || '';
      stockQty.value = itemToEdit.stocks ?? 0;
      stockPrice.value = itemToEdit.price ?? 0;
    } else {
      modalTitle.textContent = 'Input New Stock';
      modalSubtitle.textContent = 'Register and batch a new item into the inventory system';
      saveBtnText.textContent = 'Save Stock Item';
      editStockId.value = '';
      stockDate.value = getNowDateTimeLocal();
      stockBatch.value = generateBatchCode();
      stockQty.value = '';
      stockPrice.value = '';
    }

    updateValuationPreview();
    stockModal.classList.add('active');
    setTimeout(() => {
      (itemToEdit ? stockQty : stockName).focus();
    }, 150);
  };

  const closeStockModal = () => {
    stockModal.classList.remove('active');
    stockForm.reset();
    editStockId.value = '';
  };

  tableInputStockBtn.addEventListener('click', () => openInputStockModal());
  if (sidebarInputStocksBtn) {
    sidebarInputStocksBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInputStockModal();
    });
  }

  closeModalBtn.addEventListener('click', closeStockModal);
  cancelModalBtn.addEventListener('click', closeStockModal);
  modalOverlay.addEventListener('click', closeStockModal);

  // ── FORM SUBMISSION (ADD / EDIT) WITH SUPABASE SYNC ──────────────────────
  stockForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = stockDate.value.trim();
    const batchVal = stockBatch.value.trim();
    const nameVal = stockName.value.trim();
    const qtyVal = parseInt(stockQty.value, 10);
    const priceVal = parseFloat(stockPrice.value);

    if (!dateVal || !batchVal || !nameVal || isNaN(qtyVal) || isNaN(priceVal)) {
      showToast('Please fill in all required stock fields.', 'danger');
      return;
    }

    if (qtyVal < 0 || priceVal < 0) {
      showToast('Quantity and price cannot be negative.', 'danger');
      return;
    }

    const targetId = editStockId.value;
    const stocks = [...getStocks()];

    if (targetId) {
      // 1. Local update
      const idx = stocks.findIndex(s => String(s.id) === String(targetId));
      if (idx !== -1) {
        stocks[idx] = {
          ...stocks[idx],
          date: dateVal,
          batch: batchVal,
          name: nameVal,
          stocks: qtyVal,
          price: priceVal,
          updatedAt: new Date().toISOString()
        };
        syncLocal(stocks);
        showToast(`Stock batch ${batchVal} updated!`);
      }

      // 2. Supabase update
      try {
        await supabase
          .from('stock_items')
          .update({
            batch: batchVal,
            name: nameVal,
            quantity: qtyVal,
            unit_price: priceVal,
            date_added: new Date(dateVal).toISOString()
          })
          .eq('id', targetId);
      } catch (err) {
        console.warn('Supabase stock update fallback:', err);
      }

    } else {
      // 1. Add locally
      const tempId = 'stk_' + Date.now();
      const newStock = {
        id: tempId,
        date: dateVal,
        batch: batchVal,
        name: nameVal,
        stocks: qtyVal,
        price: priceVal,
        createdAt: new Date().toISOString()
      };
      stocks.unshift(newStock);
      syncLocal(stocks);
      showToast(`Stock "${nameVal}" added!`);

      // 2. Add to Supabase
      try {
        const { data: inserted } = await supabase
          .from('stock_items')
          .insert([{
            batch: batchVal,
            name: nameVal,
            quantity: qtyVal,
            unit_price: priceVal,
            date_added: new Date(dateVal).toISOString()
          }])
          .select();

        if (inserted && inserted[0]) {
          newStock.id = inserted[0].id;
          syncLocal(stocks);
        }
      } catch (err) {
        console.warn('Supabase stock insert fallback:', err);
      }
    }

    closeStockModal();
  });

  // ── GLOBAL ACTION HANDLERS (EDIT / DELETE / RESTOCK) ─────────────────────
  window.handleEditStock = (id) => {
    const found = getStocks().find(s => String(s.id) === String(id));
    if (found) {
      openInputStockModal(found);
    }
  };

  window.handleDeleteStock = async (id) => {
    const stocks = getStocks();
    const found = stocks.find(s => String(s.id) === String(id));
    if (!found) return;

    const confirmed = confirm(`Are you sure you want to remove this stock item?\n\nItem: ${found.name}\nBatch: ${found.batch}\nStocks: ${found.stocks}`);
    if (confirmed) {
      const updated = stocks.filter(s => String(s.id) !== String(id));
      syncLocal(updated);
      showToast(`Stock item "${found.name}" removed from inventory.`, 'danger');

      try {
        await supabase.from('stock_items').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase stock delete fallback:', err);
      }
    }
  };

  window.handleQuickRestock = (id) => {
    const found = getStocks().find(s => String(s.id) === String(id));
    if (!found) return;

    restockStockId.value = found.id;
    restockItemName.textContent = `${found.name} (Current: ${found.stocks} units)`;
    addUnitsInput.value = '10';

    quickRestockModal.classList.add('active');
    setTimeout(() => addUnitsInput.focus(), 150);
  };

  const closeRestockModal = () => {
    quickRestockModal.classList.remove('active');
  };

  closeRestockModalBtn.addEventListener('click', closeRestockModal);
  cancelRestockBtn.addEventListener('click', closeRestockModal);
  quickRestockOverlay.addEventListener('click', closeRestockModal);

  quickRestockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = restockStockId.value;
    const toAdd = parseInt(addUnitsInput.value, 10);
    if (isNaN(toAdd) || toAdd <= 0) return;

    const stocks = getStocks();
    const found = stocks.find(s => String(s.id) === String(id));
    if (found) {
      found.stocks = (Number(found.stocks) || 0) + toAdd;
      found.updatedAt = new Date().toISOString();
      syncLocal(stocks);
      showToast(`Added +${toAdd} units to ${found.name}. Total: ${found.stocks}`);
      closeRestockModal();

      // Log to Supabase restock_history and update stock_items
      try {
        await supabase.from('stock_items').update({ quantity: found.stocks }).eq('id', id);
        await supabase.from('restock_history').insert([{
          stock_item_id: id,
          quantity_added: toAdd,
          notes: 'Quick restock from inventory table'
        }]);
      } catch (err) {
        console.warn('Supabase restock fallback:', err);
      }
    }
  });

  // ── EXPORT TO CSV ────────────────────────────────────────────────────────
  exportCsvBtn.addEventListener('click', () => {
    const stocks = getFilteredStocks();
    if (!stocks.length) {
      showToast('No stock data available to export.', 'danger');
      return;
    }

    const headers = ['#', 'Date Timestamp', 'Batch Number', 'Item Name', 'Stocks Qty', 'Unit Price (PHP)', 'Total Value (PHP)', 'Status'];
    const rows = stocks.map((s, i) => {
      const qty = Number(s.stocks) || 0;
      const prc = Number(s.price) || 0;
      const status = qty === 0 ? 'Out of Stock' : qty <= 10 ? 'Low Stock' : 'In Stock';
      return [
        i + 1,
        `"${formatTimestamp(s.date)}"`,
        `"${s.batch || ''}"`,
        `"${s.name.replace(/"/g, '""')}"`,
        qty,
        prc.toFixed(2),
        (qty * prc).toFixed(2),
        `"${status}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Stocks_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Inventory report exported as CSV!');
  });

  // ── KEYBOARD ESCAPE TO CLOSE MODALS ──────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStockModal();
      closeRestockModal();
      closeCheckoutModal();
    }
  });

  // ── CHECK URL ACTION FOR DIRECT INPUT TRIGGER ────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'input' || window.location.hash === '#input-stocks') {
    setTimeout(() => openInputStockModal(), 300);
  }

  // ── SIDEBAR STOCKS LIST + CHECKOUT MODAL ─────────────────────────────────
  let _checkoutItem = null;
  let _payMode = 'cash'; // 'cash' | 'credit'

  function fmtPeso(n) {
    return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

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

  function updateCheckoutSummary() {
    if (!_checkoutItem) return;
    const qtyInp = document.getElementById('coQtyInput');
    const qty = Math.max(1, parseInt(qtyInp ? qtyInp.value : 1) || 1);
    const price = Number(_checkoutItem.price) || 0;
    const subtotal = qty * price;

    const subtotalEl = document.getElementById('coSubtotal');
    if (subtotalEl) subtotalEl.textContent = fmtPeso(subtotal);

    const chargeRow = document.getElementById('summaryChargeRow');
    const discountRow = document.getElementById('summaryDiscountRow');
    const partialRow = document.getElementById('summaryPartialRow');
    const chargeValEl = document.getElementById('coCharge');
    const discValEl = document.getElementById('coDiscount');
    const partialValEl = document.getElementById('coPartial');
    const totalLabelEl = document.getElementById('coTotalLabel');
    const totalEl = document.getElementById('coGrandTotal');

    if (_payMode === 'credit') {
      const chargeInp = document.getElementById('coChargeInput');
      const chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
      const total = subtotal + chargeAmt;

      if (chargeRow) chargeRow.style.display = 'flex';
      if (discountRow) discountRow.style.display = 'none';
      if (partialRow) partialRow.style.display = 'none';
      if (chargeValEl) chargeValEl.textContent = '+' + fmtPeso(chargeAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Total (Credit)';
      if (totalEl) totalEl.textContent = fmtPeso(total);
    } else if (_payMode === 'partial') {
      const partialInp = document.getElementById('coPartialInput');
      const rawPartial = Math.max(0, parseFloat(partialInp ? partialInp.value : 0) || 0);
      const partialAmt = Math.min(rawPartial, subtotal);
      const remainingCredit = Math.max(0, subtotal - partialAmt);

      if (chargeRow) chargeRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'none';
      if (partialRow) partialRow.style.display = 'flex';
      if (partialValEl) partialValEl.textContent = '-' + fmtPeso(partialAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Remaining Unpaid';
      if (totalEl) totalEl.textContent = fmtPeso(remainingCredit);
    } else {
      const discInp = document.getElementById('coDiscountInput');
      const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
      const discountAmt = Math.min(discVal, subtotal);
      const total = Math.max(0, subtotal - discountAmt);

      if (chargeRow) chargeRow.style.display = 'none';
      if (discountRow) discountRow.style.display = 'flex';
      if (partialRow) partialRow.style.display = 'none';
      if (discValEl) discValEl.textContent = '-' + fmtPeso(discountAmt);
      if (totalLabelEl) totalLabelEl.textContent = 'Total';
      if (totalEl) totalEl.textContent = fmtPeso(total);
    }
  }

  function setPayMode(mode) {
    _payMode = mode;
    const payModeCash = document.getElementById('payModeCash');
    const payModeCredit = document.getElementById('payModeCredit');
    const payModePartial = document.getElementById('payModePartial');
    const cashSection = document.getElementById('cashSection');
    const creditSection = document.getElementById('creditSection');
    const partialSection = document.getElementById('partialSection');

    if (payModeCash) payModeCash.classList.toggle('active', mode === 'cash');
    if (payModeCredit) payModeCredit.classList.toggle('active', mode === 'credit');
    if (payModePartial) payModePartial.classList.toggle('active', mode === 'partial');

    if (cashSection) cashSection.style.display = mode === 'cash' ? 'block' : 'none';
    if (creditSection) creditSection.style.display = mode === 'credit' ? 'block' : 'none';
    if (partialSection) partialSection.style.display = mode === 'partial' ? 'block' : 'none';

    updateCheckoutSummary();
  }

  function openCheckoutModal(item) {
    _checkoutItem = item;
    const qty = Number(item.stocks) || 0;
    document.getElementById('coProductName').textContent = item.name;
    document.getElementById('coUnitPrice').textContent = fmtPeso(item.price) + '/unit';
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
    const partialInp = document.getElementById('coPartialInput');
    if (partialInp) partialInp.value = '';
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
    const btnApplyPartial = document.getElementById('btnApplyPartial');
    const payModeCash = document.getElementById('payModeCash');
    const payModeCredit = document.getElementById('payModeCredit');
    const payModePartial = document.getElementById('payModePartial');
    const confirmBtn = document.getElementById('confirmCheckoutBtn');

    if (payModeCash) {
      payModeCash.addEventListener('click', () => setPayMode('cash'));
    }
    if (payModeCredit) {
      payModeCredit.addEventListener('click', () => setPayMode('credit'));
    }
    if (payModePartial) {
      payModePartial.addEventListener('click', () => setPayMode('partial'));
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
    if (btnApplyPartial) {
      btnApplyPartial.addEventListener('click', () => {
        updateCheckoutSummary();
        showToast('Partial payment applied to summary');
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

    const partialInp = document.getElementById('coPartialInput');
    if (discInp) {
      discInp.addEventListener('input', updateCheckoutSummary);
    }
    if (chargeInp) {
      chargeInp.addEventListener('input', updateCheckoutSummary);
    }
    if (partialInp) {
      partialInp.addEventListener('input', updateCheckoutSummary);
    }

    if (confirmBtn) {
      let _isCheckingOut = false;
      confirmBtn.addEventListener('click', async () => {
        if (!_checkoutItem || _isCheckingOut) return;
        _isCheckingOut = true;
        setTimeout(() => { _isCheckingOut = false; }, 800);
        const qty = parseInt(qtyInp.value) || 1;
        const price = Number(_checkoutItem.price) || 0;
        const subtotal = qty * price;
        const isCredit = _payMode === 'credit';
        const isPartial = _payMode === 'partial';
        const paymentStatus = (isCredit || isPartial) ? 'unpaid' : 'paid';

        let discountAmt = 0;
        let chargeAmt = 0;
        let partialAmt = 0;
        let total = subtotal;

        if (isCredit) {
          chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
          total = subtotal + chargeAmt;
        } else if (isPartial) {
          const rawPartial = Math.max(0, parseFloat(partialInp ? partialInp.value : 0) || 0);
          partialAmt = Math.min(rawPartial, subtotal);
          total = Math.max(0, subtotal - partialAmt);
        } else {
          const rawDisc = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
          discountAmt = Math.min(rawDisc, subtotal);
          total = Math.max(0, subtotal - discountAmt);
        }

        // Check stock availability
        const currentStock = Number(_checkoutItem.stocks) || 0;
        if (qty > currentStock) {
          showToast(`Cannot checkout ${qty} units. Only ${currentStock} in stock.`, 'danger');
          return;
        }

        // 1. Instant local stock deduction
        const all = [...getStocks()];
        const idx = all.findIndex(s => String(s.id) === String(_checkoutItem.id));
        if (idx !== -1) {
          all[idx].stocks = Math.max(0, Number(all[idx].stocks) - qty);
          all[idx].updatedAt = new Date().toISOString();
          syncLocal(all);
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
        try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
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
        renderTable();
        updateSummaryCards();
        showToast(`Checkout done! ${itemName} ×${qty} — ${fmtPeso(total)} (${modeLabel})`);

        // 4. Non-blocking background sync to Supabase
        (async () => {
          try {
            const isStkLocalId = String(checkoutItemId).startsWith('stk_');
            const txnPromise = supabase
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

            const stockPromise = (!isStkLocalId && idx !== -1)
              ? supabase.from('stock_items').update({ quantity: all[idx].stocks }).eq('id', checkoutItemId)
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
      if (e.key === 'Escape' && checkoutModal.classList.contains('active')) closeCheckoutModal();
    });
  }

  // ── INITIAL LOAD ─────────────────────────────────────────────────────────
  await loadStocks();

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInventory);
} else {
  initInventory();
}
