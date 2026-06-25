const DB_NAME = 'XiaoLvJZ';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };
    request.onsuccess = (event) => { db = event.target.result; resolve(db); };
    request.onerror = () => reject(request.error);
  });
}

async function addTransaction(tx) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readwrite');
    const store = txn.objectStore(STORE_NAME);
    const request = store.add({
      type: tx.type, amount: Math.round(tx.amount * 100) / 100,
      category: tx.category, note: tx.note || '', date: tx.date, createdAt: Date.now()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateTransaction(id, updates) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readwrite');
    const store = txn.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const tx = getReq.result;
      if (!tx) return reject(new Error('Transaction not found'));
      Object.assign(tx, updates);
      if (updates.amount !== undefined) tx.amount = Math.round(tx.amount * 100) / 100;
      const putReq = store.put(tx);
      putReq.onsuccess = () => resolve(putReq.result);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function deleteTransaction(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readwrite');
    const store = txn.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getTransactions(filters = {}) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readonly');
    const store = txn.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let results = request.result;
      if (filters.type && filters.type !== 'all') results = results.filter((t) => t.type === filters.type);
      if (filters.month) results = results.filter((t) => t.date.startsWith(filters.month));
      if (filters.date) results = results.filter((t) => t.date === filters.date);
      if (filters.category) results = results.filter((t) => t.category === filters.category);
      results.sort((a, b) => { if (a.date !== b.date) return b.date.localeCompare(a.date); return b.createdAt - a.createdAt; });
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getBalance() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readonly');
    const store = txn.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let income = 0, expense = 0;
      for (const tx of request.result) {
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
      resolve({ income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100, balance: Math.round((income - expense) * 100) / 100 });
    };
    request.onerror = () => reject(request.error);
  });
}

async function getMonthBalance(month) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readonly');
    const store = txn.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let income = 0, expense = 0;
      for (const tx of request.result) {
        if (!tx.date.startsWith(month)) continue;
        if (tx.type === 'income') income += tx.amount;
        else expense += tx.amount;
      }
      resolve({ income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100, balance: Math.round((income - expense) * 100) / 100 });
    };
    request.onerror = () => reject(request.error);
  });
}

async function getDateSummary(month) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readonly');
    const store = txn.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const summary = {};
      for (const tx of request.result) {
        if (!tx.date.startsWith(month)) continue;
        if (!summary[tx.date]) summary[tx.date] = { income: 0, expense: 0, count: 0 };
        if (tx.type === 'income') summary[tx.date].income += tx.amount;
        else summary[tx.date].expense += tx.amount;
        summary[tx.date].count++;
      }
      resolve(summary);
    };
    request.onerror = () => reject(request.error);
  });
}

async function exportData() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readonly');
    const store = txn.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => { resolve(JSON.stringify(request.result, null, 2)); };
    request.onerror = () => reject(request.error);
  });
}

async function importData(jsonStr) {
  const database = await openDB();
  const data = JSON.parse(jsonStr);
  return new Promise((resolve, reject) => {
    const txn = database.transaction(STORE_NAME, 'readwrite');
    const store = txn.objectStore(STORE_NAME);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let count = 0;
      for (const item of data) {
        store.add({ type: item.type, amount: item.amount, category: item.category, note: item.note || '', date: item.date, createdAt: item.createdAt || Date.now() });
        count++;
      }
      txn.oncomplete = () => resolve(count);
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}
