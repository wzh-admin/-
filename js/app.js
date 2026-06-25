var App = {
  currentView: 'dashboard',
  formData: { type: 'expense', amount: '', category: '', note: '', date: '' },
  listFilter: 'all',
  editId: null,

  categories: {
    income: [
      { id: 'salary', name: '\u5de5\u8d44', emoji: '\ud83d\udcb0' },
      { id: 'parttime', name: '\u517c\u804c', emoji: '\ud83d\udcbc' },
      { id: 'invest', name: '\u6295\u8d44', emoji: '\ud83d\udcc8' },
      { id: 'redpacket', name: '\u7ea2\u5305', emoji: '\ud83e\udde7' },
      { id: 'refund', name: '\u9000\u6b3e', emoji: '\u21a9\ufe0f' },
      { id: 'finance', name: '\u7406\u8d22', emoji: '\ud83d\udcb9' },
      { id: 'reimburse', name: '\u62a5\u9500', emoji: '\ud83d\udccb' },
      { id: 'bonus', name: '\u5956\u91d1', emoji: '\ud83c\udf81' },
      { id: 'side', name: '\u526f\u4e1a', emoji: '\ud83d\udd27' },
      { id: 'other_income', name: '\u5176\u4ed6', emoji: '\ud83d\udcb5' }
    ],
    expense: [
      { id: 'food', name: '\u9910\u996e', emoji: '\ud83c\udf5c' },
      { id: 'transport', name: '\u4ea4\u901a', emoji: '\ud83d\ude8c' },
      { id: 'shopping', name: '\u8d2d\u7269', emoji: '\ud83d\uded2' },
      { id: 'housing', name: '\u4f4f\u623f', emoji: '\ud83c\udfe0' },
      { id: 'entertain', name: '\u5a31\u4e50', emoji: '\ud83c\udfae' },
      { id: 'medical', name: '\u533b\u7597', emoji: '\ud83c\udfe5' },
      { id: 'education', name: '\u6559\u80b2', emoji: '\ud83d\udcda' },
      { id: 'phone', name: '\u901a\u8baf', emoji: '\ud83d\udcf1' },
      { id: 'clothing', name: '\u670d\u9970', emoji: '\ud83d\udc57' },
      { id: 'daily', name: '\u65e5\u7528\u54c1', emoji: '\ud83e\uddf4' },
      { id: 'social', name: '\u4eba\u60c5', emoji: '\ud83c\udf89' },
      { id: 'pet', name: '\u5ba0\u7269', emoji: '\ud83d\udc31' },
      { id: 'beauty', name: '\u7f8e\u5bb9', emoji: '\ud83d\udc84' },
      { id: 'travel', name: '\u65c5\u884c', emoji: '\u2708\ufe0f' },
      { id: 'other_expense', name: '\u5176\u4ed6', emoji: '\ud83d\udcb8' }
    ]
  },

  getCategory: function(type, id) {
    var list = this.categories[type] || [];
    return list.find(function(c) { return c.id === id; });
  },

  todayStr: function() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  },

  escapeHtml: function(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  navigate: function(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    var target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    var navItem = document.querySelector('[data-nav="' + view + '"]');
    if (navItem) navItem.classList.add('active');
    if (view === 'dashboard') this.renderDashboard();
    else if (view === 'calendar') this.renderCalendar();
    else if (view === 'transactions') this.renderTransactionList();
    else if (view === 'add') this.resetForm();
    var fab = document.getElementById('fab');
    fab.style.display = (view === 'add') ? 'none' : 'flex';
  },

  toast: function(msg, type) {
    type = type || 'success';
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function() {
      el.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(function() { el.remove(); }, 300);
    }, 1800);
  },

  confirm: function(title, text, icon) {
    icon = icon || '\ud83d\uddd1\ufe0f';
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML =
        '<div class="dialog">' +
          '<div class="dialog__icon">' + icon + '</div>' +
          '<div class="dialog__title">' + title + '</div>' +
          '<div class="dialog__text">' + text + '</div>' +
          '<div class="dialog__actions">' +
            '<button class="dialog__btn dialog__btn--cancel">\u53d6\u6d88</button>' +
            '<button class="dialog__btn dialog__btn--confirm">\u786e\u8ba4</button>' +
          '</div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector('.dialog__btn--cancel').addEventListener('click', function() { overlay.remove(); resolve(false); });
      overlay.querySelector('.dialog__btn--confirm').addEventListener('click', function() { overlay.remove(); resolve(true); });
      overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  },

  resetForm: function() {
    this.editId = null;
    this.formData = { type: 'expense', amount: '', category: '', note: '', date: this.todayStr() };
    this.renderAddForm();
  },

  /* Dashboard */
  renderDashboard: async function() {
    var self = this, container = document.getElementById('view-dashboard');
    var now = new Date(), monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var results = await Promise.all([getBalance(), getMonthBalance(monthKey), getTransactions({})]);
    var balance = results[0], monthBalance = results[1], recentTxs = results[2];
    var recent = recentTxs.slice(0, 8);

    container.innerHTML =
      '<div class="balance-card">' +
        '<div class="balance-card__label">\u5f53\u524d\u4f59\u989d</div>' +
        '<div class="balance-card__amount">\u00a5' + balance.balance.toFixed(2) + '</div>' +
        '<div class="balance-card__detail">' +
          '<span>\ud83d\udcb0 \u6536\u5165 \u00a5' + balance.income.toFixed(2) + '</span>' +
          '<span>\ud83d\udcb8 \u652f\u51fa \u00a5' + balance.expense.toFixed(2) + '</span>' +
        '</div></div>' +
      '<div class="summary-row">' +
        '<div class="summary-card summary-card--income">' +
          '<div class="summary-card__icon">\ud83d\udcc8</div>' +
          '<div class="summary-card__label">\u672c\u6708\u6536\u5165</div>' +
          '<div class="summary-card__amount">\u00a5' + monthBalance.income.toFixed(2) + '</div></div>' +
        '<div class="summary-card summary-card--expense">' +
          '<div class="summary-card__icon">\ud83d\udcc9</div>' +
          '<div class="summary-card__label">\u672c\u6708\u652f\u51fa</div>' +
          '<div class="summary-card__amount">\u00a5' + monthBalance.expense.toFixed(2) + '</div></div></div>' +
      '<div class="section-header">' +
        '<span class="section-header__title">\ud83d\udccb \u6700\u8fd1\u8bb0\u5f55</span>' +
        '<span class="section-header__link" data-nav="transactions">\u67e5\u770b\u5168\u90e8 \u2192</span></div>' +
      '<div id="recentTxList">' +
        (recent.length === 0
          ? '<div class="empty-state"><div class="empty-state__emoji">\ud83d\udcdd</div><div class="empty-state__text">\u8fd8\u6ca1\u6709\u8bb0\u8d26\u8bb0\u5f55\u54e6~<br>\u70b9\u51fb + \u5f00\u59cb\u8bb0\u8d26\u5427</div></div>'
          : recent.map(function(tx) { return self.renderTxItem(tx); }).join('')) +
      '</div>';

    container.querySelector('[data-nav="transactions"]') && container.querySelector('[data-nav="transactions"]').addEventListener('click', function() { self.navigate('transactions'); });
    this.attachTxItemEvents(container);
  },

  renderTxItem: function(tx) {
    var cat = this.getCategory(tx.type, tx.category);
    var emoji = cat ? cat.emoji : '\u2753';
    var name = cat ? cat.name : tx.category;
    var sign = tx.type === 'income' ? '+' : '-';
    var cls = tx.type === 'income' ? 'tx-item--income' : 'tx-item--expense';
    var dateDisplay = tx.date.slice(5);
    return '<div class="tx-item ' + cls + '" data-id="' + tx.id + '">' +
      '<div class="tx-item__icon">' + emoji + '</div>' +
      '<div class="tx-item__info"><div class="tx-item__category">' + name + '</div>' +
      (tx.note ? '<div class="tx-item__note">' + this.escapeHtml(tx.note) + '</div>' : '') + '</div>' +
      '<div class="tx-item__right"><div class="tx-item__amount">' + sign + '\u00a5' + tx.amount.toFixed(2) + '</div>' +
      '<div class="tx-item__date">' + dateDisplay + '</div></div>' +
      '<button class="tx-item__delete" data-delete="' + tx.id + '">\u2715</button></div>';
  },

  attachTxItemEvents: function(container) {
    var self = this;
    container.querySelectorAll('[data-delete]').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        e.stopPropagation();
        var id = Number(btn.dataset.delete);
        var ok = await self.confirm('\u5220\u9664\u8bb0\u5f55', '\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u6761\u8bb0\u5f55\u5417\uff1f');
        if (ok) { await deleteTransaction(id); self.toast('\u5df2\u5220\u9664'); self.refreshCurrentView(); }
      });
    });
  },

  /* Add Form */
  renderAddForm: function() {
    var self = this, container = document.getElementById('view-add');
    var fd = this.formData, isIncome = fd.type === 'income';

    container.innerHTML =
      '<div class="form-group"><label class="form-label">\u7c7b\u578b</label>' +
        '<div class="type-toggle">' +
          '<button class="type-toggle__btn ' + (isIncome ? 'active--income' : '') + '" data-type="income">\ud83d\udcb0 \u6536\u5165</button>' +
          '<button class="type-toggle__btn ' + (!isIncome ? 'active--expense' : '') + '" data-type="expense">\ud83d\udcb8 \u652f\u51fa</button>' +
        '</div></div>' +
      '<div class="form-group"><label class="form-label">\u91d1\u989d</label>' +
        '<div class="amount-input-wrap"><span class="currency">\u00a5</span>' +
          '<input type="number" id="inputAmount" placeholder="0.00" value="' + fd.amount + '" step="0.01" min="0.01" inputmode="decimal">' +
        '</div></div>' +
      '<div class="form-group"><label class="form-label">\u5206\u7c7b</label>' +
        '<div class="category-grid" id="categoryGrid">' + this.renderCategoryChips() + '</div></div>' +
      '<div class="form-group"><label class="form-label">\u5907\u6ce8</label>' +
        '<input class="note-input" id="inputNote" placeholder="\u6dfb\u52a0\u5907\u6ce8..." value="' + this.escapeHtml(fd.note) + '" maxlength="50"></div>' +
      '<div class="form-group"><label class="form-label">\u65e5\u671f</label>' +
        '<input type="date" class="date-input" id="inputDate" value="' + fd.date + '"></div>' +
      '<button class="btn-primary ' + (isIncome ? 'btn-primary--income' : 'btn-primary--expense') + '" id="btnSave">' +
        (this.editId ? '\ud83d\udcbe \u66f4\u65b0\u8bb0\u5f55' : '\u2705 \u6dfb\u52a0\u8bb0\u5f55') + '</button>' +
      (this.editId ? '<button class="btn-primary btn-primary--expense" id="btnCancelEdit" style="margin-top:10px;background:var(--text-light)">\u53d6\u6d88\u7f16\u8f91</button>' : '');

    this.attachFormEvents(container);
  },

  renderCategoryChips: function() {
    var self = this, cats = this.categories[this.formData.type];
    return cats.map(function(c) {
      var sel = c.id === self.formData.category
        ? (self.formData.type === 'income' ? 'selected--income' : 'selected--expense') : '';
      return '<button class="category-chip ' + sel + '" data-cat="' + c.id + '">' +
        '<span class="cat-emoji">' + c.emoji + '</span><span>' + c.name + '</span></button>';
    }).join('');
  },

  attachFormEvents: function(container) {
    var self = this;
    container.querySelectorAll('[data-type]').forEach(function(btn) {
      btn.addEventListener('click', function() { self.formData.type = btn.dataset.type; self.formData.category = ''; self.renderAddForm(); });
    });
    container.querySelectorAll('[data-cat]').forEach(function(btn) {
      btn.addEventListener('click', function() { self.formData.category = btn.dataset.cat; self.renderAddForm(); });
    });
    var amountInput = container.querySelector('#inputAmount');
    if (amountInput) { amountInput.addEventListener('input', function() { self.formData.amount = amountInput.value; }); amountInput.addEventListener('focus', function() { if (!amountInput.value) amountInput.value = ''; }); }
    var noteInput = container.querySelector('#inputNote');
    if (noteInput) noteInput.addEventListener('input', function() { self.formData.note = noteInput.value; });
    var dateInput = container.querySelector('#inputDate');
    if (dateInput) dateInput.addEventListener('input', function() { self.formData.date = dateInput.value; });
    var saveBtn = container.querySelector('#btnSave');
    if (saveBtn) saveBtn.addEventListener('click', function() { self.saveTransaction(); });
    var cancelBtn = container.querySelector('#btnCancelEdit');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { self.resetForm(); });
  },

  saveTransaction: async function() {
    var amount = parseFloat(this.formData.amount);
    if (!amount || amount <= 0) { this.toast('\u8bf7\u8f93\u5165\u6709\u6548\u91d1\u989d', 'error'); return; }
    if (!this.formData.category) { this.toast('\u8bf7\u9009\u62e9\u5206\u7c7b', 'error'); return; }
    try {
      if (this.editId) {
        await updateTransaction(this.editId, { type: this.formData.type, amount: amount, category: this.formData.category, note: this.formData.note, date: this.formData.date });
        this.toast('\u8bb0\u5f55\u5df2\u66f4\u65b0 \u2728');
      } else {
        await addTransaction({ type: this.formData.type, amount: amount, category: this.formData.category, note: this.formData.note, date: this.formData.date });
        this.toast('\u8bb0\u8d26\u6210\u529f \ud83c\udf89');
      }
      this.resetForm();
      this.navigate('dashboard');
    } catch(e) { this.toast('\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5', 'error'); }
  },

  /* Calendar */
  renderCalendar: async function() {
    await Calendar.render(document.getElementById('view-calendar'));
  },

  /* Transaction List */
  renderTransactionList: async function() {
    var self = this, container = document.getElementById('view-transactions');
    container.innerHTML =
      '<div class="filter-bar">' +
        '<button class="filter-chip ' + (this.listFilter === 'all' ? 'active' : '') + '" data-filter="all">\u5168\u90e8</button>' +
        '<button class="filter-chip ' + (this.listFilter === 'income' ? 'active' : '') + '" data-filter="income">\ud83d\udcb0 \u6536\u5165</button>' +
        '<button class="filter-chip ' + (this.listFilter === 'expense' ? 'active' : '') + '" data-filter="expense">\ud83d\udcb8 \u652f\u51fa</button>' +
      '</div><div id="txListContent"></div>';
    container.querySelectorAll('[data-filter]').forEach(function(btn) {
      btn.addEventListener('click', function() { self.listFilter = btn.dataset.filter; self.renderTransactionList(); });
    });
    var txs = await getTransactions({ type: this.listFilter });
    this.renderGroupedList(txs);
  },

  renderGroupedList: function(txs) {
    var self = this, content = document.getElementById('txListContent');
    if (txs.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state__emoji">\ud83d\udced</div><div class="empty-state__text">\u6682\u65e0\u8bb0\u5f55</div></div>';
      return;
    }
    var groups = {};
    txs.forEach(function(tx) { var m = tx.date.slice(0, 7); if (!groups[m]) groups[m] = []; groups[m].push(tx); });
    var html = '';
    Object.entries(groups).forEach(function(entry) {
      var month = entry[0], items = entry[1];
      var mIncome = 0, mExpense = 0;
      items.forEach(function(tx) { if (tx.type === 'income') mIncome += tx.amount; else mExpense += tx.amount; });
      var parts = month.split('-');
      html += '<div class="month-group"><div class="month-group__header">' +
        '<span>\ud83d\udcc5 ' + parts[0] + '\u5e74' + parseInt(parts[1]) + '\u6708 \u00b7 ' + items.length + '\u7b14</span>' +
        '<span>' +
          (mIncome > 0 ? '<span class="month-group__total--income">\u6536 \u00a5' + mIncome.toFixed(2) + '</span>' : '') +
          (mExpense > 0 ? '<span class="month-group__total--expense">' + (mIncome > 0 ? ' ' : '') + '\u652f \u00a5' + mExpense.toFixed(2) + '</span>' : '') +
        '</span></div>' +
        items.map(function(tx) { return self.renderTxItem(tx); }).join('') + '</div>';
    });
    content.innerHTML = html;
    this.attachTxItemEvents(content);
  },

  /* Export/Import */
  exportData: async function() {
    var data = await exportData();
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'xiaolv-backup-' + this.todayStr() + '.json'; a.click();
    URL.revokeObjectURL(url);
    this.toast('\u6570\u636e\u5df2\u5bfc\u51fa \ud83d\udce6');
  },

  importData: function() {
    var self = this;
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', async function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var ok = await self.confirm('\u5bfc\u5165\u6570\u636e', '\u5bfc\u5165\u5c06\u8986\u76d6\u73b0\u6709\u6570\u636e\uff0c\u786e\u5b9a\u7ee7\u7eed\u5417\uff1f', '\u26a0\ufe0f');
      if (!ok) return;
      try {
        var text = await file.text();
        var count = await importData(text);
        self.toast('\u6210\u529f\u5bfc\u5165 ' + count + ' \u6761\u8bb0\u5f55 \ud83c\udf89');
        self.refreshCurrentView();
      } catch(err) { self.toast('\u5bfc\u5165\u5931\u8d25\uff0c\u6587\u4ef6\u683c\u5f0f\u4e0d\u6b63\u786e', 'error'); }
    });
    input.click();
  },

  refreshCurrentView: function() {
    if (this.currentView === 'dashboard') this.renderDashboard();
    else if (this.currentView === 'calendar') this.renderCalendar();
    else if (this.currentView === 'transactions') this.renderTransactionList();
  },

  init: function() {
    var self = this;
    document.querySelectorAll('.nav-item').forEach(function(item) {
      item.addEventListener('click', function() { self.navigate(item.dataset.nav); });
    });
    document.getElementById('fab').addEventListener('click', function() { self.navigate('add'); });
    document.getElementById('btnExport').addEventListener('click', function() { self.exportData(); });
    document.getElementById('btnImport').addEventListener('click', function() { self.importData(); });
    this.navigate('dashboard');
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(function() {}); }
  }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });
