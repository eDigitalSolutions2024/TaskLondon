import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { RoutineRunHistory, RoutineType } from '../api/types';
import { clearSession, getStoredUser } from '../auth';
import { IconPreview } from '../icons';

interface RunDetailData {
  _id: string;
  routine: { _id: string; name: string; type: RoutineType; icon?: string };
  employee?: { _id: string; name: string; username?: string; shift?: string };
  date: string;
  shift: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  sections: Array<{
    sectionRun: { _id: string; sectionId: string; status: string };
    name: string;
    icon?: string;
    required?: boolean;
    tasks: Array<{
      _id: string;
      title: string;
      icon?: string;
      type: string;
      required: boolean;
      requiresPhoto: boolean;
      result?: {
        value: any;
        comment?: string;
        photoUrl?: string;
        photoUrls?: string[];
        completedAt?: string;
      } | null;
    }>;
  }>;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(dateStr: string): string {
  // dateStr viene como YYYY-MM-DD; se construye en horario local para evitar
  // que se corra un día por interpretación UTC.
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const label = dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  if (dateStr === todayStr()) return `Hoy · ${capitalized}`;
  if (dateStr === daysAgoStr(1)) return `Ayer · ${capitalized}`;
  return capitalized;
}

export default function HistoryList() {
  const navigate = useNavigate();
  const user = getStoredUser();

  // Rango de días a consultar (por defecto, las últimas 2 semanas) — el
  // historial se agrupa y despliega por día, no como una lista plana.
  const [rangeFrom, setRangeFrom] = useState<string>(daysAgoStr(13));
  const [rangeTo, setRangeTo] = useState<string>(todayStr());
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [history, setHistory] = useState<RoutineRunHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([todayStr()]));

