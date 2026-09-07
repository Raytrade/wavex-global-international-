const STORAGE_USERS = 'wavex_users';
const STORAGE_SHIPMENTS = 'wavex_shipments';
const STORAGE_SESSION = 'wavex_session';
const ADMIN_PASSWORD = "Whiteray2026";

let activeIntervals = {};

function generateTracking() {
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  return `WXG-\( {a}- \){b}`;
}

function showToast(msg, time = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), time);
}

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
}
function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function getShipments() {
  return JSON.parse(localStorage.getItem(STORAGE_SHIPMENTS) || '[]');
}
function saveShipments(data) {
  localStorage.setItem(STORAGE_SHIPMENTS, JSON.stringify(data));
}
function getCurrentUser() {
  const email = localStorage.getItem(STORAGE_SESSION);
  if (!email) return null;
  return getUsers().find(u => u.email === email) || null;
}
function setSession(email) {
  localStorage.setItem(STORAGE_SESSION, email);
}
function clearSession() {
  localStorage.removeItem(STORAGE_SESSION);
}

function getStatusLabel(status) {
  const map = {
    created: 'Created',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    customs: 'Customs Clearance',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    paused: 'Paused'
  };
  return map[status] || status;
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  updateNav();
  if (id === 'dashboardView') renderDashboard();
  if (id === 'adminView') renderAdminList();
}

function updateNav() {
  const user = getCurrentUser();
  const nav = document.getElementById('navActions');
  if (user) {
    nav.innerHTML = `<span style="color:var(--text-muted);font-size:14px;margin-right:10px;">${user.name}</span>
      <button class="btn btn-outline" onclick="logout()">Sign Out</button>`;
  } else {
    nav.innerHTML = `<button class="btn btn-outline" onclick="showView('authView')">Client Login</button>`;
  }
}

function login(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  let users = getUsers();
  if (!users.find(u => u.email === 'real@wavex.live')) {
    users.push({ name: 'Real Client', email: 'real@wavex.live', password: 'Real1234' });
    saveUsers(users);
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    showToast('Invalid email or password');
    return;
  }
  setSession(email);
  showToast('Welcome, ' + user.name);
  showView('dashboardView');
}

function logout() {
  clearSession();
  showToast('Signed out');
  showView('homeView');
}

