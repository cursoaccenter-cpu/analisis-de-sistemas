// =============================================
// TacticAI — Main App Logic
// Interactive Football Tactical Analysis
// =============================================

// ---- State ----
let activeSystem = "4231";
let activeFieldFormation = "4231";
let activePositionFilter = "all";
let isEditMode = false;
let editedSystems = JSON.parse(localStorage.getItem('editedSystems')) || null;

// Initialize data from localStorage if available
if (editedSystems) {
  Object.keys(editedSystems).forEach(sys => {
    Object.assign(SYSTEMS[sys], editedSystems[sys]);
  });
}

// ---- Formation Positions on Field (% of pitch width x height) ----
const FIELD_POSITIONS = {
  "4231": [
    // GK
    { id: "gk", x: 50, y: 92, color: "#FBBF24", posType: "gk" },
    // DEF
    { id: "lb",  x: 18, y: 75, color: "#60A5FA", posType: "def" },
    { id: "lcb", x: 36, y: 78, color: "#60A5FA", posType: "def" },
    { id: "rcb", x: 64, y: 78, color: "#60A5FA", posType: "def" },
    { id: "rb",  x: 82, y: 75, color: "#60A5FA", posType: "def" },
    // MID
    { id: "ldm1", x: 36, y: 60, color: "#34D399", posType: "mid" },
    { id: "ldm2", x: 64, y: 60, color: "#34D399", posType: "mid" },
    // ATT
    { id: "lw",  x: 12, y: 40, color: "#A855F7", posType: "att" },
    { id: "am",  x: 50, y: 38, color: "#F87171", posType: "att" },
    { id: "rw",  x: 88, y: 40, color: "#A855F7", posType: "att" },
    // ST
    { id: "st",  x: 50, y: 18, color: "#F87171", posType: "att" },
  ],
  "532": [
    // GK
    { id: "gk",  x: 50, y: 92, color: "#FBBF24", posType: "gk" },
    // DEF 5
    { id: "lwb", x: 10, y: 72, color: "#A855F7", posType: "wing" },
    { id: "lcb", x: 28, y: 78, color: "#60A5FA", posType: "def" },
    { id: "cb",  x: 50, y: 82, color: "#60A5FA", posType: "def" },
    { id: "rcb", x: 72, y: 78, color: "#60A5FA", posType: "def" },
    { id: "rwb", x: 90, y: 72, color: "#A855F7", posType: "wing" },
    // MID 3
    { id: "lm",  x: 22, y: 54, color: "#34D399", posType: "mid" },
    { id: "dm",  x: 50, y: 58, color: "#34D399", posType: "mid" },
    { id: "rm",  x: 78, y: 54, color: "#34D399", posType: "mid" },
    // FW 2
    { id: "ls",  x: 36, y: 24, color: "#F87171", posType: "att" },
    { id: "st",  x: 64, y: 20, color: "#F87171", posType: "att" },
  ],
};

// ---- MINI PITCH positions (hero) ----
const MINI_POSITIONS = {
  "4231": [
    { x: 50, y: 90 },
    { x: 18, y: 75 }, { x: 37, y: 78 }, { x: 63, y: 78 }, { x: 82, y: 75 },
    { x: 37, y: 58 }, { x: 63, y: 58 },
    { x: 12, y: 38 }, { x: 50, y: 36 }, { x: 88, y: 38 },
    { x: 50, y: 17 },
  ],
  "532": [
    { x: 50, y: 90 },
    { x: 10, y: 70 }, { x: 28, y: 76 }, { x: 50, y: 80 }, { x: 72, y: 76 }, { x: 90, y: 70 },
    { x: 22, y: 52 }, { x: 50, y: 56 }, { x: 78, y: 52 },
    { x: 36, y: 24 }, { x: 64, y: 20 },
  ],
};

// ---- Init ----
document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initMiniPitch();

  // Carga los datos personalizados desde Supabase (si están configurados)
  const statusEl = document.getElementById('header');
  await loadAllSystemsFromSupabase();

  initSystemTabs();
  renderSystemContent("4231");
  initComparison();
  initFieldVisualization();
  initScrollBehavior();
  initEditMode();
});

