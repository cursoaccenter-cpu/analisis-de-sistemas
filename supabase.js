// =============================================
// Supabase Client — Análisis Sistemas
// =============================================

// ⚠️ Credenciales de Supabase configuradas
const SUPABASE_URL = 'https://xxbdinogJzfmgbtbzyqj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YmRpbm9nanpmbWdidGJ6eXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDczOTcsImV4cCI6MjA5MTU4MzM5N30.CBHLccevJd1eogom5QWidxpFJsaOATaahDMSHl2LV-4';

// --- Cliente ligero sin SDK (fetch directo a la REST API) ---
const supabaseHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Prefer': 'return=representation'
};

/**
 * Carga el análisis guardado para un sistema (ej: '4231' o '532').
 * @param {string} systemKey
 * @returns {Promise<object|null>}
 */
async function loadSystemFromSupabase(systemKey) {
  try {
    if (SUPABASE_URL === 'TU_SUPABASE_URL') return null;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tactical_analysis?system_key=eq.${systemKey}&select=*`,
      { headers: supabaseHeaders }
    );

    if (!res.ok) {
      console.error('Error cargando desde Supabase:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error de conexión con Supabase:', err);
    return null;
  }
}

/**
 * Guarda o actualiza el análisis de un sistema en Supabase.
 * Usa UPSERT para insertar o actualizar si ya existe.
 * @param {string} systemKey
 * @param {object} systemData
 * @returns {Promise<boolean>}
 */
async function saveSystemToSupabase(systemKey, systemData) {
  try {
    if (SUPABASE_URL === 'TU_SUPABASE_URL') {
      console.warn('⚠️ Supabase no configurado. Guardando solo en localStorage.');
      return false;
    }

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

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tactical_analysis?on_conflict=system_key`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      console.error('Error guardando en Supabase:', res.status, await res.text());
      return false;
    }

    console.log('✅ Análisis guardado en Supabase:', systemKey);
    return true;
  } catch (err) {
    console.error('Error de conexión con Supabase:', err);
    return false;
  }
}

/**
 * Carga todos los sistemas guardados en Supabase y los fusiona con los datos locales.
 * @returns {Promise<void>}
 */
async function loadAllSystemsFromSupabase() {
  const systems = ['4231', '532'];
  for (const key of systems) {
    const remote = await loadSystemFromSupabase(key);
    if (remote && typeof SYSTEMS !== 'undefined') {
      // Fusiona los datos remotos con los datos locales
      if (remote.name)        SYSTEMS[key].name        = remote.name;
      if (remote.nickname)    SYSTEMS[key].nickname    = remote.nickname;
      if (remote.description) SYSTEMS[key].description = remote.description;
      if (remote.strengths)   SYSTEMS[key].strengths   = remote.strengths;
      if (remote.weaknesses)  SYSTEMS[key].weaknesses  = remote.weaknesses;
      if (remote.positions)   SYSTEMS[key].positions   = remote.positions;
      console.log(`✅ Sistema ${key} cargado desde Supabase`);
    }
  }
}
