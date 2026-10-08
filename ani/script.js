// Project root = folder containing this script.js (works from every module folder)
const ROOT = new URL('.', document.currentScript.src).href;

function urlFor(path) {
    const [p, q] = path.split('?');
    const enc = p.split('/').map(encodeURIComponent).join('/');
    return ROOT + enc + (q ? '?' + q : '');
}

const page = document.body.dataset.page;

const nav = [
    ['Dashboard/index.html', '📊', 'Dashboard', 'dashboard'],
    ['Plots/plots.html', '🌱', 'Plots', 'plots'],
    ['Tasks/watering.html', '💧', 'Watering Tasks', 'watering'],
    ['C&I Inventory/inventory.html', '🌾', 'C&I Inventory', 'inventory'],
    ['I&E Tracking/finance.html', '💰', 'Farm Finance', 'finance'],
    ['Calendar/calendar.html', '🗓️', 'Calendar', 'calendar']
];

function shell(title, subtitle, content) {
    document.getElementById('app').innerHTML = `
        <aside class="sidebar">
            <div class="brand">
                <span>🌱</span>
                <strong>Aniya</strong>
            </div>

            <nav>
                ${nav.map(n => `
                    <a
                        href="${urlFor(n[0])}"
                        class="${page === n[3] ? 'active' : ''}"
                    >
                        <span>${n[1]}</span>
                        ${n[2]}
                    </a>
                `).join('')}
            </nav>

            <div class="side-note">
                ${localStorage.getItem('aniya_user') ? '👤 ' + esc(localStorage.getItem('aniya_user')) + '<br>' : ''}
                <a href="#" id="logoutBtn" class="logout-link">🚪 Logout</a>
            </div>
        </aside>

        <main class="main">
            <header>
                <h1>${title}</h1>
                <p>${subtitle}</p>
            </header>

            ${content}
        </main>

        <div
            id="toast"
            class="toast"
        ></div>
    `;
}

function esc(v) {
    return String(v ?? '').replace(
        /[&<>'"]/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[c])
    );
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function api(url, options = {}) {
    return fetch(urlFor(url), options)
        .then(async r => {
            let x;

            try {
                x = await r.json();
            } catch (e) {
                throw new Error('Invalid server response');
            }

            if (r.status === 401) {
                window.location.href = urlFor('Auth/login.html');
                throw new Error('Please log in.');
            }

            if (!r.ok || x.success === false) {
                throw new Error(
                    x.message || 'Request failed'
                );
            }

            return x;
        });
}

function post(file, data) {
    return api(file, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

function toast(msg, error = false) {
    const t = document.getElementById('toast');

    if (!t) return;

    t.textContent = msg;

    t.className =
        'toast show ' +
        (error ? 'error' : '');

    setTimeout(
        () => t.className = 'toast',
        2800
    );
}

function cropBadge(c) {
    return `
        <span class="badge ${String(c).toLowerCase()}">
            ${esc(c)}
        </span>
    `;
}

function statusBadge(s) {
    return `
        <span class="badge ${String(s).toLowerCase()}">
            ${esc(s)}
        </span>
    `;
}

function plotOptions(plots) {
    return plots
        .map(p => `
            <option value="${p.id}">
                ${esc(p.name)} (${esc(p.crop_type)})
            </option>
        `)
        .join('');
}

function setDefaultDates() {
    document
        .querySelectorAll('input[type=date]')
        .forEach(x => {
            if (!x.value) {
                x.value = today();
            }
        });
}

document.addEventListener('click', async e => {
    if (!e.target.closest('#logoutBtn')) return;
    e.preventDefault();

    try {
        await post('Auth/logout.php', {});
    } catch (err) {}

    localStorage.removeItem('aniya_user');
    window.location.href = urlFor('Auth/login.html');
});
