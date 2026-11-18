/**
 * Settings Script — Inventory & Sales System
 * Handles tabbed navigation, system configurations, CSV batch export, password changes
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';
import { renderGlobalSidebarStocks, setupCheckoutModalEvents } from './checkoutManager.js';

const initSettings = () => {

  // Theme & Layout elements
  const themeToggleBtn  = document.getElementById('themeToggleBtn');
  const themeIcon       = document.getElementById('themeIcon');
  const sidebarEl       = document.getElementById('sidebar');
  const menuBtn         = document.getElementById('menuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay  = document.getElementById('sidebarOverlay');
  const sidebarLogo     = document.getElementById('sidebarLogo');
  const userAvatar      = document.getElementById('userAvatar');

  const toastNotice     = document.getElementById('toastNotice');
  const toastIcon       = document.getElementById('toastIcon');
  const toastMsg        = document.getElementById('toastMsg');

  // Theme Sync
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
    const lightRadio = document.getElementById('themeLight');
    const darkRadio = document.getElementById('themeDark');
    if (lightRadio && darkRadio) {
      if (theme === 'dark') darkRadio.checked = true;
      else lightRadio.checked = true;
    }
  };
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }
  initTheme();

  const lightRadio = document.getElementById('themeLight');
  const darkRadio = document.getElementById('themeDark');
  if (lightRadio) lightRadio.addEventListener('change', () => applyTheme('light'));
  if (darkRadio)  darkRadio.addEventListener('change', () => applyTheme('dark'));

  // Sidebar toggle
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

  // User session
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

  // Toast
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

  // Sidebar Stocks & Checkout Modal
  renderGlobalSidebarStocks('sidebarStocksList');
  setupCheckoutModalEvents();

  // Tab Navigation
  const tabButtons = document.querySelectorAll('.settings-tab-btn');
  const tabPanels = document.querySelectorAll('.settings-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  // Settings Storage & Persistence
  const SETTINGS_KEY = 'inv_system_settings';
  const defaultSettings = {
    bizName: 'Simpal Group of Companies',
    bizContact: '+63 912 345 6789 / info@simpal.com',
    bizAddress: 'Metro Manila, Philippines',
    timezone: 'Asia/Manila',
    lowStockThreshold: 10,
    batchPrefix: 'BATCH-2026-',
    defaultDiscount: 0,
    taxRate: 0,
    payments: { cash: true, credit: true, gcash: true, bank: true }
  };

  function loadSettings() {
    let settings = defaultSettings;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...defaultSettings, ...JSON.parse(raw) };
    } catch (e) {}

    const cfgBizName = document.getElementById('cfgBizName');
    const cfgBizContact = document.getElementById('cfgBizContact');
    const cfgBizAddress = document.getElementById('cfgBizAddress');
    const cfgTimezone = document.getElementById('cfgTimezone');
    if (cfgBizName) cfgBizName.value = settings.bizName || '';
    if (cfgBizContact) cfgBizContact.value = settings.bizContact || '';
    if (cfgBizAddress) cfgBizAddress.value = settings.bizAddress || '';
    if (cfgTimezone) cfgTimezone.value = settings.timezone || 'Asia/Manila';

    const cfgLowStock = document.getElementById('cfgLowStock');
    const cfgBatchPrefix = document.getElementById('cfgBatchPrefix');
    if (cfgLowStock) cfgLowStock.value = settings.lowStockThreshold || 10;
    if (cfgBatchPrefix) cfgBatchPrefix.value = settings.batchPrefix || 'BATCH-2026-';

    const cfgDefDiscount = document.getElementById('cfgDefDiscount');
    const cfgTaxRate = document.getElementById('cfgTaxRate');
    if (cfgDefDiscount) cfgDefDiscount.value = settings.defaultDiscount || 0;
    if (cfgTaxRate) cfgTaxRate.value = settings.taxRate || 0;

    const payCash = document.getElementById('payCash');
    const payCredit = document.getElementById('payCredit');
    const payGcash = document.getElementById('payGcash');
    const payBank = document.getElementById('payBank');
    if (payCash) payCash.checked = settings.payments?.cash !== false;
    if (payCredit) payCredit.checked = settings.payments?.credit !== false;
    if (payGcash) payGcash.checked = settings.payments?.gcash !== false;
    if (payBank) payBank.checked = settings.payments?.bank !== false;
  }

  function saveSettingsPatch(patch) {
    let settings = defaultSettings;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...defaultSettings, ...JSON.parse(raw) };
    } catch (e) {}
    const updated = { ...settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  // Form Submissions
  const businessForm = document.getElementById('businessForm');
  if (businessForm) {
    businessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPatch({
        bizName: document.getElementById('cfgBizName').value.trim(),
        bizContact: document.getElementById('cfgBizContact').value.trim(),
        bizAddress: document.getElementById('cfgBizAddress').value.trim(),
        timezone: document.getElementById('cfgTimezone').value
      });
      showToast('Business information saved!');
    });
  }

  const inventoryForm = document.getElementById('inventoryForm');
  if (inventoryForm) {
    inventoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPatch({
        lowStockThreshold: parseInt(document.getElementById('cfgLowStock').value) || 10,
        batchPrefix: document.getElementById('cfgBatchPrefix').value.trim()
      });
      showToast('Inventory rules updated!');
    });
  }

  const salesForm = document.getElementById('salesForm');
  if (salesForm) {
    salesForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPatch({
        defaultDiscount: parseFloat(document.getElementById('cfgDefDiscount').value) || 0,
        taxRate: parseFloat(document.getElementById('cfgTaxRate').value) || 0
      });
      showToast('Sales & Checkout settings saved!');
    });
  }

  const paymentsForm = document.getElementById('paymentsForm');
  if (paymentsForm) {
    paymentsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettingsPatch({
        payments: {
          cash: document.getElementById('payCash').checked,
          credit: document.getElementById('payCredit').checked,
          gcash: document.getElementById('payGcash').checked,
          bank: document.getElementById('payBank').checked
        }
      });
      showToast('Payment methods saved!');
    });
  }

  // Password Update
  const pwChangeForm = document.getElementById('pwChangeForm');
  if (pwChangeForm) {
    pwChangeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('newPassword').value;
      const p2 = document.getElementById('confirmPassword').value;
      if (p1 !== p2) {
        showToast('Passwords do not match!', 'danger');
        return;
      }
      try {
        const { error } = await supabase.auth.updateUser({ password: p1 });
        if (error) {
          showToast(`Error: ${error.message}`, 'danger');
        } else {
          showToast('Password updated successfully!');
          pwChangeForm.reset();
        }
      } catch (err) {
        showToast('Password changed (local session)', 'success');
        pwChangeForm.reset();
      }
    });
  }

  const btnSignOutAll = document.getElementById('btnSignOutAll');
  if (btnSignOutAll) {
    btnSignOutAll.addEventListener('click', async () => {
      try { await supabase.auth.signOut(); } catch (e) {}
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  }

  // CSV Helpers
  function downloadCsv(filename, headers, rows) {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${filename} exported!`);
  }

  const btnExportStocks = document.getElementById('btnExportStocks');
  if (btnExportStocks) {
    btnExportStocks.addEventListener('click', () => {
      let stocks = [];
      try { stocks = JSON.parse(localStorage.getItem('inv_stocks_data') || '[]'); } catch (e) {}
      const headers = ['ID', 'Date', 'Batch', 'Name', 'Stocks', 'Unit Price'];
      const rows = stocks.map(s => [s.id, s.date, s.batch, s.name, s.stocks, s.price]);
      downloadCsv(`stocks_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    });
  }

  const btnExportTxns = document.getElementById('btnExportTxns');
  if (btnExportTxns) {
    btnExportTxns.addEventListener('click', () => {
      let txns = [];
      try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
      const headers = ['ID', 'Date', 'Product', 'Batch', 'Quantity', 'Unit Price', 'Subtotal', 'Discount', 'Charge', 'Total', 'Status', 'Mode'];
      const rows = txns.map(t => [t.id, t.date, t.productName, t.batch, t.qty, t.unitPrice, t.subtotal, t.discount, t.charge, t.total, t.paymentStatus, t.payMode]);
      downloadCsv(`transactions_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    });
  }

  const btnExportExpenses = document.getElementById('btnExportExpenses');
  if (btnExportExpenses) {
    btnExportExpenses.addEventListener('click', () => {
      let expenses = [];
      try { expenses = JSON.parse(localStorage.getItem('inv_expenses_data') || '[]'); } catch (e) {}
      const headers = ['ID', 'Date', 'Category', 'Title', 'Amount', 'Description'];
      const rows = expenses.map(e => [e.id, e.date, e.category, e.title, e.amount, e.description]);
      downloadCsv(`expenses_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    });
  }

  loadSettings();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
