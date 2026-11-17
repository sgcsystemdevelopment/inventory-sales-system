/**
 * Dashboard Script — Inventory & Sales System
 * Handles: Theme, Sidebar, Charts (Chart.js), Summary cards, Transactions table
 * Connect to Supabase by filling in the fetchData() function.
 */

document.addEventListener('DOMContentLoaded', () => {

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

  // ── MOCK DATA (replace with Supabase fetch) ───────────────────────────────
  const getMockData = (period) => {
    const scale = { today: 1, week: 6.5, month: 28, quarter: 85, year: 320 }[period] || 6.5;
    return {
      paid:     Math.round(48500 * scale),
      unpaid:   Math.round(12300 * scale),
      expense:  Math.round(9800  * scale),
      discount: Math.round(3200  * scale),
      cash:     Math.round(31000 * scale),
      // For the bar chart labels & values
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
  };

  // ── SUPABASE FETCH (wire up when ready) ──────────────────────────────────
  // const { createClient } = supabase;
  // const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  //
  // const fetchData = async (period) => {
  //   const { data, error } = await sb.from('transactions').select('*');
  //   if (error) { console.error(error); return null; }
  //   return data;
  // };

  // ── UPDATE CARDS ──────────────────────────────────────────────────────────
  const animateCount = (el, target, prefix = '₱') => {
    const start = 0;
    const duration = 800;
    const startTime = performance.now();
    const update = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3); // ease-out cubic
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
    const ctxBar   = document.getElementById('salesChart').getContext('2d');
    const ctxDonut = document.getElementById('breakdownChart').getContext('2d');
    const textColor = getChartTextColor();
    const gridColor = getGridColor();

    // BAR CHART
    salesChart = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: data.chartLabels,
        datasets: [
          {
            label: 'Paid',
            data: data.chartPaid,
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Unpaid',
            data: data.chartUnpaid,
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expense',
            data: data.chartExpense,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${currency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11, weight: '600', family: "'Plus Jakarta Sans'" } },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor,
              font: { size: 11, family: "'Plus Jakarta Sans'" },
              callback: (v) => '₱' + (v / 1000).toFixed(0) + 'k'
            },
            grid: { color: gridColor }
          }
        }
      }
    });

    // DOUGHNUT CHART
    breakdownChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Paid', 'Unpaid', 'Expense', 'Discounted', 'Cash'],
        datasets: [{
          data: [data.paid, data.unpaid, data.expense, data.discount, data.cash],
          backgroundColor: [
            chartColors.paid,
            chartColors.unpaid,
            chartColors.expense,
            chartColors.discount,
            chartColors.cash,
          ],
          borderWidth: 3,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#131c31' : '#ffffff',
          hoverOffset: 8,
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
              font: { size: 11, weight: '600', family: "'Plus Jakarta Sans'" },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${currency(ctx.raw)}`
            }
          }
        }
      }
    });
  };

  const updateChartTheme = (theme) => {
    if (!salesChart || !breakdownChart) return;
    const textColor = theme === 'dark' ? '#94a3b8' : '#475569';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const borderColor = theme === 'dark' ? '#131c31' : '#ffffff';

    salesChart.options.scales.x.ticks.color = textColor;
    salesChart.options.scales.y.ticks.color = textColor;
    salesChart.options.scales.x.grid.color  = gridColor;
    salesChart.options.scales.y.grid.color  = gridColor;
    salesChart.update();

    breakdownChart.data.datasets[0].borderColor = borderColor;
    breakdownChart.options.plugins.legend.labels.color = textColor;
    breakdownChart.update();
  };

  // ── TRANSACTIONS TABLE ────────────────────────────────────────────────────
  let allTransactions = [];
  let currentPage = 1;
  const perPage = 10;

  const renderTable = (transactions) => {
    const tbody = document.getElementById('transactionTableBody');
    const info  = document.getElementById('tableInfo');
    const pageNum = document.getElementById('pageNum');

    if (!transactions.length) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">
            <div class="empty-state">
              <i class="fa-solid fa-inbox"></i>
              <p>No transactions found for this period.</p>
            </div>
          </td>
        </tr>`;
      info.textContent = 'Showing 0 of 0 records';
      return;
    }

    const start = (currentPage - 1) * perPage;
    const slice = transactions.slice(start, start + perPage);
    const totalPages = Math.ceil(transactions.length / perPage);

    tbody.innerHTML = slice.map((t, i) => `
      <tr>
        <td style="color: var(--text-muted);">${start + i + 1}</td>
        <td style="font-weight:700; color:var(--primary);">${t.ref}</td>
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

  // ── LOAD DATA ─────────────────────────────────────────────────────────────
  const loadDashboard = (period = 'week') => {
    const data = getMockData(period);  // ← swap with await fetchData(period) when Supabase is connected
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

  dateRangeSelect.addEventListener('change', (e) => loadDashboard(e.target.value));

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
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // Initial load
  loadDashboard('week');

});
