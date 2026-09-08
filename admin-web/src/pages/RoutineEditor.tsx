import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { RoutineFull, RoutineSection, Task, TaskType } from '../api/types';
import { IconPreview, SEMANTIC_ICON_KEYS, SEMANTIC_ICON_LABELS } from '../icons';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  checkbox: 'Casilla',
  confirmation: 'Confirmación',
  temperature: 'Temperatura',
  quantity: 'Cantidad',
  selection: 'Selección',
  text: 'Texto',
  photo: 'Foto',
  photo_confirmation: 'Foto + confirmación',
};

interface SectionFormState {
  name: string;
  description: string;
  icon: string;
  required: boolean;
}

const emptySectionForm: SectionFormState = { name: '', description: '', icon: 'checklist', required: true };

interface TaskFormState {
  title: string;
  description: string;
  type: TaskType;
  icon: string;
  required: boolean;
  requiresPhoto: boolean;
  requiresComment: boolean;
  unit: string;
  min: string;
  max: string;
  options: string[];
}

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  type: 'checkbox',
  icon: 'checklist',
  required: true,
  requiresPhoto: false,
  requiresComment: false,
  unit: '',
  min: '',
  max: '',
  options: [''],
};

export default function RoutineEditor() {
  const { routineId } = useParams<{ routineId: string }>();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<RoutineFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  const [sectionModal, setSectionModal] = useState<{ mode: 'create' | 'edit'; section?: RoutineSection } | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm);
  const [savingSection, setSavingSection] = useState(false);

  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; sectionId: string; task?: Task } | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    load();
    loadTaskTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId]);

  async function load() {
    if (!routineId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<RoutineFull>(`/routines/${routineId}/full`);
      data.sections.sort((a, b) => a.order - b.order);
      data.sections.forEach((s) => s.tasks.sort((a, b) => a.order - b.order));
      setRoutine(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error cargando la rutina');
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskTypes() {
    try {
      const types = await api.get<TaskType[]>('/tasks/types');
      setTaskTypes(types);
    } catch {
      setTaskTypes(Object.keys(TASK_TYPE_LABELS) as TaskType[]);
    }
  }

  // ---------- Sections ----------

  function openCreateSection() {
    setSectionForm(emptySectionForm);
    setSectionModal({ mode: 'create' });
  }

  function openEditSection(section: RoutineSection) {
    setSectionForm({
      name: section.name,
      description: section.description || '',
      icon: section.icon,
      required: section.required,
    });
    setSectionModal({ mode: 'edit', section });
  }

  async function submitSection(e: FormEvent) {
    e.preventDefault();
    if (!routine || !sectionModal) return;
    setSavingSection(true);
    setError(null);
    try {
      if (sectionModal.mode === 'create') {
        await api.post('/sections', {
          routineId: routine._id,
          name: sectionForm.name,
          description: sectionForm.description || undefined,
          icon: sectionForm.icon || 'checklist',
          order: routine.sections.length,
          required: sectionForm.required,
        });
      } else if (sectionModal.section) {
        await api.put(`/sections/${sectionModal.section._id}`, {
          name: sectionForm.name,
          description: sectionForm.description || undefined,
          icon: sectionForm.icon || 'checklist',
          required: sectionForm.required,
        });
      }
      setSectionModal(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error guardando la sección');
    } finally {
      setSavingSection(false);
    }
  }

  async function deleteSection(section: RoutineSection) {
    if (!confirm(`¿Desactivar la sección "${section.name}"?`)) return;
    try {
      await api.delete(`/sections/${section._id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error eliminando la sección');
    }
  }

  async function moveSection(section: RoutineSection, direction: -1 | 1) {
    if (!routine) return;
    const sections = [...routine.sections];
    const index = sections.findIndex((s) => s._id === section._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    [sections[index], sections[targetIndex]] = [sections[targetIndex], sections[index]];
    const payload = sections.map((s, i) => ({ id: s._id, order: i }));
    try {
      await api.put('/sections/reorder', { sections: payload });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error reordenando secciones');
    }
  }

  // ---------- Tasks ----------

  function openCreateTask(sectionId: string) {
    setTaskForm(emptyTaskForm);
    setTaskModal({ mode: 'create', sectionId });
  }

  function openEditTask(section: RoutineSection, task: Task) {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      type: task.type,
      icon: task.icon || 'checklist',
      required: task.required,
      requiresPhoto: task.requiresPhoto,
      requiresComment: task.requiresComment,
      unit: task.config?.unit || '',
      min: task.config?.min !== undefined ? String(task.config.min) : '',
      max: task.config?.max !== undefined ? String(task.config.max) : '',
      options: task.config?.options && task.config.options.length > 0 ? task.config.options : [''],
    });
    setTaskModal({ mode: 'edit', sectionId: section._id, task });
  }

  function buildTaskConfig(form: TaskFormState) {
    const config: { unit?: string; min?: number; max?: number; options?: string[] } = {};
    if (form.type === 'temperature' || form.type === 'quantity') {
      if (form.unit) config.unit = form.unit;
      if (form.min !== '') config.min = Number(form.min);
      if (form.max !== '') config.max = Number(form.max);
    }
    if (form.type === 'selection') {
      config.options = form.options.map((o) => o.trim()).filter(Boolean);
    }
    return config;
  }

  async function submitTask(e: FormEvent) {
    e.preventDefault();
    if (!routine || !taskModal) return;
    setSavingTask(true);
    setError(null);
    try {
      const section = routine.sections.find((s) => s._id === taskModal.sectionId);
      const config = buildTaskConfig(taskForm);
      if (taskModal.mode === 'create') {
        await api.post('/tasks', {
          sectionId: taskModal.sectionId,
          title: taskForm.title,
          description: taskForm.description || undefined,
          type: taskForm.type,
          icon: taskForm.icon || 'checklist',
          order: section ? section.tasks.length : 0,
          required: taskForm.required,
          requiresPhoto: taskForm.requiresPhoto,
          requiresComment: taskForm.requiresComment,
          config,
        });
      } else if (taskModal.task) {
        await api.put(`/tasks/${taskModal.task._id}`, {
          title: taskForm.title,
          description: taskForm.description || undefined,
          type: taskForm.type,
          icon: taskForm.icon || 'checklist',
          required: taskForm.required,
          requiresPhoto: taskForm.requiresPhoto,
          requiresComment: taskForm.requiresComment,
          config,
        });
      }
      setTaskModal(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error guardando la actividad');
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(task: Task) {
    if (!confirm(`¿Desactivar la actividad "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error eliminando la actividad');
    }
  }

  async function moveTask(section: RoutineSection, task: Task, direction: -1 | 1) {
    const tasks = [...section.tasks];
    const index = tasks.findIndex((t) => t._id === task._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tasks.length) return;
    [tasks[index], tasks[targetIndex]] = [tasks[targetIndex], tasks[index]];
    const payload = tasks.map((t, i) => ({ id: t._id, order: i }));
    try {
      await api.put('/tasks/reorder', { tasks: payload });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error reordenando actividades');
    }
  }

  const typesToShow = useMemo(
    () => (taskTypes.length > 0 ? taskTypes : (Object.keys(TASK_TYPE_LABELS) as TaskType[])),
    [taskTypes]
  );

  if (loading) return <div className="loading">Cargando rutina…</div>;
  if (!routine) {
    return (
      <div className="page-container">
        {error && <div className="error-banner">{error}</div>}
        <Link to="/routines">Volver a rutinas</Link>
      </div>
    );
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
        <button className="btn secondary small" onClick={() => navigate('/routines')}>Volver</button>
      </div>

      <div className="page-container">
        <div className="breadcrumb">
          <Link to="/routines">Rutinas</Link> / {routine.name}
        </div>
        <div className="page-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPreview name={routine.icon} size={22} />
            {routine.name}
          </h2>
          <button className="btn" onClick={openCreateSection}>+ Nueva sección</button>
        </div>
        {routine.description && <p style={{ color: '#7a7264', marginTop: -10 }}>{routine.description}</p>}

        {error && <div className="error-banner">{error}</div>}

        {routine.sections.length === 0 ? (
          <div className="empty-state">Esta rutina no tiene secciones todavía.</div>
        ) : (
          routine.sections.map((section, sIndex) => (
            <div className="section-block" key={section._id}>
              <div className="section-header">
                <div className="section-title">
                  <IconPreview name={section.icon} size={18} />
                  <span>{section.name}</span>
                  {section.required && <span className="badge required">requerida</span>}
                  <span className="badge muted">{section.tasks.length} actividades</span>
                </div>
                <div className="section-actions">
                  <button className="btn secondary small" disabled={sIndex === 0} onClick={() => moveSection(section, -1)}>↑</button>
                  <button
                    className="btn secondary small"
                    disabled={sIndex === routine.sections.length - 1}
                    onClick={() => moveSection(section, 1)}
                  >
                    ↓
                  </button>
                  <button className="btn secondary small" onClick={() => openEditSection(section)}>Editar</button>
                  <button className="btn danger small" onClick={() => deleteSection(section)}>Eliminar</button>
                  <button className="btn small" onClick={() => openCreateTask(section._id)}>+ Actividad</button>
                </div>
              </div>
              <div className="task-list">
                {section.tasks.length === 0 ? (
                  <div className="empty-state">Sin actividades.</div>
                ) : (
                  section.tasks.map((task, tIndex) => (
                    <div className="task-row" key={task._id}>
                      <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconPreview name={task.icon || 'checklist'} size={18} />
                        <strong>{task.title}</strong>
                        <span className="badge">{TASK_TYPE_LABELS[task.type] || task.type}</span>
                        {task.required && <span className="badge required">requerida</span>}
                        {task.requiresPhoto && <span className="badge muted">foto</span>}
                        {task.requiresComment && <span className="badge muted">comentario</span>}
                      </div>
                      <div className="task-actions">
                        <button className="btn secondary small" disabled={tIndex === 0} onClick={() => moveTask(section, task, -1)}>↑</button>
                        <button
                          className="btn secondary small"
                          disabled={tIndex === section.tasks.length - 1}
                          onClick={() => moveTask(section, task, 1)}
                        >
                          ↓
                        </button>
                        <button className="btn secondary small" onClick={() => openEditTask(section, task)}>Editar</button>
                        <button className="btn danger small" onClick={() => deleteTask(task)}>Eliminar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {sectionModal && (
        <div className="modal-backdrop" onClick={() => setSectionModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{sectionModal.mode === 'create' ? 'Nueva sección' : 'Editar sección'}</h3>
            <form onSubmit={submitSection}>
              <div className="two-col">
                <div className="field">
                  <label>Nombre</label>
                  <input
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Ícono</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={sectionForm.icon}
                      onChange={(e) => setSectionForm({ ...sectionForm, icon: e.target.value })}
                    >
                      {SEMANTIC_ICON_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}: {SEMANTIC_ICON_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    <IconPreview name={sectionForm.icon} size={20} />
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea
                  value={sectionForm.description}
                  onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={sectionForm.required}
                  onChange={(e) => setSectionForm({ ...sectionForm, required: e.target.checked })}
                />
                Sección requerida
              </label>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setSectionModal(null)}>Cancelar</button>
                <button type="submit" className="btn" disabled={savingSection}>
                  {savingSection ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskModal && (
        <div className="modal-backdrop" onClick={() => setTaskModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{taskModal.mode === 'create' ? 'Nueva actividad' : 'Editar actividad'}</h3>
            <form onSubmit={submitTask}>
              <div className="field">
                <label>Título</label>
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="two-col">
                <div className="field">
                  <label>Tipo</label>
                  <select
                    value={taskForm.type}
                    onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as TaskType })}
                  >
                    {typesToShow.map((t) => (
                      <option key={t} value={t}>{TASK_TYPE_LABELS[t] || t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Ícono</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={taskForm.icon}
                      onChange={(e) => setTaskForm({ ...taskForm, icon: e.target.value })}
                    >
                      {SEMANTIC_ICON_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}: {SEMANTIC_ICON_LABELS[key]}
                        </option>
                      ))}
                    </select>
                    <IconPreview name={taskForm.icon} size={20} />
                  </div>
                </div>
              </div>

              {(taskForm.type === 'temperature' || taskForm.type === 'quantity') && (
                <div className="two-col">
                  <div className="field">
                    <label>Unidad</label>
                    <input
                      placeholder={taskForm.type === 'temperature' ? '°C' : 'bolsas'}
                      value={taskForm.unit}
                      onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Mínimo</label>
                    <input
                      type="number"
                      value={taskForm.min}
                      onChange={(e) => setTaskForm({ ...taskForm, min: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Máximo</label>
                    <input
                      type="number"
                      value={taskForm.max}
                      onChange={(e) => setTaskForm({ ...taskForm, max: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {taskForm.type === 'selection' && (
                <div className="field">
                  <label>Opciones</label>
                  <div className="options-list">
                    {taskForm.options.map((opt, i) => (
                      <div className="option-row" key={i}>
                        <input
                          value={opt}
                          onChange={(e) => {
                            const options = [...taskForm.options];
                            options[i] = e.target.value;
                            setTaskForm({ ...taskForm, options });
                          }}
                          placeholder={`Opción ${i + 1}`}
                        />
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => {
                            const options = taskForm.options.filter((_, idx) => idx !== i);
                            setTaskForm({ ...taskForm, options: options.length > 0 ? options : [''] });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => setTaskForm({ ...taskForm, options: [...taskForm.options, ''] })}
                    >
                      + Opción
                    </button>
                  </div>
                </div>
              )}

              <label className="checkbox-row" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={taskForm.required}
                  onChange={(e) => setTaskForm({ ...taskForm, required: e.target.checked })}
                />
                Requerida
              </label>
              <label className="checkbox-row" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={taskForm.requiresPhoto}
                  onChange={(e) => setTaskForm({ ...taskForm, requiresPhoto: e.target.checked })}
                />
                Requiere foto
              </label>
              <label className="checkbox-row" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={taskForm.requiresComment}
                  onChange={(e) => setTaskForm({ ...taskForm, requiresComment: e.target.checked })}
                />
                Requiere comentario
              </label>

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setTaskModal(null)}>Cancelar</button>
                <button type="submit" className="btn" disabled={savingTask}>
                  {savingTask ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
