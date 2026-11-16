# Inventory & Sales Management System - Login Form

A clean, responsive, enterprise-grade login module built for the **Inventory & Sales System**.

---

## 🚀 Features Included

- **Modern Split-Screen UI**: High-impact brand showcase with feature highlights on desktop, transitioning seamlessly to a mobile-optimized card on smaller screens.
- **Role Selection Support**:
  - `Administrator`: Full system settings, financials, and user controls.
  - `Inventory Manager`: Stock levels, supply chain, and warehouse operations.
  - `Cashier / Sales`: Point of Sale (POS), invoices, and customer receipts.
- **Interactive Quick-Demo Buttons**: Instant 1-click test credentials for each user role.
- **Security & UX Enhancements**:
  - Show / Hide password visibility toggle.
  - Floating focus states, real-time input validation, and animated shake effect on errors.
  - Loading spinner indicator on submission.
  - "Remember Me" credential caching via `localStorage`.
  - Accessible "Forgot Password" modal dialog.
- **Dark Mode / Light Mode**: Auto-detects system color scheme with instant toggle button and local storage persistence.

---

## 📁 File Structure

- [index.html](file:///d:/DAN%20FOLDER/SYSTEM/Inventory%20Sales%20System/index.html) - Semantic HTML5 markup and dialogs.
- [style.css](file:///d:/DAN%20FOLDER/SYSTEM/Inventory%20Sales%20System/style.css) - Responsive styling, CSS custom variables, animations, and dark mode overrides.
- [script.js](file:///d:/DAN%20FOLDER/SYSTEM/Inventory%20Sales%20System/script.js) - Authentication handlers, validation, modal, and theme toggling.

---

## 🔌 Connecting to Your Database / Backend

In `script.js`, locate the `loginForm.addEventListener('submit', ...)` function. Replace the demo `setTimeout` simulation with your actual API endpoint or Supabase authentication client:

```javascript
// Example Supabase Auth:
const { data, error } = await supabase.auth.signInWithPassword({
  email: username,
  password: password,
});

if (error) {
  showAlert(error.message, 'error');
} else {
  showAlert('Login successful! Redirecting...', 'success');
  window.location.href = '/dashboard.html';
}
```
