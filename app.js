/**
 * TacticAI — Main Application Logic
 * Football Tactical Analysis Platform
 */

let activeSystem = "4231";
let activeFieldFormation = "4231";
let isEditMode = false;
let editedSystems = JSON.parse(localStorage.getItem('editedSystems')) || {};

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initMiniPitch();
  initAuth(); // Iniciamos el control de acceso

  // Intenta cargar datos de Supabase, pero no bloquea si falla
  try {
    await loadAllSystemsFromSupabase();
  } catch (err) {
    console.warn('Supabase no disponible, usando datos locales:', err);
  }

  initSystemTabs();
  renderSystemContent("4231");
  initComparison();
  initFieldVisualization();
  initScrollBehavior();
  initEditMode();
});

// --- Gestión de Autenticación ---
async function initAuth() {
  const overlay = document.getElementById('authOverlay');
  const loginForm = document.getElementById('loginForm');
  const errorEl = document.getElementById('authError');
  const user = await getUser();

  if (user) {
    overlay.classList.add('hidden');
    addLogoutButton(user.email);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('btnLogin');

    try {
      btn.textContent = 'Verificando...';
      btn.disabled = true;
      errorEl.textContent = '';
      await signIn(email, password);
      window.location.reload();
    } catch (err) {
      console.error('Error de login:', err);
      if (err.message.includes('Email not confirmed')) {
        errorEl.textContent = 'Error: Debes confirmar tu email en el panel de Supabase.';
      } else {
        errorEl.textContent = 'Acceso denegado: ' + err.message;
      }
      btn.textContent = 'Entrar al Sistema';
      btn.disabled = false;
    }
  });
}

function addLogoutButton(email) {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'logout-btn';
  logoutBtn.textContent = `Salir (${email.split('@')[0]})`;
  logoutBtn.onclick = () => signOut();
  nav.appendChild(logoutBtn);
}


// =============================================
// PARTICLES
// = =============================================
function initParticles() {
  const container = document.getElementById("bgParticles");
  if (!container) return;
  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 3 + 1;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.animationDuration = `${Math.random() * 10 + 10}s`;
    p.style.opacity = Math.random() * 0.5 + 0.1;
    container.appendChild(p);
  }
}

// =============================================
// TABS & CONTENT RENDERING
// =============================================
function initSystemTabs() {
  document.querySelectorAll(".system-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".system-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeSystem = tab.dataset.system;
      renderSystemContent(activeSystem);
    });
  });
}

function renderSystemContent(systemKey) {
  const container = document.getElementById("systemContent");
  if (!container) return;

  const data = SYSTEMS[systemKey];
  
  // Merge with locally edited data if exists
  if (editedSystems[systemKey]) {
      Object.assign(data, editedSystems[systemKey]);
  }

  const badgesHTML = data.badges.map(b => `<span class="badge ${b.type}">${b.label}</span>`).join("");
  const strengthsHTML = data.strengths.map(s => `
    <li class="sw-item">
      <div class="dot"></div>
      <div ${isEditMode ? 'contenteditable="true" class="editable-text"' : ''}>${s}</div>
    </li>
  `).join("");
  const weaknessesHTML = data.weaknesses.map(w => `
    <li class="sw-item">
      <div class="dot"></div>
      <div ${isEditMode ? 'contenteditable="true" class="editable-text"' : ''}>${w}</div>
    </li>
  `).join("");

  container.innerHTML = `
    <div class="system-layout">
      <!-- Info Col -->
      <div class="system-info">
        <div class="card intro-card">
          <div class="card-header">
            <span class="card-icon">${data.icon}</span>
            <div>
              <h2 class="card-title" ${isEditMode ? 'contenteditable="true" id="editName"' : ''}>${data.name}</h2>
              <p class="card-subtitle" ${isEditMode ? 'contenteditable="true" id="editNickname"' : ''}>${data.nickname}</p>
            </div>
          </div>
          <div class="badges-wrapper">${badgesHTML}</div>
          <p class="description-text" ${isEditMode ? 'contenteditable="true" id="editDesc"' : ''}>${data.description}</p>
        </div>

        <div class="sw-grid">
          <div class="card sw-card strengths">
            <h3 class="sw-title strengths">
              <div class="sw-icon">💪</div> Fortalezas
            </h3>
            <ul class="sw-list" id="strengthsList">${strengthsHTML}</ul>
          </div>
          <div class="card sw-card weaknesses">
            <h3 class="sw-title weaknesses">
              <div class="sw-icon">⚠️</div> Debilidades
            </h3>
            <ul class="sw-list" id="weaknessesList">${weaknessesHTML}</ul>
          </div>
        </div>
      </div>

      <!-- Main Column: Positions -->
      <div class="positions-col">
        <div class="card positions-card">
          <div class="positions-header">
            <h3 class="positions-title">Configuración de Posiciones</h3>
            <div class="pos-filter">
              <button class="pos-filter-btn active" data-filter="all">Todas</button>
              <button class="pos-filter-btn" data-filter="def">Defensa</button>
              <button class="pos-filter-btn" data-filter="mid">Medio</button>
              <button class="pos-filter-btn" data-filter="att">Ataque</button>
            </div>
          </div>
          <div class="positions-grid" id="positionsGrid">
            ${data.positions.map(pos => renderPositionCard(pos)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  // Re-attach position filter events
  container.querySelectorAll(".pos-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".pos-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterPositions(systemKey, btn.dataset.filter);
    });
  });

  // Re-attach position card click events
  container.querySelectorAll(".position-card").forEach(card => {
    card.addEventListener("click", () => {
      const posId = card.dataset.posId;
      const posData = data.positions.find(p => p.id === posId);
      if (posData) openPositionModal(posData, data.name);
    });
  });
}

function renderPositionCard(pos) {
  return `
    <div class="position-card" data-pos-id="${pos.id}">
      <div class="pos-header">
        <div class="pos-number ${pos.type}">${pos.abbr}</div>
        <div class="pos-info">
          <div class="pos-name" ${isEditMode ? 'contenteditable="true"' : ''}>${pos.name}</div>
          <div class="pos-abbr">${pos.type.toUpperCase()}</div>
        </div>
      </div>
      <div class="pos-role" ${isEditMode ? 'contenteditable="true"' : ''}>${pos.shortRole}</div>
      <div class="pos-attrs">
        ${pos.attrs.slice(0, 2).map(a => `<span class="attr-badge">${a.label}</span>`).join("")}
      </div>
    </div>
  `;
}

// =============================================
// EDIT MODE
// =============================================
function initEditMode() {
  const toggle = document.getElementById('editToggle');
  const cancelBtn = document.getElementById('cancelEdit');
  const saveBtn = document.getElementById('saveEdit');

  toggle.addEventListener('click', () => {
    isEditMode = true;
    toggle.classList.add('active');
    toggle.querySelector('span:last-child').textContent = 'Editando...';
    document.body.classList.add('editable-active');
    renderSystemContent(activeSystem);
  });

  cancelBtn.addEventListener('click', () => {
    isEditMode = false;
    toggle.classList.remove('active');
    toggle.querySelector('span:last-child').textContent = 'Modo Edición';
    document.body.classList.remove('editable-active');
    renderSystemContent(activeSystem);
  });

  saveBtn.addEventListener('click', saveChanges);
}

async function saveChanges() {
  const container = document.getElementById('systemContent');
  const systemKey = activeSystem;
  const data = SYSTEMS[systemKey];

  // Get Top Level Data
  const newName = document.getElementById('editName')?.textContent;
  const newNickname = document.getElementById('editNickname')?.textContent;
  const newDesc = document.getElementById('editDesc')?.textContent;

  if (newName) data.name = newName;
  if (newNickname) data.nickname = newNickname;
  if (newDesc) data.description = newDesc;

  // Get Strengths/Weaknesses
  const strengthsEls = document.querySelectorAll('#strengthsList .editable-text');
  data.strengths = Array.from(strengthsEls).map(el => el.textContent);

  const weaknessesEls = document.querySelectorAll('#weaknessesList .editable-text');
  data.weaknesses = Array.from(weaknessesEls).map(el => el.textContent);

  // Get Positions
  document.querySelectorAll('.position-card').forEach(card => {
    const posId = card.dataset.posId;
    const posObj = data.positions.find(p => p.id === posId);
    if (posObj) {
      const nameEl = card.querySelector('.pos-name');
      const roleEl = card.querySelector('.pos-role');
      posObj.name = nameEl.textContent;
      posObj.shortRole = roleEl.textContent;
    }
  });

  // Save to localStorage (fallback)
  if (!editedSystems) editedSystems = {};
  editedSystems[systemKey] = {
    name: data.name,
    nickname: data.nickname,
    description: data.description,
    strengths: [...data.strengths],
    weaknesses: [...data.weaknesses],
    positions: data.positions.map(p => ({ ...p }))
  };
  localStorage.setItem('editedSystems', JSON.stringify(editedSystems));

  // Save to Supabase (primary)
  const saved = await saveSystemToSupabase(systemKey, data);

  isEditMode = false;
  document.getElementById('editToggle').classList.remove('active');
  document.getElementById('editToggle').querySelector('span:last-child').textContent = 'Modo Edición';
  document.body.classList.remove('editable-active');
  renderSystemContent(activeSystem);

  if (saved) {
    showNotification('✅ Análisis guardado en la base de datos.');
  } else {
    showNotification('💾 Análisis guardado localmente (Inicie sesión para guardar en la nube).');
  }
}

function showNotification(msg) {
  let notif = document.getElementById('appNotif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'appNotif';
    notif.style.cssText = `
      position: fixed; bottom: 90px; right: 24px; z-index: 200;
      background: rgba(15,23,42,0.95); border: 1px solid rgba(110,231,247,0.3);
      color: #e2e8f0; padding: 12px 20px; border-radius: 12px;
      font-size: 0.875rem; font-weight: 500; backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: all 0.4s ease;
      opacity: 0; transform: translateY(10px);
    `;
    document.body.appendChild(notif);
  }
  notif.textContent = msg;
  requestAnimationFrame(() => {
    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    if (notif) {
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(10px)';
    }
  }, 3500);
}

function filterPositions(system, filter) {
  const grid = document.getElementById("positionsGrid");
  if (!grid) return;
  const data = SYSTEMS[system];
  let filtered = data.positions;
  if (filter !== "all") {
    filtered = data.positions.filter(p => p.type === filter);
  }
  grid.innerHTML = filtered.map(pos => renderPositionCard(pos)).join("");
  grid.querySelectorAll(".position-card").forEach(card => {
    card.addEventListener("click", () => {
      const posId = card.dataset.posId;
      const posData = data.positions.find(p => p.id === posId);
      if (posData) openPositionModal(posData, data.name);
    });
  });
}

// =============================================
// POSITION MODAL
// =============================================
let modalOverlay;

function openPositionModal(posData, systemName) {
  // Remove existing
  if (modalOverlay) modalOverlay.remove();

  const attrTypeLabelMap = { physical: "Físico", technical: "Técnico", mental: "Mental", tactical: "Táctico" };
  const attrBadges = posData.attrs.map(a =>
    `<span class="modal-attr ${a.type}">${attrTypeLabelMap[a.type] || a.type}: ${a.label}</span>`
  ).join("");

  const tasks = posData.tasks.map(t => `<li class="modal-task">${t}</li>`).join("");

  modalOverlay = document.createElement("div");
  modalOverlay.className = "pos-modal-overlay";
  modalOverlay.id = "posModal";
  modalOverlay.innerHTML = `
    <div class="pos-modal">
      <button class="modal-close" id="modalClose" aria-label="Cerrar">&times;</button>
      <div class="modal-badge">📌 ${systemName} — ${posData.type.toUpperCase()}</div>
      <div class="modal-title">${posData.name}</div>
      <div class="modal-subtitle">Abreviatura: ${posData.abbr}</div>

      <div class="modal-section-title">ROL Y DESCRIPCIÓN</div>
      <p class="modal-desc">${posData.role}</p>

      <div class="modal-section-title">ATRIBUTOS CLAVE</div>
      <div class="modal-attrs">${attrBadges}</div>

      <div class="modal-section-title">TAREAS PRINCIPALES</div>
      <ul class="modal-tasks">${tasks}</ul>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modalOverlay.classList.add("open");
    });
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", handleEscClose);
}

function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove("open");
    setTimeout(() => modalOverlay && modalOverlay.remove(), 300);
    modalOverlay = null;
  }
  document.removeEventListener("keydown", handleEscClose);
}

function handleEscClose(e) {
  if (e.key === "Escape") closeModal();
}

// =============================================
// COMPARISON SECTION
// =============================================
function initComparison() {
  const grid = document.getElementById("comparisonGrid");
  if (!grid) return;

  const d4231 = SYSTEMS["4231"].compData;
  const d532 = SYSTEMS["532"].compData;
  const keys = Object.keys(d4231);

  const col4231Items = keys.map(k => `
    <div class="comp-item ${d4231[k].win ? "comp-winner" : ""}">
      <div class="comp-item-label">${d4231[k].label}</div>
      <div class="comp-item-value">${d4231[k].value}</div>
    </div>
  `).join("");

  const col532Items = keys.map(k => `
    <div class="comp-item ${d532[k].win ? "comp-winner" : ""}">
      <div class="comp-item-label">${d532[k].label}</div>
      <div class="comp-item-value">${d532[k].value}</div>
    </div>
  `).join("");

  grid.innerHTML = `
    <div class="comp-col">
      <div class="comp-header">
        <h3>4-2-3-1</h3>
        <p>El Sistema Universal</p>
      </div>
      ${col4231Items}
    </div>
    <div class="comp-divider">
      <div class="comp-line"></div>
      <div class="vs-badge">VS</div>
      <div class="comp-line"></div>
    </div>
    <div class="comp-col">
      <div class="comp-header">
        <h3>5-3-2</h3>
        <p>El Bloque Sólido</p>
      </div>
      ${col532Items}
    </div>
    <div class="card radar-card" style="grid-column: 1 / -1;">
      <div class="radar-title">📊 Comparativa de Métricas Tácticas</div>
      <div class="radar-canvas-wrap">
        <canvas id="radarChart" width="360" height="360"></canvas>
        <div class="radar-legend">
          <div class="legend-item">
            <div class="legend-dot" style="background:#6EE7F7;"></div>
            <span>4-2-3-1</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:#A855F7;"></div>
            <span>5-3-2</span>
          </div>
          ${RADAR_LABELS.map((l, i) => `
            <div class="legend-item" style="margin-top:4px;">
              <span style="color:#64748B;font-size:0.75rem;">${l}:</span>
              <span style="color:#94A3B8;font-size:0.75rem;margin-left:4px;">${SYSTEMS["4231"].ratings[l.toLowerCase()]} / ${SYSTEMS["532"].ratings[l.toLowerCase()]}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  drawRadarChart();
}

