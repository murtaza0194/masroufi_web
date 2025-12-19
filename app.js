// --- Utils ---
function ymd(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function startOfWeek(d = new Date()) {
    const x = new Date(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? 6 : day - 1);
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function startOfMonth(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), 1);
    x.setHours(0, 0, 0, 0);
    return x;
}

// --- Store ---
const KEY = 'masroufi_web_v1';

function loadAll() {
    try {
        const json = localStorage.getItem(KEY);
        return json ? JSON.parse(json) : [];
    } catch {
        return [];
    }
}

function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
}

function addExpenseToStore({ amount, category, note }) {
    const list = loadAll();
    const now = new Date();
    const item = {
        id: `${now.getTime()}_${Math.random().toString(16).slice(2)}`,
        amount: Number(amount),
        category,
        note: note || '',
        date: ymd(now),
        createdAt: now.toISOString()
    };
    list.unshift(item);
    saveAll(list);
}

// --- Logic ---
const views = ['home-view', 'add-view', 'stats-view', 'login-view'];
let historyStack = [];

function checkSession() {
    const user = localStorage.getItem('user_session');
    if (user) {
        navigate('home');
    } else {
        navigate('login');
    }
}

function loginWithSuperQi() {
    // Check if running inside SuperQi (H5 Container)
    if (typeof my !== 'undefined' && my.getAuthCode) {
        my.getAuthCode({
            scopes: 'auth_user', // Request user info scope
            success: (res) => {
                const authCode = res.authCode;
                // In a real app, send authCode to your backend to exchange for token.
                // Here we simulate success with the code.
                alert(`Authorization Success! Code: ${authCode}`);

                const realUser = {
                    name: "SuperQi User",
                    id: "qi_user_" + authCode.substr(0, 5),
                    token: authCode
                };
                localStorage.setItem('user_session', JSON.stringify(realUser));
                window.location.reload();
            },
            fail: (res) => {
                alert(`Login Failed: ${JSON.stringify(res)}`);
            }
        });
    } else {
        // --- FALLBACK / MOCK FOR BROWSER ---
        console.log("SuperQi 'my' object not found. Using Mock Login.");
        const mockUser = {
            name: "مستخدم تجريبي",
            id: "12345",
            token: "mock_token_abc123"
        };
        localStorage.setItem('user_session', JSON.stringify(mockUser));
        window.location.reload();
    }
}

function navigate(target) {
    const viewId = `${target}-view`;

    // Hide all
    views.forEach(v => document.getElementById(v).classList.add('hidden'));

    // Show target
    document.getElementById(viewId).classList.remove('hidden');

    // Update Header
    const backBtn = document.getElementById('backBtn');
    const title = document.getElementById('pageTitle');

    // Default Header State
    document.querySelector('.app-header').classList.remove('hidden');

    if (target === 'login') {
        document.querySelector('.app-header').classList.add('hidden'); // Hide header on login
        historyStack = ['login-view']; // Reset stack
    } else if (target === 'home') {
        backBtn.classList.add('hidden');
        title.innerText = 'مصروفي';
        initHome();
        // Base of stack if logged in
        if (historyStack.length === 0 || historyStack[0] === 'login-view') {
            historyStack = ['home-view'];
        }
    } else if (target === 'add') {
        backBtn.classList.remove('hidden');
        title.innerText = 'إضافة مصروف';
        // Reset form
        document.getElementById('addForm').reset();
    } else if (target === 'stats') {
        backBtn.classList.remove('hidden');
        title.innerText = 'الإحصائيات';
        initStats();
    }

    // Push to stack if not going back and not resetting
    if (target !== 'login' && target !== 'home' && historyStack[historyStack.length - 1] !== viewId) {
        historyStack.push(viewId);
    }
}

