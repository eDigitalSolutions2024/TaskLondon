import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Routine, RoutineType } from '../api/types';
import { clearSession, getStoredUser } from '../auth';
import { IconPreview, SEMANTIC_ICON_KEYS, SEMANTIC_ICON_LABELS } from '../icons';

const ROUTINE_TYPES: { value: RoutineType; label: string }[] = [
  { value: 'apertura', label: 'Apertura' },
  { value: 'operacion', label: 'Operación' },
  { value: 'cierre', label: 'Cierre' },
  { value: 'cambio_turno', label: 'Cambio de turno' },
  { value: 'custom', label: 'Personalizada' },
];

const SHIFT_OPTIONS: { value: 'apertura' | 'cierre' | 'ambos'; label: string }[] = [
  { value: 'ambos', label: 'Ambos turnos' },
  { value: 'apertura', label: 'Solo turno apertura' },
  { value: 'cierre', label: 'Solo turno cierre' },
];

interface RoutineFormState {
  name: string;
  description: string;
  type: RoutineType;
  icon: string;
  shift: 'apertura' | 'cierre' | 'ambos';
  schedule: string;
}

const emptyForm: RoutineFormState = {
  name: '',
  description: '',
  type: 'custom',
  icon: 'checklist',
  shift: 'ambos',
  schedule: '',
};

export default function RoutinesList() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RoutineFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Routine[]>(`/routines?establishmentId=${user.establishmentId}`);
      setRoutines(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error cargando rutinas');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/routines', {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        icon: form.icon || 'checklist',
        shift: form.shift,
        establishmentId: user.establishmentId,
        schedule: form.schedule || undefined,
        order: routines.length,
      });
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error creando rutina');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar esta rutina?')) return;
    try {
      await api.delete(`/routines/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error eliminando rutina');
    }
  }

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Logo.webp" alt="London Cafe" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <h1>London Cafe CDJ · Admin</h1>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/routines" className="nav-item active" style={{ fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/sections" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Secciones</Link>
          <Link to="/users" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Colaboradores</Link>
          <Link to="/history" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Historial & Auditoría</Link>
        </div>
        <div className="user-info">
          {user && <span>{user.name}</span>}
          <button className="btn secondary small" onClick={logout}>Salir</button>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <h2>Rutinas</h2>
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancelar' : '+ Nueva rutina'}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {showForm && (
          <form className="section-block" style={{ padding: 16, marginBottom: 20 }} onSubmit={handleCreate}>
            <div className="two-col">
              <div className="field">
                <label>Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Ícono</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  >
                    {SEMANTIC_ICON_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}: {SEMANTIC_ICON_LABELS[key]}
                      </option>
                    ))}
                  </select>
                  <IconPreview name={form.icon} size={20} />
                </div>
              </div>
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label>Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as RoutineType })}
                >
                  {ROUTINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Horario (texto libre)</label>
                <input
                  placeholder="06:00-07:00"
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Turno al que pertenece</label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as RoutineFormState['shift'] })}
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear rutina'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="loading">Cargando rutinas…</div>
        ) : routines.length === 0 ? (
          <div className="empty-state">No hay rutinas todavía. Crea la primera arriba.</div>
        ) : (
          <div className="card-grid">
            {routines.map((r) => (
              <div className="card" key={r._id} onClick={() => navigate(`/routines/${r._id}`)}>
                <div className="card-title">
                  <IconPreview name={r.icon} size={18} />
                  <span>{r.name}</span>
                </div>
                <div className="card-meta">
                  <span className="badge">{r.type}</span>
                  <span className="badge muted">
                    {r.shift === 'apertura' ? 'Turno apertura' : r.shift === 'cierre' ? 'Turno cierre' : 'Ambos turnos'}
                  </span>
                  {r.schedule && <span className="badge muted">{r.schedule}</span>}
                  <span>{r.sectionsCount ?? 0} secciones</span>
                  <span>{r.activitiesCount ?? 0} actividades</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn danger small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r._id);
                    }}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