function drawRadarChart() {
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 140;
  const n = RADAR_LABELS.length;

  const ratings4231 = [
    SYSTEMS["4231"].ratings.ataque,
    SYSTEMS["4231"].ratings.defensa,
    SYSTEMS["4231"].ratings.mediocampo,
    SYSTEMS["4231"].ratings.pressing,
    SYSTEMS["4231"].ratings.versatilidad,
    SYSTEMS["4231"].ratings.complejidad,
  ];

  const ratings532 = [
    SYSTEMS["532"].ratings.ataque,
    SYSTEMS["532"].ratings.defensa,
    SYSTEMS["532"].ratings.mediocampo,
    SYSTEMS["532"].ratings.pressing,
    SYSTEMS["532"].ratings.versatilidad,
    SYSTEMS["532"].ratings.complejidad,
  ];

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  for (let level = 1; level <= 5; level++) {
    const r = (radius * level) / 5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw axes
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.stroke();

    // Labels
    const lx = cx + (radius + 25) * Math.cos(angle);
    const ly = cy + (radius + 25) * Math.sin(angle);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(RADAR_LABELS[i], lx, ly);
  }

  drawRadarPolygon(ctx, cx, cy, radius, n, ratings4231, "#6EE7F7");
  drawRadarPolygon(ctx, cx, cy, radius, n, ratings532, "#A855F7");
}