function goBack() {
    if (historyStack.length > 1) {
        historyStack.pop(); // Remove current
        const prev = historyStack[historyStack.length - 1]; // Get prev
        // Extract simple name from view id (home-view -> home)
        const target = prev.replace('-view', '');

        // Custom logic to avoid re-pushing to stack in navigate
        // Simple hack: Just call navigate, let it push, then pop twice? 
        // Or better: manual switch

        renderView(prev);
    }
}

function renderView(viewId) {
    // Hide all
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    const backBtn = document.getElementById('backBtn');
    const title = document.getElementById('pageTitle');

    if (viewId === 'home-view') {
        backBtn.classList.add('hidden');
        title.innerText = 'مصروفي';
        initHome();
    } else {
        backBtn.classList.remove('hidden');
        title.innerText = viewId === 'add-view' ? 'إضافة مصروف' : 'الإحصائيات';
        if (viewId === 'stats-view') initStats();
    }
}

function submitExpense(e) {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const note = document.getElementById('note').value;

    if (!amount || amount <= 0) {
        alert('يرجى إدخال مبلغ صحيح');
        return;
    }

    addExpenseToStore({ amount, category, note });
    goBack();
}

function initHome() {
    const today = ymd(new Date());
    const all = loadAll();
    const todayList = all.filter(x => x.date === today);
    const total = todayList.reduce((a, x) => a + x.amount, 0);

    document.getElementById('homeDate').innerText = today;
    document.getElementById('homeTotal').innerText = total.toLocaleString();

    const listEl = document.getElementById('homeList');
    listEl.innerHTML = '';

    if (todayList.length === 0) {
        document.getElementById('homeEmpty').classList.remove('hidden');
    } else {
        document.getElementById('homeEmpty').classList.add('hidden');
        todayList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'row list-item';
            div.innerHTML = `
                <div>
                    <div class="item-title">${item.category}</div>
                    <div class="muted">${item.note}</div>
                </div>
                <div class="item-amount">${item.amount.toLocaleString()} IQD</div>
            `;
            listEl.appendChild(div);
        });
    }
}

function initStats() {
    refreshStats();
}

function refreshStats() {
    const rangeIndex = Number(document.getElementById('statsRange').value);
    const all = loadAll();
    const now = new Date();

    let from = new Date(now);
    let subtitle = '';

    if (rangeIndex === 0) { // Today
        from.setHours(0, 0, 0, 0);
        subtitle = `تاريخ: ${ymd(now)}`;
    } else if (rangeIndex === 1) { // Week
        from = startOfWeek(now);
        subtitle = `من ${ymd(from)} إلى ${ymd(now)}`;
    } else { // Month
        from = startOfMonth(now);
        subtitle = `من ${ymd(from)} إلى ${ymd(now)}`;
    }

    const filtered = all.filter(x => {
        const d = new Date(x.date + 'T00:00:00');
        return d >= from && d <= now;
    });

    const total = filtered.reduce((a, x) => a + x.amount, 0);

    // Group by Category
    const map = {};
    filtered.forEach(x => {
        map[x.category] = (map[x.category] || 0) + x.amount;
    });
    const byCat = Object.keys(map)
        .map(k => ({ category: k, total: map[k] }))
        .sort((a, b) => b.total - a.total);

    // Render
    document.getElementById('statsTotal').innerText = total.toLocaleString();
    document.getElementById('statsSubtitle').innerText = subtitle;

    const listEl = document.getElementById('statsList');
    listEl.innerHTML = '';

    if (byCat.length === 0) {
        document.getElementById('statsEmpty').classList.remove('hidden');
    } else {
        document.getElementById('statsEmpty').classList.add('hidden');
        byCat.forEach(item => {
            const div = document.createElement('div');
            div.className = 'row list-item';
            div.innerHTML = `
                <div>${item.category}</div>
                <div class="item-amount">${item.total.toLocaleString()} IQD</div>
            `;
            listEl.appendChild(div);
        });
    }
}

// Initial Run
checkSession();