function trackShipment() {
  const code = document.getElementById('trackingInput').value.trim().toUpperCase();
  const box = document.getElementById('trackingResult');

  if (!code) {
    box.innerHTML = `<p style="text-align:center;color:var(--text-muted);">Enter a tracking number</p>`;
    return;
  }

  const s = getShipments().find(x => x.tracking === code);
  if (!s) {
    box.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:30px;text-align:center;">
        <h3>No shipment found</h3>
        <p style="color:var(--text-muted);margin-top:8px;">Tracking <strong>${code}</strong> does not exist.</p>
      </div>`;
    return;
  }
  box.innerHTML = renderShipmentCard(s);
}

function renderShipmentCard(s) {
  const progress = {
    created: 8, picked_up: 25, in_transit: 50,
    customs: 70, out_for_delivery: 88, delivered: 100, paused: 45
  };

  const stages = [
    { key: 'created', label: 'Shipment Created' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'in_transit', label: 'In International Transit' },
    { key: 'customs', label: 'Customs Clearance' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const currentIdx = stages.findIndex(st => st.key === s.status);
  const isPaused = s.status === 'paused';

  let timeline = stages.map((st, i) => {
    let cls = '';
    if (i < currentIdx) cls = 'completed';
    if (i === currentIdx && !isPaused) cls = 'active';
    const hist = (s.history || []).find(h => h.status === st.key);
    return `
      <div class="timeline-item ${cls}">
        <div class="timeline-dot"></div>
        <div>
          <strong>${st.label}</strong><br>
          <span style="font-size:12px;color:var(--text-muted);">${hist ? new Date(hist.time).toLocaleString() : '—'}</span>
        </div>
      </div>`;
  }).join('');

  const statusText = isPaused 
    ? `<span class="status-badge paused">Paused</span>` 
    : `<span class="status-badge \( {s.status}"> \){getStatusLabel(s.status)}</span>`;

  const pauseInfo = isPaused && s.pauseReason 
    ? `<div style="margin:12px 0;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:8px;font-size:14px;">
         <strong>Paused:</strong> ${s.pauseReason}
       </div>` : '';

  return `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="tracking-code" style="font-size:20px;">${s.tracking}</div>
        ${statusText}
      </div>
      <p style="color:var(--text-muted);font-size:14px;margin-bottom:16px;">
        ${s.service || 'Global Express'} • ${s.weight} kg • Est. ${s.estimatedDelivery}
      </p>
      <div class="route" style="margin-bottom:14px;">
        <div><small>FROM</small><strong>${s.senderLocation}</strong></div>
        <div class="route-line">✈</div>
        <div><small>TO</small><strong>${s.receiverLocation}</strong></div>
      </div>
      <div class="progress"><div class="progress-bar" style="width:${progress[s.status] || 10}%"></div></div>
      ${pauseInfo}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;font-size:14px;">
        <div><small style="color:var(--text-muted);">Sender</small><br>${s.senderName}</div>
        <div><small style="color:var(--text-muted);">Receiver</small><br>${s.receiverName}</div>
      </div>
      <p style="font-size:14px;margin-bottom:6px;"><strong>Package:</strong> ${s.description}</p>
      <div class="timeline">${timeline}</div>
    </div>`;
}

function openShipmentModal(tracking) {
  const s = getShipments().find(x => x.tracking === tracking);
  if (!s) return;
  document.getElementById('modalContent').innerHTML = renderShipmentCard(s);
  document.getElementById('shipmentModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('shipmentModal').classList.add('hidden');
}

function renderDashboard() {
  const user = getCurrentUser();
  const loggedOut = document.getElementById('loggedOutDashboard');
  const content = document.getElementById('dashboardContent');

  if (!user) {
    loggedOut.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  loggedOut.classList.add('hidden');
  content.classList.remove('hidden');
  document.getElementById('clientName').textContent = user.name;

  const all = getShipments().filter(s => s.userEmail === user.email);
  document.getElementById('totalShipments').textContent = all.length;
  document.getElementById('transitShipments').textContent = all.filter(s => !['delivered','created'].includes(s.status)).length;
  document.getElementById('deliveredShipments').textContent = all.filter(s => s.status === 'delivered').length;

  const list = document.getElementById('shipmentList');
  if (all.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:30px 0;">No shipments found.</p>`;
    return;
  }

  list.innerHTML = all.map(s => `
    <div class="shipment-item" onclick="openShipmentModal('${s.tracking}')">
      <div>
        <div class="code">${s.tracking}</div>
        <div class="meta">${s.senderLocation} → ${s.receiverLocation}</div>
      </div>
      <span class="status-badge \( {s.status}"> \){getStatusLabel(s.status)}</span>
    </div>`).join('');
}

function showAdminPanel() {
  const pass = prompt("Enter Admin Password:");
  if (pass !== ADMIN_PASSWORD) {
    showToast("Access denied");
    return;
  }
  showView('adminView');
}

function adminCreateShipment(e) {
  e.preventDefault();
  let tracking = document.getElementById('adminTracking').value.trim().toUpperCase();
  if (!tracking) tracking = generateTracking();

  const shipment = {
    tracking,
    userEmail: document.getElementById('adminClientEmail').value.trim().toLowerCase(),
    senderName: document.getElementById('adminSenderName').value.trim(),
    senderLocation: document.getElementById('adminSenderLocation').value.trim(),
    receiverName: document.getElementById('adminReceiverName').value.trim(),
    receiverLocation: document.getElementById('adminReceiverLocation').value.trim(),
    description: document.getElementById('adminDescription').value.trim(),
    weight: document.getElementById('adminWeight').value,
    service: 'Global Express',
    estimatedDelivery: document.getElementById('adminDelivery').value,
    status: 'created',
    pauseReason: '',
    history: [{ status: 'created', label: 'Shipment Created', time: new Date().toISOString() }],
    createdAt: new Date().toISOString()
  };

  const all = getShipments();
  all.unshift(shipment);
  saveShipments(all);
  e.target.reset();
  showToast('Shipment created: ' + tracking);
  renderAdminList();
}

