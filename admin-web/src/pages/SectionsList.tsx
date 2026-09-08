import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Routine, RoutineSection } from '../api/types';
import { clearSession, getStoredUser } from '../auth';
import { IconPreview, SEMANTIC_ICON_KEYS, SEMANTIC_ICON_LABELS } from '../icons';

interface SectionFormState {
  routineId: string;
  name: string;
  description: string;
  icon: string;
  required: boolean;
}

const emptySectionForm: SectionFormState = {
  routineId: '',
  name: '',
  description: '',
  icon: 'checklist',
  required: true,
};

export default function SectionsList() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [sections, setSections] = useState<RoutineSection[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutineFilter, setSelectedRoutineFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; section?: RoutineSection } | null>(null);
  const [form, setForm] = useState<SectionFormState>(emptySectionForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [routinesData, sectionsData] = await Promise.all([
        api.get<Routine[]>('/routines?establishmentId=' + user.establishmentId),
        api.get<RoutineSection[]>('/sections?establishmentId=' + user.establishmentId),
      ]);
      setRoutines(routinesData);
      setSections(sectionsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error cargando las secciones');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  function openCreate() {
    setForm({
      ...emptySectionForm,
      routineId: routines.length > 0 ? routines[0]._id : '',
    });
    setModal({ mode: 'create' });
  }

  function openEdit(section: RoutineSection) {
    const routineId = typeof section.routineId === 'object' ? section.routineId._id : section.routineId;
    setForm({
      routineId,
      name: section.name,
      description: section.description || '',
      icon: section.icon,
      required: section.required,
    });
    setModal({ mode: 'edit', section });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.routineId) {
      setError('Debes asociar la sección a una rutina.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (modal?.mode === 'create') {
        await api.post('/sections', {
          routineId: form.routineId,
          name: form.name,
          description: form.description || undefined,
          icon: form.icon || 'checklist',
          required: form.required,
          order: sections.filter((s) => {
            const rId = typeof s.routineId === 'object' ? s.routineId._id : s.routineId;
            return rId === form.routineId;
          }).length,
        });
      } else if (modal?.section) {
        await api.put('/sections/' + modal.section._id, {
          routineId: form.routineId,
          name: form.name,
          description: form.description || undefined,
          icon: form.icon || 'checklist',
          required: form.required,
        });
      }
      setModal(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error guardando la sección');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(section: RoutineSection) {
    if (!confirm('¿Desactivar la sección ' + section.name + '?')) return;
    try {
      await api.delete('/sections/' + section._id);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error eliminando sección');
    }
  }

  const filteredSections = sections.filter((s) => {
    if (selectedRoutineFilter === 'all') return true;
    const rId = typeof s.routineId === 'object' ? s.routineId._id : s.routineId;
    return rId === selectedRoutineFilter;
  });

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Logo.webp" alt="London Cafe" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <h1>London Cafe CDJ · Admin</h1>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/routines" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/sections" className="nav-item active" style={{ fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>Secciones</Link>
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
          <div>
            <h2>Gestión de Secciones</h2>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
              Administra todas las secciones operativas agrupadas o filtradas por rutina.
            </p>
          </div>
          <button className="btn" onClick={openCreate} disabled={routines.length === 0}>
            + Nueva sección
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Filtrar por rutina:</label>
          <select
            value={selectedRoutineFilter}
            onChange={(e) => setSelectedRoutineFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="all">Todas las rutinas ({sections.length})</option>
            {routines.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} ({sections.filter((s) => (typeof s.routineId === 'object' ? s.routineId._id : s.routineId) === r._id).length})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Cargando secciones…</div>
        ) : filteredSections.length === 0 ? (
          <div className="empty-state">
            {routines.length === 0
              ? 'No hay rutinas creadas todavía. Primero crea una rutina.'
              : 'No hay secciones en esta categoría.'}
          </div>
        ) : (
          <div className="card-grid">
            {filteredSections.map((section) => {
              const routineName = typeof section.routineId === 'object' ? section.routineId.name : 'Rutina';
              const routineId = typeof section.routineId === 'object' ? section.routineId._id : section.routineId;

              return (
                <div
                  className="card"
                  key={section._id}
                  onClick={() => navigate('/routines/' + routineId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-title">
                    <IconPreview name={section.icon} size={18} />
                    <span>{section.name}</span>
                  </div>
                  <div className="card-meta" style={{ marginBottom: 8 }}>
                    <span className="badge">{routineName}</span>
                    {section.required ? (
                      <span className="badge required">Requerida</span>
                    ) : (
                      <span className="badge muted">Opcional</span>
                    )}
                    <span>{section.tasksCount ?? 0} actividades</span>
                  </div>
                  {section.description && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                      {section.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      className="btn secondary small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(section);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="btn danger small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(section);
                      }}
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.mode === 'create' ? 'Nueva sección' : 'Editar sección'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Rutina a la que pertenece</label>
                <select
                  value={form.routineId}
                  onChange={(e) => setForm({ ...form, routineId: e.target.value })}
                  required
                >
                  {routines.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-col">
                <div className="field">
                  <label>Nombre de la sección</label>
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

              <label className="checkbox-row" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                />
                Sección requerida (obligatoria para finalizar rutina)
              </label>

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
