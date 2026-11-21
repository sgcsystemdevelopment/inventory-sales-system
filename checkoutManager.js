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
    if (chargeValEl) chargeValEl.textContent = '+' + currency(chargeAmt);
    if (totalLabelEl) totalLabelEl.textContent = 'Total (Credit)';
    if (totalEl) totalEl.textContent = currency(total);
  } else if (_payMode === 'partial') {
    const partialInp = document.getElementById('coPartialInput');
    const rawPartial = Math.max(0, parseFloat(partialInp ? partialInp.value : 0) || 0);
    const partialAmt = Math.min(rawPartial, subtotal);
    const remainingCredit = Math.max(0, subtotal - partialAmt);

    if (chargeRow) chargeRow.style.display = 'none';
    if (discountRow) discountRow.style.display = 'none';
    if (partialRow) partialRow.style.display = 'flex';
    if (partialValEl) partialValEl.textContent = '-' + currency(partialAmt);
    if (totalLabelEl) totalLabelEl.textContent = 'Remaining Unpaid';
    if (totalEl) totalEl.textContent = currency(remainingCredit);
  } else {
    const discInp = document.getElementById('coDiscountInput');
    const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
    const discountAmt = Math.min(discVal, subtotal);
    const total = Math.max(0, subtotal - discountAmt);

    if (chargeRow) chargeRow.style.display = 'none';
    if (discountRow) discountRow.style.display = 'flex';
    if (partialRow) partialRow.style.display = 'none';
    if (discValEl) discValEl.textContent = '-' + currency(discountAmt);
    if (totalLabelEl) totalLabelEl.textContent = 'Total';
    if (totalEl) totalEl.textContent = currency(total);
  }
}

export function setPayMode(mode) {
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
  const btnApplyPartial = document.getElementById('btnApplyPartial');
  const payModeCash = document.getElementById('payModeCash');
  const payModeCredit = document.getElementById('payModeCredit');
  const payModePartial = document.getElementById('payModePartial');
  const confirmBtn = document.getElementById('confirmCheckoutBtn');

  if (payModeCash) payModeCash.onclick = () => setPayMode('cash');
  if (payModeCredit) payModeCredit.onclick = () => setPayMode('credit');
  if (payModePartial) payModePartial.onclick = () => setPayMode('partial');

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
  if (btnApplyPartial) {
    btnApplyPartial.onclick = () => {
      updateCheckoutSummary();
      showGlobalToast('Partial payment applied to summary');
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

  const partialInp = document.getElementById('coPartialInput');
  if (discInp) discInp.oninput = updateCheckoutSummary;
  if (chargeInp) chargeInp.oninput = updateCheckoutSummary;
  if (partialInp) partialInp.oninput = updateCheckoutSummary;

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (!_checkoutItem) return;
      const qtyInp = document.getElementById('coQtyInput');
      const qty = parseInt(qtyInp ? qtyInp.value : 1) || 1;
      const price = Number(_checkoutItem.price) || 0;
      const subtotal = qty * price;
      const isCredit = _payMode === 'credit';
      const isPartial = _payMode === 'partial';
      const paymentStatus = (isCredit || isPartial) ? 'unpaid' : 'paid';

      let discountAmt = 0;
      let chargeAmt = 0;
      let partialAmt = 0;
      let total = subtotal;

      const discInp = document.getElementById('coDiscountInput');
      const chargeInp = document.getElementById('coChargeInput');
      const partialInp = document.getElementById('coPartialInput');

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

      const currentStock = Number(_checkoutItem.stocks) || 0;
      if (qty > currentStock) {
        showGlobalToast(`Cannot checkout ${qty} units. Only ${currentStock} in stock.`, true);
        return;
      }

      // 1. Instant local stock deduction
      const allStocks = [...getGlobalStocks()];
      const idx = allStocks.findIndex(s => String(s.id) === String(_checkoutItem.id));
      if (idx !== -1) {
        allStocks[idx].stocks = Math.max(0, Number(allStocks[idx].stocks) - qty);
        allStocks[idx].updatedAt = new Date().toISOString();
        saveGlobalStocks(allStocks);
      }

      // 2. Instant local transaction log
      const soldToVal = (document.getElementById('coSoldToInput')?.value || '').trim();
      const customerNote = soldToVal ? ` | Sold to: ${soldToVal}` : '';
      const notes = (isCredit 
        ? (chargeAmt > 0 ? `Credit Sale (Charge: ₱${chargeAmt.toFixed(2)})` : 'Credit Sale')
        : isPartial
        ? `Partial Sale (Paid: ₱${partialAmt.toFixed(2)}, Remaining Balance: ₱${total.toFixed(2)})`
        : (discountAmt > 0 ? `Cash Sale (Discount: ₱${discountAmt.toFixed(2)})` : 'Cash Sale')) + customerNote;

      let txns = [];
      try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}
      txns.unshift({
        id: Date.now(),
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

      closeGlobalCheckoutModal();
      renderGlobalSidebarStocks();
      showGlobalToast(`Checkout done! ${itemName} ×${qty} — ${currency(total)} (${modeLabel})`);

      if (typeof _onCheckoutSuccessCallback === 'function') {
        _onCheckoutSuccessCallback();
      }

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
            ? supabase.from('stock_items').update({ quantity: allStocks[idx].stocks }).eq('id', checkoutItemId)
            : Promise.resolve();

          const [{ data: txn, error: txnErr }] = await Promise.all([txnPromise, stockPromise]);

          if (txn && !txnErr) {
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
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.classList.contains('active')) closeGlobalCheckoutModal();
  });
}
