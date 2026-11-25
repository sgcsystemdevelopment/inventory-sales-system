/**
 * Global Checkout & Stocks Module — Inventory & Sales System
 * Standardized across Dashboard, Inventory, Expenses, Transactions, User Management, and Settings.
 * Design and Develop by: danpastolero
 */

import { supabase } from './supabaseClient.js';

let _checkoutItem = null;
let _payMode = 'cash'; // 'cash' | 'credit'
let _onCheckoutSuccessCallback = null;
let _isCheckingOut = false;

export function cleanLocalTxns() {
  try {
    const raw = localStorage.getItem('inv_transactions');
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length <= 1) return;
    const seen = new Set();
    const deduped = [];
    for (const item of list) {
      const minute = item.date ? item.date.slice(0, 16) : '';
      const key = `${minute}_${item.total}_${item.paymentStatus}_${item.productName || ''}_${item.notes || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    if (deduped.length !== list.length) {
      localStorage.setItem('inv_transactions', JSON.stringify(deduped));
    }
  } catch(e) {}
}

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
  const totalLabelEl = document.getElementById('coTotalLabel');
  const totalEl = document.getElementById('coGrandTotal');

  if (_payMode === 'credit') {
    const chargeInp = document.getElementById('coChargeInput');
    const chargeAmt = Math.max(0, parseFloat(chargeInp ? chargeInp.value : 0) || 0);
    const total = subtotal + chargeAmt;

    if (chargeRow) chargeRow.style.display = 'flex';
    if (discountRow) discountRow.style.display = 'none';
    if (chargeValEl) chargeValEl.textContent = '+' + currency(chargeAmt);
    if (totalLabelEl) totalLabelEl.textContent = 'Total (Credit)';
    if (totalEl) totalEl.textContent = currency(total);
  } else {
    const discInp = document.getElementById('coDiscountInput');
    const discVal = Math.max(0, parseFloat(discInp ? discInp.value : 0) || 0);
    const discountAmt = Math.min(discVal, subtotal);
    const total = Math.max(0, subtotal - discountAmt);

    if (chargeRow) chargeRow.style.display = 'none';
    if (discountRow) discountRow.style.display = 'flex';
    if (discValEl) discValEl.textContent = '-' + currency(discountAmt);
    if (totalLabelEl) totalLabelEl.textContent = 'Total';
    if (totalEl) totalEl.textContent = currency(total);
  }
}

export function setPayMode(mode) {
  _payMode = mode;
  const payModeCash = document.getElementById('payModeCash');
  const payModeCredit = document.getElementById('payModeCredit');
  const cashSection = document.getElementById('cashSection');
  const creditSection = document.getElementById('creditSection');

  if (payModeCash) payModeCash.classList.toggle('active', mode === 'cash');
  if (payModeCredit) payModeCredit.classList.toggle('active', mode === 'credit');

  if (cashSection) cashSection.style.display = mode === 'cash' ? 'block' : 'none';
  if (creditSection) creditSection.style.display = mode === 'credit' ? 'block' : 'none';

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

  let _pendingCreditCheckout = null;

  function openCreditPartialModal(data) {
    _pendingCreditCheckout = data;
    const cpModal = document.getElementById('creditPartialModal');
    const cpTotal = document.getElementById('cpModalTotalCredit');
    const cpSoldTo = document.getElementById('cpModalSoldTo');
    const cpInput = document.getElementById('cpPartialPaymentInput');
    const cpPaid = document.getElementById('cpPaidAmount');
    const cpUnpaid = document.getElementById('cpUnpaidAmount');

    if (cpTotal) cpTotal.textContent = currency(data.total);
    if (cpSoldTo) cpSoldTo.textContent = data.soldToVal || '—';
    if (cpInput) {
      cpInput.value = '';
      cpInput.max = data.total;
    }
    if (cpPaid) cpPaid.textContent = currency(0);
    if (cpUnpaid) cpUnpaid.textContent = currency(data.total);

    if (checkoutModal) checkoutModal.classList.remove('active');
    if (cpModal) cpModal.classList.add('active');
  }

  function closeCreditPartialModal(returnToCheckout = false) {
    const cpModal = document.getElementById('creditPartialModal');
    if (cpModal) cpModal.classList.remove('active');
    if (returnToCheckout) {
      if (checkoutModal) checkoutModal.classList.add('active');
    } else {
      _pendingCreditCheckout = null;
      closeGlobalCheckoutModal();
    }
  }

  function updateCreditPartialCalculation() {
    if (!_pendingCreditCheckout) return;
    const total = _pendingCreditCheckout.total;
    const cpInput = document.getElementById('cpPartialPaymentInput');
    const cpPaid = document.getElementById('cpPaidAmount');
    const cpUnpaid = document.getElementById('cpUnpaidAmount');

    let val = parseFloat(cpInput ? cpInput.value : 0) || 0;
    if (val < 0) val = 0;
    if (val > total) val = total;
    const paid = val;
    const unpaid = Math.max(0, total - paid);

    if (cpPaid) cpPaid.textContent = currency(paid);
    if (cpUnpaid) cpUnpaid.textContent = currency(unpaid);
  }

  const proceedCpBtn = document.getElementById('proceedCreditPartialBtn');
  const cancelCpBtn = document.getElementById('cancelCreditPartialBtn');
  const closeCpBtn = document.getElementById('closeCreditPartialBtn');
  const cpOverlay = document.getElementById('creditPartialModalOverlay');
  const cpInput = document.getElementById('cpPartialPaymentInput');

  if (cpInput) cpInput.oninput = updateCreditPartialCalculation;
  if (cancelCpBtn) cancelCpBtn.onclick = () => closeCreditPartialModal(true);
  if (closeCpBtn) closeCpBtn.onclick = () => closeCreditPartialModal(true);
  if (cpOverlay) cpOverlay.onclick = () => closeCreditPartialModal(true);

  if (proceedCpBtn) {
    proceedCpBtn.onclick = () => {
      if (!_pendingCreditCheckout) return;
      const data = _pendingCreditCheckout;
      const total = data.total;
      let rawVal = parseFloat(cpInput ? cpInput.value : 0) || 0;
      if (rawVal < 0) rawVal = 0;
      if (rawVal > total) rawVal = total;
      const partialAmt = rawVal;
      const remainingAmt = Math.max(0, total - partialAmt);

      executeFinalCheckout({
        ...data,
        isCredit: true,
        partialAmt,
        remainingAmt
      });
      closeCreditPartialModal(false);
    };
  }

  function executeFinalCheckout(data) {
    const {
      qty, price, subtotal, discountAmt, chargeAmt, total,
      soldToVal, customerNote, itemName, checkoutItemId, checkoutItemBatch,
      idx, allStocks, isCredit, partialAmt, remainingAmt
    } = data;

    // 1. Instant local stock deduction
    if (idx !== -1) {
      allStocks[idx].stocks = Math.max(0, Number(allStocks[idx].stocks) - qty);
      allStocks[idx].updatedAt = new Date().toISOString();
      saveGlobalStocks(allStocks);
    }

    const nowIso = new Date().toISOString();
    const baseDate = nowIso.slice(0, 10).replace(/-/g, '');
    let txns = [];
    try { txns = JSON.parse(localStorage.getItem('inv_transactions') || '[]'); } catch (e) {}

    // Dual recording if partial payment is made for credit
    if (isCredit && partialAmt > 0 && remainingAmt > 0) {
      const localTxnId1 = Date.now();
      const localRef1 = 'TXN-' + baseDate + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const note1 = (chargeAmt > 0 ? `Credit Sale - Downpayment (Charge: ₱${chargeAmt.toFixed(2)})` : 'Credit Sale - Downpayment') + ` (Paid: ₱${partialAmt.toFixed(2)} of ₱${total.toFixed(2)})` + customerNote;

      const localTxnId2 = localTxnId1 + 5;
      const localRef2 = 'TXN-' + baseDate + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const note2 = 'Credit Sale - Remaining Balance' + ` (Unpaid: ₱${remainingAmt.toFixed(2)} of ₱${total.toFixed(2)})` + customerNote;

      // Remaining balance recorded as UNPAID
      txns.unshift({
        id: localTxnId2,
        ref: localRef2,
        date: nowIso,
        productId: checkoutItemId,
        productName: itemName,
        batch: checkoutItemBatch,
        customer: soldToVal,
        soldTo: soldToVal,
        qty,
        unitPrice: price,
        subtotal: remainingAmt,
        discount: 0,
        charge: chargeAmt,
        total: remainingAmt,
        type: 'sale',
        paymentStatus: 'unpaid',
        payMode: 'credit',
        notes: note2
      });

      // Partial payment recorded as PAID
      txns.unshift({
        id: localTxnId1,
        ref: localRef1,
        date: nowIso,
        productId: checkoutItemId,
        productName: itemName,
        batch: checkoutItemBatch,
        customer: soldToVal,
        soldTo: soldToVal,
        qty,
        unitPrice: price,
        subtotal: partialAmt,
        discount: 0,
        charge: 0,
        total: partialAmt,
        type: 'sale',
        paymentStatus: 'paid',
        payMode: 'credit',
        notes: note1
      });

      localStorage.setItem('inv_transactions', JSON.stringify(txns));

      closeGlobalCheckoutModal();
      renderGlobalSidebarStocks();
      showGlobalToast(`Credit checkout done! Paid: ${currency(partialAmt)} | Unpaid: ${currency(remainingAmt)}`);

      if (typeof _onCheckoutSuccessCallback === 'function') {
        _onCheckoutSuccessCallback();
      }

      // Background sync to Supabase
      (async () => {
        try {
          const isStkLocalId = String(checkoutItemId).startsWith('stk_');
          const txn1Promise = supabase.from('transactions').insert([{
            reference_no: localRef1,
            type: 'sale',
            payment_status: 'paid',
            subtotal: partialAmt,
            discount: 0,
            total: partialAmt,
            notes: note1
          }]).select().single();

          const txn2Promise = supabase.from('transactions').insert([{
            reference_no: localRef2,
            type: 'sale',
            payment_status: 'unpaid',
            subtotal: remainingAmt,
            discount: 0,
            total: remainingAmt,
            notes: note2
          }]).select().single();

          const stockPromise = (!isStkLocalId && idx !== -1)
            ? supabase.from('stock_items').update({ quantity: allStocks[idx].stocks }).eq('id', checkoutItemId)
            : Promise.resolve();

          const [{ data: dbTxn1 }, { data: dbTxn2 }] = await Promise.all([txn1Promise, txn2Promise, stockPromise]);

          if (dbTxn1) {
            await supabase.from('transaction_items').insert([{
              transaction_id: dbTxn1.id,
              stock_item_id: isStkLocalId ? null : checkoutItemId,
              product_name: itemName + ' (Downpayment)',
              batch: checkoutItemBatch,
              unit_price: partialAmt,
              quantity: 1,
              item_discount: 0
            }]);
          }
          if (dbTxn2) {
            await supabase.from('transaction_items').insert([{
              transaction_id: dbTxn2.id,
              stock_item_id: isStkLocalId ? null : checkoutItemId,
              product_name: itemName + ' (Remaining Balance)',
              batch: checkoutItemBatch,
              unit_price: remainingAmt,
              quantity: 1,
              item_discount: 0
            }]);
          }
        } catch (err) {
          console.warn('Supabase credit partial background sync:', err);
        }
      })();
      return;
    }

    // Single transaction
    const isFullPaidCredit = isCredit && partialAmt >= total;
    const paymentStatus = isCredit ? (isFullPaidCredit ? 'paid' : 'unpaid') : 'paid';
    const notes = isCredit
      ? (isFullPaidCredit
          ? 'Credit Sale - Paid in Full'
          : (chargeAmt > 0 ? `Credit Sale (Charge: ₱${chargeAmt.toFixed(2)})` : 'Credit Sale')) + customerNote
      : (discountAmt > 0 ? `Cash Sale (Discount: ₱${discountAmt.toFixed(2)})` : 'Cash Sale') + customerNote;

    const localTxnId = Date.now();
    const localRef = 'TXN-' + baseDate + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    txns.unshift({
      id: localTxnId,
      ref: localRef,
      date: nowIso,
      productId: checkoutItemId,
      productName: itemName,
      batch: checkoutItemBatch,
      customer: soldToVal,
      soldTo: soldToVal,
      qty,
      unitPrice: price,
      subtotal,
      discount: discountAmt,
      charge: chargeAmt,
      total,
      type: 'sale',
      paymentStatus,
      payMode: isCredit ? 'credit' : 'cash',
      notes
    });
    localStorage.setItem('inv_transactions', JSON.stringify(txns));

    const modeLabel = isCredit ? (isFullPaidCredit ? 'Credit (Paid)' : 'Credit (Unpaid)') : 'Cash';
    closeGlobalCheckoutModal();
    renderGlobalSidebarStocks();
    showGlobalToast(`Checkout done! ${itemName} ×${qty} — ${currency(total)} (${modeLabel})`);

    if (typeof _onCheckoutSuccessCallback === 'function') {
      _onCheckoutSuccessCallback();
    }

    (async () => {
      try {
        const isStkLocalId = String(checkoutItemId).startsWith('stk_');
        const txnPromise = supabase
          .from('transactions')
          .insert([{
            reference_no: localRef,
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
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (!_checkoutItem || _isCheckingOut) return;
      _isCheckingOut = true;
      setTimeout(() => { _isCheckingOut = false; }, 800);

      const qtyInp = document.getElementById('coQtyInput');
      const qty = parseInt(qtyInp ? qtyInp.value : 1) || 1;
      const price = Number(_checkoutItem.price) || 0;
      const subtotal = qty * price;
      const isCredit = _payMode === 'credit';

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
        _isCheckingOut = false;
        return;
      }

      const allStocks = [...getGlobalStocks()];
      const idx = allStocks.findIndex(s => String(s.id) === String(_checkoutItem.id));
      const soldToVal = (document.getElementById('coSoldToInput')?.value || '').trim();
      const customerNote = soldToVal ? ` | Sold to: ${soldToVal}` : '';
      const itemName = _checkoutItem.name;
      const checkoutItemId = _checkoutItem.id;
      const checkoutItemBatch = _checkoutItem.batch || '';

      const checkoutData = {
        qty, price, subtotal, discountAmt, chargeAmt, total,
        soldToVal, customerNote, itemName, checkoutItemId, checkoutItemBatch,
        idx, allStocks
      };

      if (isCredit) {
        openCreditPartialModal(checkoutData);
        return;
      }

      executeFinalCheckout({
        ...checkoutData,
        isCredit: false,
        partialAmt: 0,
        remainingAmt: 0
      });
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const cpModal = document.getElementById('creditPartialModal');
      if (cpModal && cpModal.classList.contains('active')) {
        closeCreditPartialModal(true);
      } else if (checkoutModal && checkoutModal.classList.contains('active')) {
        closeGlobalCheckoutModal();
      }
    }
  });
}