function renderAdminList() {
  const list = document.getElementById('adminShipmentList');
  const all = getShipments();

  if (all.length === 0) {
    list.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:30px;">No shipments yet</p>`;
    return;
  }

  list.innerHTML = all.map(s => {
    const moving = !!activeIntervals[s.tracking];
    return `
      <div class="shipment-item">
        <div>
          <div class="code">${s.tracking}</div>
          <div class="meta">${s.senderLocation} → ${s.receiverLocation} • ${s.description}</div>
          <div style="margin-top:6px;font-size:13px;">
            <span class="status-badge \( {s.status}"> \){getStatusLabel(s.status)}</span>
            ${moving ? '<span style="color:#10b981;margin-left:8px;">● Moving</span>' : '<span style="color:#94a3b8;margin-left:8px;">○ Stopped</span>'}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="btn btn-primary" style="padding:7px 12px;font-size:13px;" onclick="startMoving('${s.tracking}')" ${moving || s.status==='delivered' ? 'disabled' : ''}>Start</button>
          <button class="btn btn-outline" style="padding:7px 12px;font-size:13px;" onclick="pauseMoving('${s.tracking}')" ${!moving ? 'disabled' : ''}>Pause</button>
        </div>
      </div>`;
  }).join('');
}

function startMoving(tracking) {
  if (activeIntervals[tracking]) return;
  const stages = ['created','picked_up','in_transit','customs','out_for_delivery','delivered'];

  activeIntervals[tracking] = setInterval(() => {
    const all = getShipments();
    const idx = all.findIndex(s => s.tracking === tracking);
    if (idx === -1) { stopMoving(tracking); return; }

    const current = all[idx].status;
    if (current === 'paused' || current === 'delivered') { stopMoving(tracking); return; }

    const i = stages.indexOf(current);
    if (i === -1 || i >= stages.length - 1) { stopMoving(tracking); return; }

    const next = stages[i + 1];
    all[idx].status = next;
    all[idx].history.push({ status: next, label: getStatusLabel(next), time: new Date().toISOString() });
    saveShipments(all);
    renderAdminList();
  }, 35000);

  showToast(tracking + ' started moving');
  renderAdminList();
}

function pauseMoving(tracking, reason = 'Paused by Admin') {
  if (activeIntervals[tracking]) {
    clearInterval(activeIntervals[tracking]);
    delete activeIntervals[tracking];
  }
  const all = getShipments();
  const idx = all.findIndex(s => s.tracking === tracking);
  if (idx !== -1) {
    all[idx].status = 'paused';
    all[idx].pauseReason = reason;
    all[idx].history.push({ status: 'paused', label: 'Paused', time: new Date().toISOString() });
    saveShipments(all);
  }
  showToast(tracking + ' paused');
  renderAdminList();
}

function stopMoving(tracking) {
  if (activeIntervals[tracking]) {
    clearInterval(activeIntervals[tracking]);
    delete activeIntervals[tracking];
  }
  renderAdminList();
}

