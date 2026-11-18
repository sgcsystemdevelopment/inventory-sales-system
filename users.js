/**
 * User Management Script — Inventory & Sales System
 * Handles: Profiles listing, RBAC, Add/Edit User, Activate/Deactivate, Last Admin safeguard
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';
import { renderGlobalSidebarStocks, setupCheckoutModalEvents } from './checkoutManager.js';

const initUsers = async () => {
  // Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const sidebarEl = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarLogo = document.getElementById('sidebarLogo');
  const userAvatar = document.getElementById('userAvatar');

  const statTotalUsers = document.getElementById('statTotalUsers');
  const statActiveUsers = document.getElementById('statActiveUsers');
  const statAdmins = document.getElementById('statAdmins');
  const statLastLogin = document.getElementById('statLastLogin');

  const usersTableBody = document.getElementById('usersTableBody');
  const usersTableInfo = document.getElementById('usersTableInfo');
  const usersPageNum = document.getElementById('usersPageNum');
  const prevUsersPage = document.getElementById('prevUsersPage');
  const nextUsersPage = document.getElementById('nextUsersPage');
  const userSearch = document.getElementById('userSearch');
  const addUserBtn = document.getElementById('addUserBtn');

  const userModal = document.getElementById('userModal');
  const userModalOverlay = document.getElementById('userModalOverlay');
  const closeUserModalBtn = document.getElementById('closeUserModalBtn');
  const cancelUserBtn = document.getElementById('cancelUserBtn');
  const userForm = document.getElementById('userForm');
  const userModalTitle = document.getElementById('userModalTitle');
  const userModalSubtitle = document.getElementById('userModalSubtitle');
  const userSaveBtnText = document.getElementById('userSaveBtnText');
  const editUserId = document.getElementById('editUserId');
  const userUsername = document.getElementById('userUsername');
  const userFullName = document.getElementById('userFullName');
  const userRole = document.getElementById('userRole');
  const userIsActive = document.getElementById('userIsActive');

  const pwResetModal = document.getElementById('pwResetModal');
  const pwResetOverlay = document.getElementById('pwResetOverlay');
  const closePwResetBtn = document.getElementById('closePwResetBtn');
  const cancelPwResetBtn = document.getElementById('cancelPwResetBtn');
  const confirmPwResetBtn = document.getElementById('confirmPwResetBtn');
  const pwResetSubtitle = document.getElementById('pwResetSubtitle');

  const toastNotice = document.getElementById('toastNotice');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg = document.getElementById('toastMsg');

  // Theme
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

  // Sidebar Toggle
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
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

  // User session
  const sessionData = sessionStorage.getItem('inv_current_user');
  if (sessionData && userAvatar) {
    try {
      const user = JSON.parse(sessionData);
      if (user.username) userAvatar.title = `${user.username} (${user.roleName || user.role})`;
    } catch (e) { }
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('inv_current_user');
      window.location.href = 'index.html';
    });
  }

  // Sidebar Stocks & Checkout Modal
  renderGlobalSidebarStocks('sidebarStocksList');
  setupCheckoutModalEvents();

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // State
  let usersList = [];

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        usersList = data;
      } else {
        const local = localStorage.getItem('inv_users_data');
        usersList = local ? JSON.parse(local) : [];
      }
    } catch (e) {
      console.warn('Profiles fetch error, using local fallback:', e);
      const local = localStorage.getItem('inv_users_data');
      usersList = local ? JSON.parse(local) : [];
    }
    updateSummaryCards();
    renderTable();
  }

  function saveLocalUsers() {
    localStorage.setItem('inv_users_data', JSON.stringify(usersList));
    updateSummaryCards();
    renderTable();
  }

  function updateSummaryCards() {
    const total = usersList.length;
    const active = usersList.filter(u => u.is_active).length;
    const admins = usersList.filter(u => u.role === 'admin' && u.is_active).length;

    let lastLogin = '—';
    const logins = usersList.map(u => u.last_login_at).filter(Boolean).sort().reverse();
    if (logins.length > 0) {
      lastLogin = formatDate(logins[0]);
    }

    if (statTotalUsers) statTotalUsers.textContent = total;
    if (statActiveUsers) statActiveUsers.textContent = active;
    if (statAdmins) statAdmins.textContent = admins;
    if (statLastLogin) statLastLogin.textContent = lastLogin;
  }

  // Pagination & Filtering
  let currentPage = 1;
  const perPage = 10;

  function getFilteredUsers() {
    const q = (userSearch ? userSearch.value : '').trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }

  function renderTable() {
    const filtered = getFilteredUsers();
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);

    if (total === 0) {
      usersTableBody.innerHTML = `<tr class="empty-row"><td colspan="7">
        <div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No users found.</p></div>
      </td></tr>`;
      usersTableInfo.textContent = 'Showing 0 records';
      usersPageNum.textContent = '1 / 1';
      prevUsersPage.disabled = true;
      nextUsersPage.disabled = true;
      return;
    }

    usersTableBody.innerHTML = paged.map((u, idx) => {
      const roleCls = u.role === 'admin' ? 'admin' : u.role === 'manager' ? 'manager' : 'cashier';
      const statusCls = u.is_active ? 'active' : 'inactive';
      const statusText = u.is_active ? 'Active' : 'Inactive';
      const toggleActionTitle = u.is_active ? 'Deactivate' : 'Activate';
      const toggleActionIcon = u.is_active ? 'fa-user-slash' : 'fa-user-check';

      return `<tr>
        <td style="font-weight:600;color:var(--text-muted);">${start + idx + 1}</td>
        <td style="font-weight:700;color:var(--accent);">${u.username || '—'}</td>
        <td>${u.full_name || '—'}</td>
        <td>
          <span class="role-badge ${roleCls}">
            <i class="fa-solid fa-shield-halved"></i>
            ${(u.role || '').toUpperCase()}
          </span>
        </td>
        <td>
          <span class="status-badge ${statusCls}">
            <i class="fa-solid fa-circle" style="font-size:0.4rem;"></i>
            ${statusText}
          </span>
        </td>
        <td>${formatDate(u.last_login_at)}</td>
        <td style="text-align:center;">
          <div class="action-btns" style="justify-content:center;">
            <button class="btn-icon-action edit" onclick="window.handleEditUser('${u.id}')" title="Edit User">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon-action toggle" onclick="window.handleToggleUser('${u.id}')" title="${toggleActionTitle}">
              <i class="fa-solid ${toggleActionIcon}"></i>
            </button>
            <button class="btn-icon-action reset" onclick="window.handleResetPw('${u.id}')" title="Reset Password">
              <i class="fa-solid fa-key"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');

    usersTableInfo.textContent = `Showing ${start + 1}–${Math.min(start + perPage, total)} of ${total} records`;
    usersPageNum.textContent = `${currentPage} / ${totalPages}`;
    prevUsersPage.disabled = currentPage === 1;
    nextUsersPage.disabled = currentPage >= totalPages;
  }

  if (prevUsersPage) prevUsersPage.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
  if (nextUsersPage) nextUsersPage.addEventListener('click', () => { currentPage++; renderTable(); });
  if (userSearch) userSearch.addEventListener('input', () => { currentPage = 1; renderTable(); });

  // Modal handlers
  function openUserModal(user = null) {
    userForm.reset();
    if (user) {
      userModalTitle.textContent = 'Edit User';
      userModalSubtitle.textContent = `Update account details for ${user.username}`;
      userSaveBtnText.textContent = 'Update User';
      editUserId.value = user.id;
      userUsername.value = user.username || '';
      userFullName.value = user.full_name || '';
      userRole.value = user.role || 'cashier';
      userIsActive.checked = user.is_active !== false;
    } else {
      userModalTitle.textContent = 'Add User';
      userModalSubtitle.textContent = 'Create a new system account';
      userSaveBtnText.textContent = 'Save User';
      editUserId.value = '';
      userRole.value = 'cashier';
      userIsActive.checked = true;
    }
    userModal.classList.add('active');
  }

  function closeUserModal() {
    userModal.classList.remove('active');
  }

  if (addUserBtn) addUserBtn.addEventListener('click', () => openUserModal());
  if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', closeUserModal);
  if (cancelUserBtn) cancelUserBtn.addEventListener('click', closeUserModal);
  if (userModalOverlay) userModalOverlay.addEventListener('click', closeUserModal);

  // User Form Submit
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editUserId.value;
    const username = userUsername.value.trim();
    const full_name = userFullName.value.trim();
    const role = userRole.value;
    const is_active = userIsActive.checked;

    if (!username || !full_name || !role) {
      showToast('Please fill all required fields.', 'danger');
      return;
    }

    if (id) {
      // Check safeguard: Cannot deactivate or demote the last active admin
      const target = usersList.find(u => String(u.id) === String(id));
      if (target && target.role === 'admin' && target.is_active) {
        const otherAdmins = usersList.filter(u => String(u.id) !== String(id) && u.role === 'admin' && u.is_active);
        if (otherAdmins.length === 0 && (!is_active || role !== 'admin')) {
          showToast('Cannot deactivate or reassign the sole remaining active Admin!', 'danger');
          return;
        }
      }

      const idx = usersList.findIndex(u => String(u.id) === String(id));
      if (idx !== -1) {
        usersList[idx] = { ...usersList[idx], username, full_name, role, is_active };
        saveLocalUsers();
        showToast(`User ${username} updated successfully!`);
      }

      try {
        await supabase.from('profiles').update({ username, full_name, role, is_active }).eq('id', id);
      } catch (err) {
        console.warn('Supabase update profile error:', err);
      }
    } else {
      const newId = 'usr_' + Date.now();
      const newUser = {
        id: newId,
        username,
        full_name,
        role,
        is_active,
        created_at: new Date().toISOString(),
        last_login_at: null
      };
      usersList.unshift(newUser);
      saveLocalUsers();
      showToast(`User ${username} added!`);

      try {
        const { data: inserted } = await supabase.from('profiles').insert([{ username, full_name, role, is_active }]).select();
        if (inserted && inserted[0]) {
          newUser.id = inserted[0].id;
          saveLocalUsers();
        }
      } catch (err) {
        console.warn('Supabase insert profile error:', err);
      }
    }

    closeUserModal();
  });

  // Global Actions
  window.handleEditUser = (id) => {
    const user = usersList.find(u => String(u.id) === String(id));
    if (user) openUserModal(user);
  };

  window.handleToggleUser = async (id) => {
    const user = usersList.find(u => String(u.id) === String(id));
    if (!user) return;

    if (user.role === 'admin' && user.is_active) {
      const activeAdmins = usersList.filter(u => u.role === 'admin' && u.is_active);
      if (activeAdmins.length <= 1) {
        showToast('Operation rejected: Cannot deactivate the sole active Admin!', 'danger');
        return;
      }
    }

    const nextState = !user.is_active;
    user.is_active = nextState;
    saveLocalUsers();
    showToast(`User ${user.username} is now ${nextState ? 'Active' : 'Inactive'}.`);

    try {
      await supabase.from('profiles').update({ is_active: nextState }).eq('id', id);
    } catch (e) {
      console.warn('Supabase toggle active state error:', e);
    }
  };

  let targetResetUser = null;
  window.handleResetPw = (id) => {
    const user = usersList.find(u => String(u.id) === String(id));
    if (!user) return;
    targetResetUser = user;
    if (pwResetSubtitle) pwResetSubtitle.textContent = `Send password reset for ${user.username}`;
    if (pwResetModal) {
      pwResetModal.classList.add('active');
    }
  };

  const closePwReset = () => {
    if (!pwResetModal) return;
    pwResetModal.classList.remove('active');
    targetResetUser = null;
  };

  if (closePwResetBtn) closePwResetBtn.addEventListener('click', closePwReset);
  if (cancelPwResetBtn) cancelPwResetBtn.addEventListener('click', closePwReset);
  if (pwResetOverlay) pwResetOverlay.addEventListener('click', closePwReset);

  if (confirmPwResetBtn) {
    confirmPwResetBtn.addEventListener('click', async () => {
      if (!targetResetUser) return;
      showToast(`Password reset link dispatched for ${targetResetUser.username}!`);
      closePwReset();
    });
  }

  await loadUsers();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUsers);
} else {
  initUsers();
}