// =============================================
// PARTICLES
// =============================================
function initParticles() {
  const container = document.getElementById("bgParticles");
  if (!container) return;
  const colors = ["#6EE7F7", "#A855F7", "#34D399", "#60A5FA"];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 20 + 15;
    const delay = Math.random() * 20;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${color};
      left:${left}%;
      animation-duration:${duration}s;
      animation-delay:${delay}s;
      box-shadow: 0 0 ${size * 2}px ${color};
    `;
    container.appendChild(p);
  }
}

// =============================================
// MINI PITCH (Hero)
// =============================================
let miniCurrentSystem = "4231";
let miniToggleInterval;

function initMiniPitch() {
  renderMiniPitch("4231");
  // Alternate between the two formations
  miniToggleInterval = setInterval(() => {
    miniCurrentSystem = miniCurrentSystem === "4231" ? "532" : "4231";
    renderMiniPitch(miniCurrentSystem);
    const lbl = document.getElementById("formationLabel");
    if (lbl) {
      lbl.textContent = miniCurrentSystem === "4231" ? "4-2-3-1" : "5-3-2";
      lbl.style.animation = "none";
      void lbl.offsetWidth;
      lbl.style.animation = "fadeInUp 0.5s ease";
    }
  }, 3500);
}

function renderMiniPitch(system) {
  const container = document.getElementById("miniPlayers");
  if (!container) return;
  const positions = MINI_POSITIONS[system];
  const colors = {
    "4231": ["#FBBF24", "#60A5FA","#60A5FA","#60A5FA","#60A5FA","#34D399","#34D399","#A855F7","#F87171","#A855F7","#F87171"],
    "532":  ["#FBBF24","#A855F7","#60A5FA","#60A5FA","#60A5FA","#A855F7","#34D399","#34D399","#34D399","#F87171","#F87171"],
  };

  // Animate existing out
  const existingDots = container.querySelectorAll(".mini-player");
  existingDots.forEach(d => { d.style.opacity = "0"; d.style.transform = "translate(-50%,-50%) scale(0)"; });

  setTimeout(() => {
    container.innerHTML = "";
    positions.forEach((pos, i) => {
      const dot = document.createElement("div");
      dot.className = "mini-player";
      dot.style.cssText = `
        left:${pos.x}%;
        top:${pos.y}%;
        background:${colors[system][i]};
        width:20px; height:20px;
        opacity:0;
        transform:translate(-50%,-50%) scale(0);
        transition: all 0.4s cubic-bezier(0.4,0,0.2,1) ${i * 0.04}s;
      `;
      container.appendChild(dot);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dot.style.opacity = "1";
          dot.style.transform = "translate(-50%,-50%) scale(1)";
        });
      });
    });
  }, 300);
}

// =============================================
// SYSTEM TABS
// =============================================
function initSystemTabs() {
  const tabs = document.querySelectorAll(".system-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const sys = tab.dataset.system;
      activeSystem = sys;
      activePositionFilter = "all";
      renderSystemContent(sys);
    });
  });
}

// =============================================
// SYSTEM CONTENT RENDERING
// =============================================
function renderSystemContent(system) {
  const data = SYSTEMS[system];
  const container = document.getElementById("systemContent");
  if (!container || !data) return;

  container.innerHTML = `
    <div class="system-layout ${isEditMode ? 'editable-active' : ''}">
      ${renderSummaryCard(data)}
      ${renderStrengths(data)}
      ${renderWeaknesses(data)}
      ${renderPositions(data, system)}
    </div>
  `;

  if (isEditMode) {
    document.body.classList.add('editable-active');
    // Ensure edit mode UI is consistent
    document.getElementById('editToggle').classList.add('active');
  }

  // Position filter buttons
  container.querySelectorAll(".pos-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".pos-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activePositionFilter = btn.dataset.filter;
      filterPositions(system, activePositionFilter);
    });
  });

  // Position card clicks (modal)
  container.querySelectorAll(".position-card").forEach(card => {
    card.addEventListener("click", (e) => {
      // If clicking on an editable element or if edit mode is active, don't open modal
      if (isEditMode) return;
      
      const posId = card.dataset.posId;
      const posData = data.positions.find(p => p.id === posId);
      if (posData) openPositionModal(posData, data.name);
    });
  });
}

function renderSummaryCard(data) {
  const badges = data.badges.map(b => `<div class="sbadge ${b.type}">${b.label}</div>`).join("");
  return `
    <div class="card summary-card">
      <div>
        <div class="card-label">SISTEMA TÁCTICO</div>
        <div class="card-title" ${isEditMode ? 'contenteditable="true"' : ""}>${data.name} — ${data.nickname}</div>
        <p class="card-desc" ${isEditMode ? 'contenteditable="true"' : ""}>${data.description}</p>
      </div>
      <div class="summary-badges">${badges}</div>
    </div>
  `;
}

function renderStrengths(data) {
  const items = data.strengths.map((s, i) => `
    <li class="sw-item">
      <span class="dot"></span>
      <span ${isEditMode ? 'contenteditable="true"' : ""} data-index="${i}">${s}</span>
    </li>
  `).join("");
  return `
    <div class="card sw-card">
      <div class="sw-title strengths">
        <div class="sw-icon">✅</div>
        Fortalezas del ${data.name}
      </div>
      <ul class="sw-list strengths">${items}</ul>
    </div>
  `;
}

function renderWeaknesses(data) {
  const items = data.weaknesses.map((w, i) => `
    <li class="sw-item">
      <span class="dot"></span>
      <span ${isEditMode ? 'contenteditable="true"' : ""} data-index="${i}">${w}</span>
    </li>
  `).join("");
  return `
    <div class="card sw-card">
      <div class="sw-title weaknesses">
        <div class="sw-icon">⚠️</div>
        Debilidades del ${data.name}
      </div>
      <ul class="sw-list weaknesses">${items}</ul>
    </div>
  `;
}

function renderPositions(data, system) {
  const cards = data.positions.map(pos => renderPositionCard(pos)).join("");
  return `
    <div class="card positions-card">
      <div class="positions-header">
        <div class="positions-title">Roles de Cada Posición — ${data.name}</div>
        <div class="pos-filter">
          <button class="pos-filter-btn active" data-filter="all">Todos</button>
          <button class="pos-filter-btn" data-filter="gk">Portero</button>
          <button class="pos-filter-btn" data-filter="def">Defensa</button>
          <button class="pos-filter-btn" data-filter="mid">Mediocampo</button>
          <button class="pos-filter-btn" data-filter="att">Ataque</button>
          ${system === "532" ? '<button class="pos-filter-btn" data-filter="wing">Carrileros</button>' : ""}
        </div>
      </div>
      <div class="positions-grid" id="positionsGrid">
        ${cards}
      </div>
    </div>
  `;
}

function renderPositionCard(pos) {
  const attrBadges = pos.attrs.map(a => `<span class="attr-badge">${a.label}</span>`).join("");
  return `
    <div class="position-card" data-pos-id="${pos.id}" data-pos-type="${pos.type}">
      <div class="pos-header">
        <div class="pos-number ${pos.type}">${pos.abbr}</div>
        <div class="pos-info">
          <div class="pos-name" ${isEditMode ? 'contenteditable="true" data-type="name"' : ""}>${pos.name}</div>
          <div class="pos-abbr">${pos.type.toUpperCase()}</div>
        </div>
      </div>
      <p class="pos-role" ${isEditMode ? 'contenteditable="true" data-type="role"' : ""}>${pos.shortRole}</p>
      <div class="pos-attrs">${attrBadges}</div>
    </div>
  `;
}

// =============================================
// EDIT MODE LOGIC
// =============================================
function initEditMode() {
  const toggle = document.getElementById('editToggle');
  const btnSave = document.getElementById('btnSaveEdit');
  const btnCancel = document.getElementById('btnCancelEdit');

  if (!toggle) return;

  toggle.addEventListener('click', () => {
    isEditMode = !isEditMode;
    console.log("Modo edición:", isEditMode);
    
    if (isEditMode) {
      toggle.classList.add('active');
      toggle.querySelector('span:last-child').textContent = 'Edición Activa';
      document.body.classList.add('editable-active');
    } else {
      toggle.classList.remove('active');
      toggle.querySelector('span:last-child').textContent = 'Modo Edición';
      document.body.classList.remove('editable-active');
    }
    
    renderSystemContent(activeSystem);
  });

  btnSave.addEventListener('click', saveChanges);
  btnCancel.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres descartar los cambios?')) {
      isEditMode = false;
      toggle.classList.remove('active');
      document.body.classList.remove('editable-active');
      renderSystemContent(activeSystem);
    }
  });
}

function saveChanges() {
  const container = document.getElementById('systemContent');
  const systemKey = activeSystem;
  const data = SYSTEMS[systemKey];

  // 1. Update core info
  const titleText = container.querySelector('.card-title').textContent;
  const descText = container.querySelector('.card-desc').textContent;
  
  // Parse name vs nickname (handling " — ")
  const parts = titleText.split(' — ');
  data.name = parts[0] || data.name;
  data.nickname = parts[1] || data.nickname;
  data.description = descText;

  // 2. Update strengths
  container.querySelectorAll('.sw-list.strengths span[contenteditable]').forEach(el => {
    const idx = el.dataset.index;
    if (idx !== undefined) data.strengths[idx] = el.textContent;
  });

  // 3. Update weaknesses
  container.querySelectorAll('.sw-list.weaknesses span[contenteditable]').forEach(el => {
    const idx = el.dataset.index;
    if (idx !== undefined) data.weaknesses[idx] = el.textContent;
  });

  // 4. Update position cards
  container.querySelectorAll('.position-card').forEach(card => {
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
    showNotification('💾 Análisis guardado localmente (Supabase no configurado).');
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
    notif.style.opacity = '0';
    notif.style.transform = 'translateY(10px)';
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

// =============================================
// RADAR CHART (Canvas)
// =============================================
function drawRadarChart() {
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 140;
  const n = RADAR_LABELS.length;
  const center = { x: cx, y: cy };

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
    if (level === 5) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fill();
    }
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
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    const lx = cx + (radius + 22) * Math.cos(angle);
    const ly = cy + (radius + 22) * Math.sin(angle);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(RADAR_LABELS[i], lx, ly);
  }

  // Draw 4-2-3-1 polygon
  drawRadarPolygon(ctx, cx, cy, radius, n, ratings4231, "#6EE7F7");
  // Draw 5-3-2 polygon
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

  // Dots
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * values[i]) / 100;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
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
      // Reset tooltip
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
    player.style.cssText = `left:${pos.x}%; top:${pos.y}%; transition: all 0.5s cubic-bezier(0.4,0,0.2,1) ${i*0.04}s;`;
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
  const posEl = document.getElementById("tooltipPos");
  const nameEl = document.getElementById("tooltipName");
  const roleEl = document.getElementById("tooltipRole");
  const attrsEl = document.getElementById("tooltipAttrs");

  if (!tooltip) return;

  posEl.textContent = `${posData.abbr} — ${posData.type.toUpperCase()}`;
  nameEl.textContent = posData.name;
  roleEl.textContent = posData.shortRole;
  attrsEl.innerHTML = posData.attrs.map(a =>
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
// SCROLL BEHAVIOR
// =============================================
function initScrollBehavior() {
  const header = document.getElementById("header");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header && header.classList.add("scrolled");
    } else {
      header && header.classList.remove("scrolled");
    }
  }, { passive: true });

  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(el => {
      if (el.isIntersecting) {
        el.target.classList.add("animate-in");
        observer.unobserve(el.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".card, .comp-item, .position-card").forEach(el => {
    observer.observe(el);
  });
}