function runAICommand() {
  const input = document.getElementById('aiCommand').value.trim();
  const responseBox = document.getElementById('aiResponse');
  if (!input) {
    responseBox.textContent = 'Please type a command.';
    return;
  }

  const cmd = input.toLowerCase();
  let reply = '';

  if (cmd.includes('create package') || cmd.includes('create shipment') || cmd.includes('new package')) {
    try {
      const clientMatch = input.match(/client\s+([^\s]+)/i);
      const fromMatch = input.match(/from\s+["'](.+?)["']/i);
      const toMatch = input.match(/to\s+["'](.+?)["']/i);
      const senderMatch = input.match(/sender\s+["'](.+?)["']/i);
      const receiverMatch = input.match(/receiver\s+["'](.+?)["']/i);
      const descMatch = input.match(/desc\s+["'](.+?)["']/i) || input.match(/description\s+["'](.+?)["']/i);
      const weightMatch = input.match(/weight\s+([\d.]+)/i);

      if (!clientMatch || !fromMatch || !toMatch) {
        reply = `Use this format:<br><br>
        <code>create package client email@example.com from "Lagos, Nigeria" to "London, UK" sender "John Doe" receiver "Mary Smith" desc "Documents" weight 2.5</code>`;
      } else {
        const tracking = generateTracking();
        const shipment = {
          tracking,
          userEmail: clientMatch[1].toLowerCase(),
          senderName: senderMatch ? senderMatch[1] : 'Sender',
          senderLocation: fromMatch[1].trim(),
          receiverName: receiverMatch ? receiverMatch[1] : 'Receiver',
          receiverLocation: toMatch[1].trim(),
          description: descMatch ? descMatch[1] : 'Package',
          weight: weightMatch ? weightMatch[1] : '1.0',
          service: 'Global Express',
          estimatedDelivery: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
          status: 'created',
          pauseReason: '',
          history: [{ status: 'created', label: 'Shipment Created', time: new Date().toISOString() }],
          createdAt: new Date().toISOString()
        };
        const all = getShipments();
        all.unshift(shipment);
        saveShipments(all);
        reply = `Package created.<br>Tracking: <strong>${tracking}</strong><br>From: ${shipment.senderLocation}<br>To: ${shipment.receiverLocation}`;
        renderAdminList();
      }
    } catch (e) {
      reply = 'Error creating package. Check format.';
    }
  }

  else if (cmd.includes('pause')) {
    const match = input.match(/WXG-\d{4}-\d{4}/i);
    if (match) {
      const tracking = match[0].toUpperCase();
      let reason = 'Paused by Admin';
      const reasonMatch = input.match(/reason\s+["'](.+?)["']/i) || input.match(/reason\s+(.+)$/i);
      if (reasonMatch) reason = reasonMatch[1].trim();
      pauseMoving(tracking, reason);
      reply = `Package <strong>${tracking}</strong> paused.<br>Reason: ${reason}`;
    } else {
      reply = `Example: <code>pause WXG-2048-7719 reason "Customs inspection"</code>`;
    }
  }

  else if (cmd.includes('start') || cmd.includes('continue') || cmd.includes('run')) {
    const match = input.match(/WXG-\d{4}-\d{4}/i);
    if (match) {
      const tracking = match[0].toUpperCase();
      const all = getShipments();
      const idx = all.findIndex(s => s.tracking === tracking);
      if (idx !== -1 && all[idx].status === 'paused') {
        all[idx].status = 'in_transit';
        all[idx].pauseReason = '';
        saveShipments(all);
      }
      startMoving(tracking);
      reply = `Package <strong>${tracking}</strong> started and is now moving.`;
    } else if (cmd.includes('all')) {
      const all = getShipments().filter(s => s.status !== 'delivered');
      all.forEach(s => startMoving(s.tracking));
      reply = `Started ${all.length} packages.`;
    } else {
      reply = `Example: <code>start WXG-2048-7719</code> or <code>start all</code>`;
    }
  }

  else if (cmd.includes('status') || cmd.includes('where') || cmd.includes('check')) {
    const match = input.match(/WXG-\d{4}-\d{4}/i);
    if (match) {
      const tracking = match[0].toUpperCase();
      const s = getShipments().find(x => x.tracking === tracking);
      if (s) {
        reply = `Package <strong>${tracking}</strong><br>Status: ${getStatusLabel(s.status)}<br>
        ${s.pauseReason ? 'Reason: ' + s.pauseReason + '<br>' : ''}
        From: ${s.senderLocation}<br>To: ${s.receiverLocation}`;
      } else {
        reply = `Package ${tracking} not found.`;
      }
    } else {
      reply = 'Please provide tracking number.';
    }
  }

  else if (cmd.includes('list') || cmd.includes('show all') || cmd.includes('all packages')) {
    const all = getShipments();
    if (all.length === 0) {
      reply = 'No packages found.';
    } else {
      reply = `Total: <strong>${all.length}</strong><br><br>` +
        all.slice(0, 12).map(s => `• ${s.tracking} — ${getStatusLabel(s.status)} — ${s.senderLocation} → ${s.receiverLocation}`).join('<br>');
    }
  }

  else {
    reply = `<strong>Admin AI Commands:</strong><br><br>
    • <code>create package client email@example.com from "Lagos, Nigeria" to "London, UK" sender "John" receiver "Mary" desc "Documents" weight 2.5</code><br><br>
    • <code>pause WXG-XXXX-XXXX reason "Your reason"</code><br><br>
    • <code>start WXG-XXXX-XXXX</code><br><br>
    • <code>start all</code><br><br>
    • <code>status WXG-XXXX-XXXX</code><br><br>
    • <code>list packages</code>`;
  }

  responseBox.innerHTML = reply;
  document.getElementById('aiCommand').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  let users = getUsers();
  if (!users.find(u => u.email === 'real@wavex.live')) {
    users.push({ name: 'Real Client', email: 'real@wavex.live', password: 'Real1234' });
    saveUsers(users);
  }
  updateNav();

  let clicks = 0;
  const logo = document.getElementById('brandLogo');
  if (logo) {
    logo.addEventListener('click', () => {
      clicks++;
      if (clicks >= 5) {
        clicks = 0;
        showAdminPanel();
      }
      setTimeout(() => clicks = 0, 2500);
    });
  }
});
