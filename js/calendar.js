var Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  selectedDate: null,
  dateSummary: {},

  get daysInMonth() { return new Date(this.currentYear, this.currentMonth, 0).getDate(); },
  get firstDayOfWeek() { var d = new Date(this.currentYear, this.currentMonth - 1, 1); return d.getDay() === 0 ? 6 : d.getDay() - 1; },
  get monthKey() { return this.currentYear + '-' + String(this.currentMonth).padStart(2, '0'); },
  get todayStr() { var now = new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); },

  monthNames: ['1\u6708','2\u6708','3\u6708','4\u6708','5\u6708','6\u6708','7\u6708','8\u6708','9\u6708','10\u6708','11\u6708','12\u6708'],
  weekDays: ['\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d','\u65e5'],

  async loadSummary() { this.dateSummary = await getDateSummary(this.monthKey); },

  async render(container) {
    await this.loadSummary();
    var monthKey = this.monthKey;
    var monthBalance = await getMonthBalance(monthKey);
    var yearBalance = await getYearBalance(this.currentYear);
    var mInc = monthBalance.income.toFixed(2);
    var mExp = monthBalance.expense.toFixed(2);
    var mNet = monthBalance.balance.toFixed(2);
    var yInc = yearBalance.income.toFixed(2);
    var yExp = yearBalance.expense.toFixed(2);
    var yNet = yearBalance.balance.toFixed(2);
    var mColor = monthBalance.balance >= 0 ? 'var(--mint-600)' : 'var(--pink-500)';
    var yColor = yearBalance.balance >= 0 ? 'var(--mint-600)' : 'var(--pink-500)';
    container.innerHTML =
      '<div class="calendar-summary"><div class="calendar-summary__row">' +
        '<span class="calendar-summary__label">\u672c\u6708</span>' +
        '<span class="calendar-summary__item csi--income">\ud83d\udcb0 \u00a5' + mInc + '</span>' +
        '<span class="calendar-summary__item csi--expense">\ud83d\udcb8 \u00a5' + mExp + '</span>' +
        '<span class="calendar-summary__item csi--net" style="color:' + mColor + '">\u00a5' + mNet + '</span>' +
      '</div><div class="calendar-summary__row">' +
        '<span class="calendar-summary__label">\u672c\u5e74</span>' +
        '<span class="calendar-summary__item csi--income">\ud83d\udcb0 \u00a5' + yInc + '</span>' +
        '<span class="calendar-summary__item csi--expense">\ud83d\udcb8 \u00a5' + yExp + '</span>' +
        '<span class="calendar-summary__item csi--net" style="color:' + yColor + '">\u00a5' + yNet + '</span>' +
      '</div></div>' +
      '<div class="calendar-nav">' +
        '<span class="calendar-nav__month">' + this.currentYear + '\u5e74 ' + this.monthNames[this.currentMonth - 1] + '</span>' +
        '<div class="calendar-nav__arrows">' +
          '<button class="calendar-nav__arrow" data-cal-action="prev">\u25c0</button>' +
          '<button class="calendar-nav__arrow" data-cal-action="next">\u25b6</button>' +
        '</div>' +
      '</div>' +
      '<div class="calendar-weekdays">' + this.weekDays.map(function(d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="calendar-grid">' + this.buildGrid() + '</div>' +
      '<div class="calendar-day-summary" id="calendarDaySummary">' + this.buildDaySummary() + '</div>';
    this.attachEvents(container);
  },

  buildGrid() {
    var firstDay = this.firstDayOfWeek, totalDays = this.daysInMonth, cells = [], todayStr = this.todayStr;
    var prevMonthDays = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();
    for (var i = firstDay - 1; i >= 0; i--) {
      var day = prevMonthDays - i, dateStr = this.getPrevMonthDate(day);
      cells.push(this.buildDayCell(day, dateStr, todayStr, true));
    }
    for (var day = 1; day <= totalDays; day++) {
      var dateStr = this.currentYear + '-' + String(this.currentMonth).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      cells.push(this.buildDayCell(day, dateStr, todayStr, false));
    }
    var remaining = 42 - cells.length;
    for (var day = 1; day <= remaining; day++) {
      var dateStr = this.getNextMonthDate(day);
      cells.push(this.buildDayCell(day, dateStr, todayStr, true));
    }
    return cells.join('');
  },

  buildDayCell(day, dateStr, todayStr, isOther) {
    var cls = 'calendar-day';
    if (isOther) cls += ' calendar-day--other';
    if (dateStr === todayStr) cls += ' calendar-day--today';
    if (dateStr === this.selectedDate) cls += ' calendar-day--selected';
    var summary = this.dateSummary[dateStr], amounts = '';
    if (summary && summary.count > 0) {
      amounts = '<div class="calendar-day__amounts">';
      if (summary.income > 0) {
        var inc = summary.income;
        var incStr = (inc % 1 === 0) ? inc.toFixed(0) : inc.toFixed(1);
        amounts += '<span class="calendar-day__amt calendar-day__amt--income">+\u00a5' + incStr + '</span>';
      }
      if (summary.expense > 0) {
        var exp = summary.expense;
        var expStr = (exp % 1 === 0) ? exp.toFixed(0) : exp.toFixed(1);
        amounts += '<span class="calendar-day__amt calendar-day__amt--expense">-\u00a5' + expStr + '</span>';
      }
      amounts += '</div>';
    }
    return '<div class="' + cls + '" data-date="' + dateStr + '"><span class="calendar-day__num">' + day + '</span>' + amounts + '</div>';
  },

  buildDaySummary() {
    if (!this.selectedDate) {
      return '<div class="empty-state"><div class="empty-state__emoji">\ud83d\udcc5</div><div class="empty-state__text">\u70b9\u51fb\u65e5\u671f\u67e5\u770b\u5f53\u5929\u8d26\u5355</div></div>';
    }
    var summary = this.dateSummary[this.selectedDate];
    if (!summary || summary.count === 0) {
      return '<div class="empty-state"><div class="empty-state__emoji">\u2728</div><div class="empty-state__text">' + this.selectedDate + ' \u6682\u65e0\u8bb0\u5f55</div></div>';
    }
    return '<div class="calendar-day-summary__header">\ud83d\udccb ' + this.selectedDate + '</div>' +
      '<div class="calendar-day-summary__total">' +
        (summary.income > 0 ? '<span style="color:var(--green-600)">\ud83d\udcb0 \u6536\u5165 \u00a5' + summary.income.toFixed(2) + '</span>' : '') +
        (summary.expense > 0 ? '<span style="color:var(--pink-500)">\ud83d\udcb8 \u652f\u51fa \u00a5' + summary.expense.toFixed(2) + '</span>' : '') +
      '</div><div id="calendarDayTxList"></div>';
  },

  async renderDayTransactions() {
    var listEl = document.getElementById('calendarDayTxList');
    if (!listEl) return;
    var txs = await getTransactions({ date: this.selectedDate });
    if (txs.length === 0) { listEl.innerHTML = ''; return; }
    listEl.innerHTML = txs.map(function(tx) {
      var cat = App.getCategory(tx.type, tx.category);
      var emoji = cat ? cat.emoji : '\u2753';
      var name = cat ? cat.name : tx.category;
      var sign = tx.type === 'income' ? '+' : '-';
      var cls = tx.type === 'income' ? 'tx-item--income' : 'tx-item--expense';
      return '<div class="tx-item ' + cls + '" data-id="' + tx.id + '">' +
        '<div class="tx-item__icon">' + emoji + '</div>' +
        '<div class="tx-item__info"><div class="tx-item__category">' + name + '</div>' +
        (tx.note ? '<div class="tx-item__note">' + App.escapeHtml(tx.note) + '</div>' : '') + '</div>' +
        '<div class="tx-item__right"><div class="tx-item__amount">' + sign + '\u00a5' + tx.amount.toFixed(2) + '</div></div></div>';
    }).join('');
  },

  getPrevMonthDate: function(day) {
    var y = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
    var m = this.currentMonth === 1 ? 12 : this.currentMonth - 1;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  },

  getNextMonthDate: function(day) {
    var y = this.currentMonth === 12 ? this.currentYear + 1 : this.currentYear;
    var m = this.currentMonth === 12 ? 1 : this.currentMonth + 1;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  },

  attachEvents: function(container) {
    var self = this;
    container.querySelector('[data-cal-action="prev"]').addEventListener('click', function() {
      if (self.currentMonth === 1) { self.currentMonth = 12; self.currentYear--; }
      else self.currentMonth--;
      self.selectedDate = null;
      self.render(container);
    });
    container.querySelector('[data-cal-action="next"]').addEventListener('click', function() {
      if (self.currentMonth === 12) { self.currentMonth = 1; self.currentYear++; }
      else self.currentMonth++;
      self.selectedDate = null;
      self.render(container);
    });
    container.querySelectorAll('.calendar-day:not(.calendar-day--other)').forEach(function(el) {
      el.addEventListener('click', async function() {
        container.querySelectorAll('.calendar-day--selected').forEach(function(e) { e.classList.remove('calendar-day--selected'); });
        el.classList.add('calendar-day--selected');
        self.selectedDate = el.dataset.date;
        document.getElementById('calendarDaySummary').innerHTML = self.buildDaySummary();
        await self.renderDayTransactions();
      });
    });
  }
};