  // Modal de detalle de ejecución
  const [selectedRun, setSelectedRun] = useState<RunDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal para ver foto ampliada
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, shiftFilter]);

  async function loadHistory() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/runs/history?establishmentId=${user.establishmentId}`;
      if (rangeFrom) url += `&from=${rangeFrom}`;
      if (rangeTo) url += `&to=${rangeTo}`;
      if (shiftFilter !== 'all') url += `&shift=${shiftFilter}`;

      const data = await api.get<RoutineRunHistory[]>(url);
      setHistory(data);
      setExpandedDays((prev) => {
        // Mantén expandido lo que ya estaba, pero asegura que el día de hoy
        // (si viene en el rango) empiece expandido en la primera carga.
        if (prev.size > 0) return prev;
        return new Set([todayStr()]);
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  // Agrupa las ejecuciones por día (el backend ya las entrega ordenadas
  // date desc, createdAt desc, así que solo se preserva ese orden al agrupar).
  const historyByDay: Array<{ day: string; runs: RoutineRunHistory[] }> = [];
  {
    const map = new Map<string, RoutineRunHistory[]>();
    for (const run of history) {
      const list = map.get(run.date) || [];
      list.push(run);
      map.set(run.date, list);
    }
    for (const [day, runs] of map.entries()) {
      historyByDay.push({ day, runs });
    }
    historyByDay.sort((a, b) => (a.day < b.day ? 1 : -1));
  }

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  async function openRunDetail(runItem: RoutineRunHistory) {
    setLoadingDetail(true);
    setModalError(null);
    setSelectedRun(null);
    try {
      // 1. Obtener datos del run y sus secciones
      const runData = await api.get<any>(`/runs/${runItem._id}`);
      const routineName =
        typeof runItem.routine === 'object' ? runItem.routine.name : 'Rutina';
      const routineIcon =
        typeof runItem.routine === 'object' ? runItem.routine.icon : 'checklist';
      const routineType =
        typeof runItem.routine === 'object' ? runItem.routine.type : 'custom';

      // 2. Para cada sección en el progreso, cargar actividades y resultados
      const sectionDetails = await Promise.all(
        (runData.progress?.sections || []).map(async (s: any) => {
          try {
            const secData = await api.get<any>(`/runs/${runItem._id}/sections/${s.sectionId}`);
            return {
              sectionRun: secData.sectionRun,
              name: s.name || 'Sección',
              icon: s.icon,
              required: s.required,
              tasks: secData.tasks || [],
            };
          } catch {
            return {
              sectionRun: { _id: s.sectionRunId, sectionId: s.sectionId, status: s.status },
              name: s.name || 'Sección',
              icon: s.icon,
              required: s.required,
              tasks: [],
            };
          }
        })
      );

      setSelectedRun({
        _id: runItem._id,
        routine: { _id: runData.routineId, name: routineName, icon: routineIcon, type: routineType },
        employee: runItem.employee || undefined,
        date: runItem.date,
        shift: runItem.shift,
        status: runItem.status,
        startedAt: runItem.startedAt,
        completedAt: runItem.completedAt,
        sections: sectionDetails,
      });
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Error cargando detalle');
    } finally {
      setLoadingDetail(false);
    }
  }

  function formatValue(val: any): { label: string; color: string; bg: string } {
    if (val === true || val === 'ok' || val === 'completed' || val === 'Bien') {
      return { label: 'Bien', color: '#1b5e20', bg: '#e8f5e9' };
    }
    if (val === false || val === 'failed' || val === 'Falla') {
      return { label: 'Falla', color: '#b71c1c', bg: '#ffebee' };
    }
    if (val === 'na' || val === 'n/a' || val === 'N/A') {
      return { label: 'N/A', color: '#546e7a', bg: '#eceff1' };
    }
    if (typeof val === 'number') {
      return { label: `${val}`, color: '#0d47a1', bg: '#e3f2fd' };
    }
    if (typeof val === 'string' && val.trim()) {
      return { label: val, color: '#333', bg: '#f5f5f5' };
    }
    return { label: 'Sin respuesta', color: '#9e9e9e', bg: '#fafafa' };
  }

  const shiftCount = {
    total: history.length,
    apertura: history.filter((h) => h.shift === 'apertura').length,
    cierre: history.filter((h) => h.shift === 'cierre').length,
    completados: history.filter((h) => h.status === 'completed').length,
  };

  return (
    <div>
      {/* Barra superior */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/Logo.webp" alt="London Cafe" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <h1>London Cafe CDJ · Admin</h1>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/routines" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            Rutinas
          </Link>
          <Link to="/sections" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            Secciones
          </Link>
          <Link to="/users" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            Colaboradores
          </Link>
          <Link
            to="/history"
            className="nav-item active"
            style={{ fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}
          >
            Historial & Auditoría
          </Link>
        </div>
        <div className="user-info">
          {user && <span>{user.name}</span>}
          <button className="btn secondary small" onClick={logout}>
            Salir
          </button>
        </div>
      </div>

      <div className="page-container">
        <div className="page-header">
          <div>
            <h2>Historial de Ejecución & Auditoría</h2>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
              Supervisa las rutinas realizadas diariamente por turno, evidencias fotográficas y estado de actividades.
            </p>
          </div>
        </div>

        {/* Filtros de fecha y turno */}
        <div
          className="section-block"
          style={{
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0, minWidth: 150 }}>
              <label>Desde</label>
              <input
                type="date"
                value={rangeFrom}
                max={rangeTo}
                onChange={(e) => setRangeFrom(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>
            <div className="field" style={{ margin: 0, minWidth: 150 }}>
              <label>Hasta</label>
              <input
                type="date"
                value={rangeTo}
                min={rangeFrom}
                max={todayStr()}
                onChange={(e) => setRangeTo(e.target.value)}
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="field" style={{ margin: 0, minWidth: 160 }}>
              <label>Turno</label>
              <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                <option value="all">Todos los turnos</option>
                <option value="apertura">Apertura (9:00 - 15:00)</option>
                <option value="cierre">Cierre (15:00 - 22:00)</option>
                <option value="operacion">Operación</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <button
              className="btn secondary small"
              style={{ marginTop: 18 }}
              onClick={() => {
                setRangeFrom(daysAgoStr(13));
                setRangeTo(todayStr());
                setShiftFilter('all');
                setExpandedDays(new Set([todayStr()]));
              }}
            >
              Últimos 14 días
            </button>
          </div>

          {/* Resumen numérico */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                backgroundColor: 'rgba(122, 28, 40, 0.08)',
                padding: '6px 12px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700 }}>Total Rutinas</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand)' }}>{shiftCount.total}</div>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(58, 125, 68, 0.1)',
                padding: '6px 12px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>Completadas</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{shiftCount.completados}</div>
            </div>
            <div
              style={{
                backgroundColor: '#fff',
                border: '1px solid var(--border)',
                padding: '6px 12px',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>Apertura / Cierre</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                {shiftCount.apertura} / {shiftCount.cierre}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Cargando registros del historial…</div>
        ) : historyByDay.length === 0 ? (
          <div className="empty-state">
            No se encontraron rutinas ejecutadas entre <strong>{rangeFrom}</strong> y <strong>{rangeTo}</strong>
            {shiftFilter !== 'all' && ` en el turno de ${shiftFilter}`}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historyByDay.map(({ day, runs }) => {
              const isOpen = expandedDays.has(day);
              const completadas = runs.filter((r) => r.status === 'completed').length;
              const totalIncidents = runs.reduce((sum, r) => sum + (r.incidentsCount || 0), 0);

              return (
                <div key={day} className="section-block" style={{ overflow: 'hidden', padding: 0 }}>
                  {/* Encabezado del día — click para expandir/colapsar */}
                  <div
                    onClick={() => toggleDay(day)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: isOpen ? 'rgba(122, 28, 40, 0.06)' : '#faf8f4',
                      cursor: 'pointer',
                      borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>
                        ▸
                      </span>
                      <strong style={{ fontSize: 15, textTransform: 'capitalize' }}>{formatDayLabel(day)}</strong>
                      <span className="badge">{runs.length} {runs.length === 1 ? 'rutina' : 'rutinas'}</span>
                      <span className="badge" style={{ backgroundColor: 'rgba(58, 125, 68, 0.12)', color: 'var(--success)', border: 'none' }}>
                        {completadas} completadas
                      </span>
                      {totalIncidents > 0 && (
                        <span className="badge" style={{ backgroundColor: 'rgba(198, 40, 40, 0.1)', color: 'var(--danger)', border: 'none' }}>
                          ⚠️ {totalIncidents} incidencias
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{day}</span>
                  </div>

                  {/* Rutinas del día (solo si está expandido) */}
                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
                      {runs.map((run) => {
                        const routineName =
                          typeof run.routine === 'object' && run.routine?.name ? run.routine.name : 'Rutina';
                        const routineIcon =
                          typeof run.routine === 'object' && run.routine?.icon ? run.routine.icon : 'checklist';
                        const percentage = run.progress?.percentage ?? 0;
                        const isCompleted = run.status === 'completed';

                        return (
                          <div
                            key={run._id}
                            className="card"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 16,
                              gap: 16,
                              cursor: 'pointer',
                            }}
                            onClick={() => openRunDetail(run)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 8,
                                  backgroundColor: isCompleted ? 'rgba(58, 125, 68, 0.12)' : 'rgba(122, 28, 40, 0.08)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <IconPreview name={routineIcon} size={22} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: 16 }}>{routineName}</strong>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: run.shift === 'apertura' ? '#fff3e0' : '#ede7f6',
                                      color: run.shift === 'apertura' ? '#e65100' : '#4527a0',
                                      border: 'none',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    Turno {run.shift}
                                  </span>
                                  <span
                                    className={`badge ${isCompleted ? '' : 'muted'}`}
                                    style={{
                                      backgroundColor: isCompleted ? 'rgba(58, 125, 68, 0.15)' : undefined,
                                      color: isCompleted ? 'var(--success)' : undefined,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {isCompleted ? '✓ Completada' : 'En progreso'}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: 'var(--muted)',
                                    marginTop: 4,
                                    display: 'flex',
                                    gap: 12,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span>
                                    👤 <strong>{run.employee?.name || 'Empleado'}</strong>
                                  </span>
                                  <span>
                                    {run.startedAt && `Iniciado: ${new Date(run.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                                  </span>
                                  <span>📷 {run.photosCount} fotos capturadas</span>
                                  {run.incidentsCount > 0 && (
                                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                                      ⚠️ {run.incidentsCount} incidencias
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Progreso visual y botón */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ textAlign: 'right', minWidth: 90 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: isCompleted ? 'var(--success)' : 'var(--brand)' }}>
                                  {percentage}%
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  {run.progress?.completedActivities ?? 0}/{run.progress?.totalActivities ?? 0} tareas
                                </div>
                              </div>
                              <button className="btn small" onClick={(e) => { e.stopPropagation(); openRunDetail(run); }}>
                                Auditar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL DE AUDITORÍA DETALLADA */}
        {(selectedRun || loadingDetail) && (
          <div className="modal-backdrop" onClick={() => !loadingDetail && setSelectedRun(null)}>
            <div
              className="modal"
              style={{ width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {loadingDetail ? (
                <div className="loading">Cargando inspección detallada…</div>
              ) : selectedRun ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconPreview name={selectedRun.routine.icon || 'checklist'} size={24} />
                        <h3 style={{ margin: 0 }}>{selectedRun.routine.name}</h3>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: selectedRun.shift === 'apertura' ? '#fff3e0' : '#ede7f6',
                            color: selectedRun.shift === 'apertura' ? '#e65100' : '#4527a0',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {selectedRun.shift}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                        Empleado: <strong>{selectedRun.employee?.name || 'N/A'}</strong> · Fecha: <strong>{selectedRun.date}</strong>
                        {selectedRun.completedAt && ` · Finalizado: ${new Date(selectedRun.completedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                    <button className="btn secondary small" onClick={() => setSelectedRun(null)}>✕ Cerrar</button>
                  </div>

                  {modalError && <div className="error-banner">{modalError}</div>}

                  {/* Secciones y Tareas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                    {selectedRun.sections.map((section, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          backgroundColor: '#faf8f4',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#f1e8dd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 700,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconPreview name={section.icon || 'checklist'} size={18} />
                            <span>{section.name}</span>
                            {section.required && <span className="badge required">Obligatoria</span>}
                          </div>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: section.sectionRun.status === 'completed' ? 'rgba(58, 125, 68, 0.15)' : undefined,
                              color: section.sectionRun.status === 'completed' ? 'var(--success)' : undefined,
                            }}
                          >
                            {section.sectionRun.status === 'completed' ? 'Completada' : 'Pendiente'}
                          </span>
                        </div>

                        <div style={{ padding: '8px 14px', backgroundColor: '#fff' }}>
                          {section.tasks.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>Sin actividades en esta sección.</div>
                          ) : (
                            section.tasks.map((task) => {
                              const res = task.result;
                              const formatted = res ? formatValue(res.value) : { label: 'Sin respuesta', color: '#9e9e9e', bg: '#fafafa' };
                              const photos = res?.photoUrls && res.photoUrls.length > 0 ? res.photoUrls : res?.photoUrl ? [res.photoUrl] : [];

                              return (
                                <div
                                  key={task._id}
                                  style={{
                                    borderBottom: '1px solid var(--border)',
                                    padding: '10px 0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <IconPreview name={task.icon || 'checklist'} size={16} />
                                      <strong style={{ fontSize: 14 }}>{task.title}</strong>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: formatted.color,
                                        backgroundColor: formatted.bg,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        border: `1px solid ${formatted.color}33`,
                                      }}
                                    >
                                      {formatted.label}
                                    </span>
                                  </div>

                                  {/* Comentarios del empleado */}
                                  {res?.comment && (
                                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', paddingLeft: 24 }}>
                                      💬 Nota: "{res.comment}"
                                    </div>
                                  )}

                                  {/* Galería de fotos capturadas */}
                                  {photos.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, paddingLeft: 24, marginTop: 4, flexWrap: 'wrap' }}>
                                      {photos.map((url, pIdx) => (
                                        <img
                                          key={pIdx}
                                          src={url}
                                          alt={`Evidencia ${pIdx + 1}`}
                                          style={{
                                            width: 60,
                                            height: 60,
                                            objectFit: 'cover',
                                            borderRadius: 6,
                                            border: '1.5px solid var(--border)',
                                            cursor: 'pointer',
                                          }}
                                          onClick={() => setExpandedPhoto(url)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-actions" style={{ marginTop: 20 }}>
                    <button className="btn" onClick={() => setSelectedRun(null)}>Listo</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* MODAL DE FOTO EN TAMAÑO COMPLETO */}
        {expandedPhoto && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 100, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setExpandedPhoto(null)}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img
                src={expandedPhoto}
                alt="Evidencia fotográfica ampliada"
                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
              />
              <button
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedPhoto(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
