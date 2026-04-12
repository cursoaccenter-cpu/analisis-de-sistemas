// =============================================
// Supabase Client — Análisis Sistemas
// =============================================

// ⚠️ Credenciales de Supabase configuradas
const SUPABASE_URL = 'https://xxbdinogjzfmgbtbzyqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YmRpbm9nanpmbWdidGJ6eXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDczOTcsImV4cCI6MjA5MTU4MzM5N30.CBHLccevJd1eogom5QWidxpFJsaOATaahDMSHl2LV-4';

// --- Cliente ligero sin SDK (fetch directo a la REST API) ---
const supabaseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

async function loadAllSystemsFromSupabase() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/tactical_analysis?select=*`, {
    headers: supabaseHeaders
  });
  
  if (!response.ok) return;
  
  const data = await response.json();
  data.forEach(item => {
    if (SYSTEMS[item.system_key]) {
      SYSTEMS[item.system_key].name = item.name || SYSTEMS[item.system_key].name;
      SYSTEMS[item.system_key].nickname = item.nickname || SYSTEMS[item.system_key].nickname;
      SYSTEMS[item.system_key].description = item.description || SYSTEMS[item.system_key].description;
      SYSTEMS[item.system_key].strengths = item.strengths || SYSTEMS[item.system_key].strengths;
      SYSTEMS[item.system_key].weaknesses = item.weaknesses || SYSTEMS[item.system_key].weaknesses;
      SYSTEMS[item.system_key].positions = item.positions || SYSTEMS[item.system_key].positions;
    }
  });
}

async function saveSystemToSupabase(systemKey, systemData) {
  const token = localStorage.getItem('supabase.auth.token');
  if (!token) return false;

  const payload = {
    system_key: systemKey,
    name: systemData.name,
    nickname: systemData.nickname,
    description: systemData.description,
    strengths: systemData.strengths,
    weaknesses: systemData.weaknesses,
    positions: systemData.positions,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/tactical_analysis?system_key=eq.${systemKey}`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

// --- Autenticación ---
async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Error al iniciar sesión');
  
  // Guardar token en localStorage
  localStorage.setItem('supabase.auth.token', data.access_token);
  return data;
}

function signOut() {
  localStorage.removeItem('supabase.auth.token');
  window.location.reload();
}

function getSessionToken() {
  return localStorage.getItem('supabase.auth.token');
}

async function getUser() {
  const token = getSessionToken();
  if (!token) return null;
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      ...supabaseHeaders,
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.ok ? await response.json() : null;
}
