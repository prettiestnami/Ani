shell(
    'C&I Inventory',
    'Manage your seed inventory and record harvests in one place.',
    `
        <div class="card inventory-tabs">
            <button type="button" class="tab-btn active" data-tab="seeds">🫘 Seed Inventory</button>
            <button type="button" class="tab-btn" data-tab="harvest">🧺 Harvest Records</button>
        </div>

        <div id="seedTab" class="inventory-tab">
            <section class="card">
                <h2>Add a Seed Entry</h2>
                <form id="seedForm" class="form-row">
                    <label>
                        Seed Name
                        <input name="seed_name" placeholder="e.g. IR64 Rice Seeds" required>
                    </label>
                    <label>
                        Crop Type
                        <input type="hidden" name="crop_type" value="Rice">
                        <input value="Rice" readonly>
                    </label>
                    <label>
                        Quantity (g)
                        <input type="number" min="0" step="0.01" name="quantity_g" placeholder="e.g. 300" required>
                    </label>
                    <label>
                        Low-Stock Threshold (g)
                        <input type="number" min="0" step="0.01" name="threshold_g" placeholder="e.g. 100" required>
                    </label>
                    <button>＋ Add Seed</button>
                </form>
            </section>

            <section class="card">
                <h2>Current Seed Inventory</h2>
                <p>Update the quantity after distributing or restocking, then click Save.</p>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Seed Name</th>
                                <th>Crop Type</th>
                                <th>Quantity (g)</th>
                                <th>Threshold (g)</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="seedBody"></tbody>
                    </table>
                </div>
            </section>
        </div>

        <div id="harvestTab" class="inventory-tab" hidden>
            <section class="card">
                <h2>Log a Harvest</h2>
                <form id="harvestForm" class="form-row">
                    <label>
                        Plot
                        <select name="plot_id" id="harvestPlot" required></select>
                    </label>
                    <label>
                        Date
                        <input type="date" name="harvest_date" required>
                    </label>
                    <label>
                        Quantity (kg)
                        <input type="number" name="quantity" min="0.01" step="0.01" placeholder="e.g. 12.5" required>
                    </label>
                    <label>
                        Notes (optional)
                        <input name="notes" placeholder="e.g. Good bulb size">
                    </label>
                    <button>＋ Log Harvest</button>
                </form>
            </section>

            <section class="card">
                <h2>Harvest History</h2>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Plot</th>
                                <th>Crop</th>
                                <th>Quantity</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="harvestBody"></tbody>
                    </table>
                </div>
            </section>
        </div>
    `
);

const seedTab = document.getElementById('seedTab');
const harvestTab = document.getElementById('harvestTab');

function showTab(tab) {
    const isSeed = tab === 'seeds';

    seedTab.hidden = !isSeed;
    harvestTab.hidden = isSeed;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (isSeed) {
        loadSeeds();
    } else {
        loadHarvests();
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

async function loadSeeds() {
    try {
        const d = await api('C&I Inventory/get_seeds.php');

        document.getElementById('seedBody').innerHTML = d.seeds.map(s => `
            <tr>
                <td>${esc(s.seed_name)}</td>
                <td>${cropBadge(s.crop_type)}</td>
                <td>
                    <input class="cell-input qty" value="${esc(s.quantity_g)}" data-id="${s.id}">
                </td>
                <td>${Number(s.threshold_g).toLocaleString()}</td>
                <td>
                    <span class="badge ${s.low_stock ? 'low' : 'done'}">
                        ${s.low_stock ? 'Low' : 'OK'}
                    </span>
                </td>
                <td>
                    <button class="small" onclick="saveSeed(${s.id},this)">💾 Save</button>
                    <button class="small danger" onclick="delSeed(${s.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('seedForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('C&I Inventory/add_seed.php', Object.fromEntries(new FormData(e.target)));
        toast('Seed added.');
        e.target.reset();
        loadSeeds();
    } catch (x) {
        toast(x.message, true);
    }
});

window.saveSeed = async (id, button) => {
    const row = button.closest('tr');
    const input = row.querySelector('.qty');

    try {
        await post('C&I Inventory/update_seed.php', {
            id,
            quantity_g: input.value,
            threshold_g: row.children[3].textContent.replace(/,/g, '')
        });
        toast('Seed inventory updated.');
        loadSeeds();
    } catch (e) {
        toast(e.message, true);
    }
};

window.delSeed = async id => {
    if (!confirm('Delete this seed entry?')) return;

    try {
        await post('C&I Inventory/delete_seed.php', { id });
        toast('Seed deleted.');
        loadSeeds();
    } catch (e) {
        toast(e.message, true);
    }
};

async function loadHarvests() {
    try {
        const [p, h] = await Promise.all([
            api('Plots/get_plots.php'),
            api('C&I Inventory/get_harvests.php')
        ]);

        document.getElementById('harvestPlot').innerHTML = plotOptions(p.plots);

        document.getElementById('harvestBody').innerHTML = h.harvests.map(x => `
            <tr>
                <td>${esc(x.harvest_date)}</td>
                <td>${esc(x.plot_name)}</td>
                <td>${cropBadge(x.crop_type)}</td>
                <td>${Number(x.quantity).toLocaleString()} kg</td>
                <td>${esc(x.notes || '')}</td>
                <td>
                    <button class="small danger" onclick="delHarvest(${x.id})">Delete</button>
                </td>
            </tr>
        `).join('');

        setDefaultDates();
    } catch (e) {
        toast(e.message, true);
    }
}

document.getElementById('harvestForm').addEventListener('submit', async e => {
    e.preventDefault();

    try {
        await post('C&I Inventory/add_harvest.php', Object.fromEntries(new FormData(e.target)));
        toast('Harvest logged.');
        e.target.reset();
        setDefaultDates();
        loadHarvests();
    } catch (x) {
        toast(x.message, true);
    }
});

window.delHarvest = async id => {
    if (!confirm('Delete this harvest record?')) return;

    try {
        await post('C&I Inventory/delete_harvest.php', { id });
        toast('Harvest deleted.');
        loadHarvests();
    } catch (e) {
        toast(e.message, true);
    }
};

showTab('seeds');
