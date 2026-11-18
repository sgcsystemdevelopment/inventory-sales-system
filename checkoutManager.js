/**
 * Global Checkout & Stocks Module — Inventory & Sales System
 * Standardized across Dashboard, Inventory, Expenses, Transactions, User Management, and Settings.
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';

let _checkoutItem = null;
let _payMode = 'cash'; // 'cash' | 'credit'
let _onCheckoutSuccessCallback = null;

const currency = (val) =>
  '₱' + Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function getGlobalStocks() {
  try {
    const raw = localStorage.getItem('inv_stocks_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveGlobalStocks(stocks) {
  localStorage.setItem('inv_stocks_data', JSON.stringify(stocks));
}

export function renderGlobalSidebarStocks(containerId = 'sidebarStocksList', onItemClick = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const stocks = getGlobalStocks();
  if (!stocks.length) {
    container.innerHTML = '<span class="sidebar-stock-empty">No stocks added yet.</span>';
    return;
  }
  container.innerHTML = stocks.map(item => {
    const qty = Number(item.stocks) || 0;
    const cls = qty === 0 ? 'out-of-stock' : qty <= 10 ? 'low-stock' : '';
    const badge = qty === 0 ? 'Out' : qty <= 10 ? qty + ' low' : qty;
    return `<div class="sidebar-stock-item ${cls}" data-id="${item.id}" title="${item.name}">
      <span class="stock-icon"><i class="fa-solid fa-box-open"></i></span>
      <span class="stock-item-name">${item.name}</span>
      <span class="stock-item-badge">${badge}</span>
    </div>`;
  }).join('');

  container.querySelectorAll('.sidebar-stock-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const found = getGlobalStocks().find(s => String(s.id) === String(id));
      if (found) {
        if (typeof onItemClick === 'function') {
          onItemClick(found);
        } else {
          openGlobalCheckoutModal(found);
        }
      }
    });
  });
}

export function updateCheckoutSummary() {
  if (!_checkoutItem) return;
  const qtyInp = document.getElementById('coQtyInput');
  const qty = Math.max(1, parseInt(qtyInp ? qtyInp.value : 1) || 1);
  const price = Number(_checkoutItem.price) || 0;
  const subtotal = qty * price;

  const subtotalEl = document.getElementById('coSubtotal');
  if (subtotalEl) subtotalEl.textContent = currency(subtotal);

  const chargeRow = document.getElementById('summaryChargeRow');
  const discountRow = document.getElementById('summaryDiscountRow');
  const chargeValEl = document.getElementById('coCharge');
  const discValEl = document.getElementById('coDiscount');
  const totalEl = document.getElementById('coGrandTotal');

  if (_payMode === 'credit') {
    const chargeInp = document.getElementById('coChargeInput');
    const chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
    const total = subtotal + chargeAmt;

    if (chargeRow) chargeRow.style.display = 'flex';
    if (discountRow) discountRow.style.display = 'none';
    if (chargeValEl) chargeValEl.textContent = '+' + currency(chargeAmt);
    if (totalEl) totalEl.textContent = currency(total);
  } else {
    const discInp = document.getElementById('coDiscountInput');
    const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
    const discountAmt = Math.min(discVal, subtotal);
    const total = Math.max(0, subtotal - discountAmt);

    if (chargeRow) chargeRow.style.display = 'none';
    if (discountRow) discountRow.style.display = 'flex';
    if (discValEl) discValEl.textContent = '-' + currency(discountAmt);
    if (totalEl) totalEl.textContent = currency(total);
  }
}

export function setPayMode(mode) {
  _payMode = mode;
  const payModeCash = document.getElementById('payModeCash');
  const payModeCredit = document.getElementById('payModeCredit');
  const cashSection = document.getElementById('cashSection');
  const creditSection = document.getElementById('creditSection');

  if (mode === 'credit') {
    if (payModeCash) payModeCash.classList.remove('active');
    if (payModeCredit) payModeCredit.classList.add('active');
    if (cashSection) cashSection.style.display = 'none';
    if (creditSection) creditSection.style.display = 'block';
  } else {
    if (payModeCash) payModeCash.classList.add('active');
    if (payModeCredit) payModeCredit.classList.remove('active');
    if (cashSection) cashSection.style.display = 'block';
    if (creditSection) creditSection.style.display = 'none';
  }
  updateCheckoutSummary();
}

export function openGlobalCheckoutModal(item, onSuccess = null) {
  if (onSuccess) _onCheckoutSuccessCallback = onSuccess;
  _checkoutItem = item;
  const qty = Number(item.stocks) || 0;

  const coProductName = document.getElementById('coProductName');
  const coUnitPrice = document.getElementById('coUnitPrice');
  const stockBadge = document.getElementById('coStockAvail');
  const coBatchTag = document.getElementById('coBatchTag');

  if (coProductName) coProductName.textContent = item.name;
  if (coUnitPrice) coUnitPrice.textContent = currency(item.price) + '/unit';
  if (stockBadge) {
    stockBadge.textContent = qty + ' units available';
    stockBadge.className = 'co-stock-badge' + (qty === 0 ? ' out' : qty <= 10 ? ' low' : '');
  }
  if (coBatchTag) coBatchTag.textContent = item.batch ? 'Batch: ' + item.batch : '';

  const qtyInput = document.getElementById('coQtyInput');
  if (qtyInput) {
    qtyInput.value = qty > 0 ? 1 : 0;
    qtyInput.max = qty;
  }

  const discInp = document.getElementById('coDiscountInput');
  if (discInp) discInp.value = '';
  const chargeInp = document.getElementById('coChargeInput');
  if (chargeInp) chargeInp.value = '';

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

export function closeGlobalCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.classList.remove('active');
  _checkoutItem = null;
}

export function showGlobalToast(msg, isError = false) {
  const toast = document.getElementById('toastNotice');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  if (toastIcon) toastIcon.className = isError ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check';
  toast.className = `toast-notice show ${isError ? 'danger' : 'success'}`;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3200);
}

export function setupCheckoutModalEvents(onSuccess = null) {
  if (onSuccess) _onCheckoutSuccessCallback = onSuccess;
  const checkoutModal = document.getElementById('checkoutModal');
  if (!checkoutModal) return;

  const closeBtn = document.getElementById('closeCheckoutBtn');
  const cancelBtn = document.getElementById('cancelCheckoutBtn');
  const overlay = document.getElementById('checkoutModalOverlay');
  if (closeBtn) closeBtn.onclick = closeGlobalCheckoutModal;
  if (cancelBtn) cancelBtn.onclick = closeGlobalCheckoutModal;
  if (overlay) overlay.onclick = closeGlobalCheckoutModal;

  const minusBtn = document.getElementById('coQtyMinus');
  const plusBtn = document.getElementById('coQtyPlus');
  const qtyInp = document.getElementById('coQtyInput');
  const discInp = document.getElementById('coDiscountInput');
  const chargeInp = document.getElementById('coChargeInput');
  const btnApplyDiscount = document.getElementById('btnApplyDiscount');
  const btnApplyCharge = document.getElementById('btnApplyCharge');
  const payModeCash = document.getElementById('payModeCash');
  const payModeCredit = document.getElementById('payModeCredit');
  const confirmBtn = document.getElementById('confirmCheckoutBtn');

  if (payModeCash) payModeCash.onclick = () => setPayMode('cash');
  if (payModeCredit) payModeCredit.onclick = () => setPayMode('credit');

  if (btnApplyDiscount) {
    btnApplyDiscount.onclick = () => {
      updateCheckoutSummary();
      showGlobalToast('Discount applied to summary');
    };
  }
  if (btnApplyCharge) {
    btnApplyCharge.onclick = () => {
      updateCheckoutSummary();
      showGlobalToast('Additional charge added to summary');
    };
  }

  if (minusBtn && qtyInp) {
    minusBtn.onclick = () => {
      const val = Math.max(1, parseInt(qtyInp.value) - 1);
      qtyInp.value = val;
      minusBtn.disabled = val <= 1;
      if (plusBtn) plusBtn.disabled = _checkoutItem && val >= Number(_checkoutItem.stocks);
      updateCheckoutSummary();
    };
  }

  if (plusBtn && qtyInp) {
    plusBtn.onclick = () => {
      const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
      const val = Math.min(max, parseInt(qtyInp.value) + 1);
      qtyInp.value = val;
      if (minusBtn) minusBtn.disabled = val <= 1;
      plusBtn.disabled = val >= max;
      updateCheckoutSummary();
    };
  }

  if (qtyInp) {
    qtyInp.oninput = () => {
      const max = _checkoutItem ? Number(_checkoutItem.stocks) : 1;
      let val = parseInt(qtyInp.value) || 1;
      val = Math.max(1, Math.min(val, max));
      qtyInp.value = val;
      if (minusBtn) minusBtn.disabled = val <= 1;
      if (plusBtn) plusBtn.disabled = val >= max;
      updateCheckoutSummary();
    };
  }

  if (discInp) discInp.oninput = updateCheckoutSummary;
  if (chargeInp) chargeInp.oninput = updateCheckoutSummary;

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (!_checkoutItem) return;
      const qtyInp = document.getElementById('coQtyInput');
      const qty = parseInt(qtyInp ? qtyInp.value : 1) || 1;
      const price = Number(_checkoutItem.price) || 0;
      const subtotal = qty * price;
      const isCredit = _payMode === 'credit';
      const paymentStatus = isCredit ? 'unpaid' : 'paid';

      let discountAmt = 0;
      let chargeAmt = 0;
      let total = subtotal;

      const discInp = document.getElementById('coDiscountInput');
      const chargeInp = document.getElementById('coChargeInput');

      if (isCredit) {
        chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
        total = subtotal + chargeAmt;
      } else {
        const rawDisc = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
        discountAmt = Math.min(rawDisc, subtotal);
        total = Math.max(0, subtotal - discountAmt);
      }

      const currentStock = Number(_checkoutItem.stocks) || 0;
      if (qty > currentStock) {
        showGlobalToast(`Cannot checkout ${qty} units. Only ${currentStock} in stock.`, true);
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

      // 1. Deduct stock locally
      const allStocks = [...getGlobalStocks()];
      const idx = allStocks.findIndex(s => String(s.id) === String(_checkoutItem.id));
      if (idx !== -1) {
        allStocks[idx].stocks = Math.max(0, Number(allStocks[idx].stocks) - qty);
        allStocks[idx].updatedAt = new Date().toISOString();
        saveGlobalStocks(allStocks);
      }

      // 2. Insert into Supabase
      try {
        const notes = isCredit 
          ? `Credit Sale (Charge: ₱${chargeAmt.toFixed(2)})` 
          : (discountAmt > 0 ? `Cash Sale (Discount: ₱${discountAmt.toFixed(2)})` : 'Cash Sale');

        const { data: txn, error: txnErr } = await supabase
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

        if (txn && !txnErr) {
          const isStkLocalId = String(_checkoutItem.id).startsWith('stk_');
          await supabase.from('transaction_items').insert([{
            transaction_id: txn.id,
            stock_item_id: isStkLocalId ? null : _checkoutItem.id,
            product_name: _checkoutItem.name,
            batch: _checkoutItem.batch || '',
            unit_price: price,
            quantity: qty,
            item_discount: discountAmt
          }]);
        }

        if (!String(_checkoutItem.id).startsWith('stk_') && idx !== -1) {
          await supabase
            .from('stock_items')
            .update({ quantity: allStocks[idx].stocks })
            .eq('id', _checkoutItem.id);
        }
      } catch (err) {
        console.warn('Supabase checkout fallback:', err);
      }

      // 3. Local transactions log
      let txns = [];
      try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
      txns.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        productId: _checkoutItem.id,
        productName: _checkoutItem.name,
        batch: _checkoutItem.batch || '',
        qty,
        unitPrice: price,
        subtotal,
        discount: discountAmt,
        charge: chargeAmt,
        total,
        type: 'sale',
        paymentStatus,
        payMode: _payMode
      });
      localStorage.setItem('inv_transactions', JSON.stringify(txns));

      const itemName = _checkoutItem.name;
      const modeLabel = isCredit ? 'Credit' : 'Cash';
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submit Checkout';

      closeGlobalCheckoutModal();
      renderGlobalSidebarStocks();
      showGlobalToast(`Checkout done! ${itemName} ×${qty} — ${currency(total)} (${modeLabel})`);

      if (typeof _onCheckoutSuccessCallback === 'function') {
        _onCheckoutSuccessCallback();
      }
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.classList.contains('active')) closeGlobalCheckoutModal();
  });
}