function drawRadarPolygon(ctx, cx, cy, radius, n, values, color) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * values[i]) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color + "22";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * values[i]) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// =============================================
// MINI PITCH (Header)
// =============================================
function initMiniPitch() {
    const canvas = document.getElementById('miniPitch');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.strokeStyle = 'rgba(110, 231, 247, 0.4)';
    ctx.lineWidth = 1;

    // Outer
    ctx.strokeRect(5, 5, w-10, h-10);
    // Center
    ctx.beginPath();
    ctx.moveTo(5, h/2);
    ctx.lineTo(w-5, h/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w/2, h/2, 20, 0, Math.PI*2);
    ctx.stroke();

    // Box
    ctx.strokeRect(w/4, 5, w/2, 25);
    ctx.strokeRect(w/4, h-30, w/2, 25);
}

// =============================================
// FIELD VISUALIZATION
// =============================================
function initFieldVisualization() {
  renderField("4231");

  document.querySelectorAll(".field-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".field-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFieldFormation = btn.dataset.formation;
      renderField(activeFieldFormation);
      hideTooltip();
    });
  });
}

function renderField(formation) {
  const container = document.getElementById("pitchPlayers");
  if (!container) return;
  const positions = FIELD_POSITIONS[formation];
  const systemData = SYSTEMS[formation];

  container.innerHTML = "";
  positions.forEach((pos, i) => {
    const posData = systemData.positions.find(p => p.id === pos.id);
    if (!posData) return;

    const player = document.createElement("div");
    player.className = "pitch-player";
    player.style.cssText = `left:${pos.x}%; top:${pos.y}%; transition: all 0.5s ease ${i*0.03}s;`;
    player.dataset.posId = pos.id;

    player.innerHTML = `
      <div class="pitch-player-dot" style="background:${pos.color};">
        ${posData.abbr}
      </div>
      <div class="pitch-player-label">${posData.name}</div>
    `;

    player.addEventListener("click", () => showTooltip(posData, pos.color));
    container.appendChild(player);
  });
}

function showTooltip(posData, color) {
  const tooltip = document.getElementById("playerTooltip");
  if (!tooltip) return;

  document.getElementById("tooltipPos").textContent = `${posData.abbr} — ${posData.type.toUpperCase()}`;
  document.getElementById("tooltipName").textContent = posData.name;
  document.getElementById("tooltipRole").textContent = posData.shortRole;
  document.getElementById("tooltipAttrs").innerHTML = posData.attrs.map(a =>
    `<span class="attr-badge">${a.label}</span>`
  ).join("");

  tooltip.style.borderColor = color + "55";
  tooltip.classList.add("visible");
}

function hideTooltip() {
  const tooltip = document.getElementById("playerTooltip");
  if (tooltip) tooltip.classList.remove("visible");
}

// =============================================
// SCROLL & ANIMATIONS
// =============================================
function initScrollBehavior() {
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
    header && header.classList.toggle("scrolled", window.scrollY > 50);
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(el => {
      if (el.isIntersecting) {
        el.target.classList.add("animate-in");
        observer.unobserve(el.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".card, .comp-item, .position-card").forEach(el => observer.observe(el));
}
