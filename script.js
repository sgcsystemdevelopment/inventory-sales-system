/**
 * Inventory & Sales Management System - Login Script
 * Handles authentication interaction, validation, role switching, and theme preferences.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Element Selectors ---
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const roleSelect = document.getElementById('roleSelect');
  const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
  const submitBtn = document.getElementById('submitBtn');

  const usernameError = document.getElementById('usernameError');
  const passwordError = document.getElementById('passwordError');
  const alertBox = document.getElementById('alertBox');
  const alertMessage = document.getElementById('alertMessage');
  const alertIcon = document.getElementById('alertIcon');

  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');

  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const forgotModal = document.getElementById('forgotModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const forgotForm = document.getElementById('forgotForm');
  const resetEmailInput = document.getElementById('resetEmailInput');

  const mainLogo = document.getElementById('mainLogo');
  const demoButtons = document.querySelectorAll('.demo-btn');

  // --- Theme Toggle Logic ---
  const initTheme = () => {
    const savedTheme = localStorage.getItem('inv_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
  };

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('inv_theme', theme);
    if (theme === 'dark') {
      themeIcon.className = 'fa-regular fa-sun';
      themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
      if (mainLogo) mainLogo.src = 'logo-white.png';
    } else {
      themeIcon.className = 'fa-regular fa-moon';
      themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
      if (mainLogo) mainLogo.src = 'logo.png';
    }
  };

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // --- Password Visibility Toggle ---
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  });

  // --- Alert Box Helpers ---
  const showAlert = (message, type = 'error') => {
    alertMessage.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertIcon.className = type === 'success' 
      ? 'fa-solid fa-circle-check' 
      : 'fa-solid fa-circle-exclamation';
    alertBox.style.display = 'flex';
  };

  const hideAlert = () => {
    alertBox.style.display = 'none';
  };

  // --- Input Validation Helpers ---
  const clearErrors = () => {
    usernameError.textContent = '';
    passwordError.textContent = '';
    usernameInput.closest('.input-group').classList.remove('has-error');
    passwordInput.closest('.input-group').classList.remove('has-error');
    hideAlert();
  };

  const setFieldError = (input, errorEl, message) => {
    errorEl.textContent = message;
    input.closest('.input-group').classList.add('has-error');
    input.focus();
  };

  // --- Demo Credentials Quick-Fill ---
  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      clearErrors();
      const user = btn.getAttribute('data-user');
      const role = btn.getAttribute('data-role');

      usernameInput.value = user;
      passwordInput.value = 'password123';
      roleSelect.value = role;

      // Small visual feedback
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 150);
    });
  });

  // --- Form Submission & Simulated Authentication ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;
    const rememberMe = rememberMeCheckbox.checked;

    // Validate inputs
    let hasError = false;

    if (!username) {
      setFieldError(usernameInput, usernameError, 'Please enter your username or email.');
      hasError = true;
    }

    if (!password) {
      setFieldError(passwordInput, passwordError, 'Please enter your password.');
      hasError = true;
    } else if (password.length < 6) {
      setFieldError(passwordInput, passwordError, 'Password must be at least 6 characters.');
      hasError = true;
    }

    if (hasError) {
      loginForm.classList.add('shake');
      setTimeout(() => loginForm.classList.remove('shake'), 400);
      return;
    }

    // Set Loading State
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      // Simulate network request to backend / Supabase / Auth server
      await new Promise(resolve => setTimeout(resolve, 900));

      // Mock verification
      // For demo purposes, any valid password with >= 6 chars succeeds
      const roleDisplayNames = {
        admin: 'Administrator',
        manager: 'Inventory Manager',
        cashier: 'Cashier / POS'
      };

      showAlert(`Welcome back, ${roleDisplayNames[role]}! Redirecting to workspace...`, 'success');

      if (rememberMe) {
        localStorage.setItem('inv_last_user', username);
      } else {
        localStorage.removeItem('inv_last_user');
      }

      // Here you can hook up your actual redirection, e.g.:
      // window.location.href = '/dashboard.html';
      console.log('Login successful:', { username, role, rememberMe });

    } catch (err) {
      showAlert('Authentication failed. Please verify your credentials.', 'error');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  // --- Populate remembered username if available ---
  const savedUser = localStorage.getItem('inv_last_user');
  if (savedUser) {
    usernameInput.value = savedUser;
  }

  // --- Forgot Password Modal ---
  const openModal = () => {
    forgotModal.classList.add('active');
    resetEmailInput.value = usernameInput.value || '';
    resetEmailInput.focus();
  };

  const closeModal = () => {
    forgotModal.classList.remove('active');
  };

  forgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && forgotModal.classList.contains('active')) {
      closeModal();
    }
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput.value.trim();
    if (!email) return;

    const resetBtn = document.getElementById('sendResetBtn');
    resetBtn.disabled = true;
    resetBtn.textContent = 'Sending...';

    setTimeout(() => {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Send Reset Link';
      closeModal();
      showAlert(`A password reset link was dispatched to ${email}.`, 'success');
    }, 800);
  });
});
