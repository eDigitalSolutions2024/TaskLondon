import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { ManagedUser } from '../api/types';
import { clearSession, getStoredUser } from '../auth';

interface UserFormState {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  shift: 'apertura' | 'cierre' | '';
}

const emptyUserForm: UserFormState = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'employee',
  shift: 'apertura',
};

export default function UsersList() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; target?: ManagedUser } | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
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
      const data = await api.get<ManagedUser[]>('/users?establishmentId=' + user.establishmentId);
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error cargando los colaboradores');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  function openCreate() {
    setForm(emptyUserForm);
    setModal({ mode: 'create' });
  }

  function openEdit(target: ManagedUser) {
    setForm({
      name: target.name,
      username: target.username,
      email: target.email || '',
      password: '',
      role: target.role,
      shift: target.shift || '',
    });
    setModal({ mode: 'edit', target });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      if (modal?.mode === 'create') {
        await api.post('/users', {
          name: form.name,
          username: form.username,
          email: form.email || undefined,
          password: form.password || undefined,
          role: form.role,
          shift: form.role === 'employee' ? form.shift || undefined : undefined,
          establishmentId: user.establishmentId,
        });
      } else if (modal?.target) {
        await api.put('/users/' + modal.target.id, {
          name: form.name,
          username: form.username,
          email: form.email || undefined,
          password: form.password || undefined,
          role: form.role,
          shift: form.role === 'employee' ? form.shift || undefined : undefined,
        });
      }
      setModal(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error guardando el colaborador');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(target: ManagedUser) {
    const verb = target.active ? 'desactivar' : 'reactivar';
    if (!confirm(`¿Seguro que quieres ${verb} a ${target.name}?`)) return;
    try {
      if (target.active) {
        await api.delete('/users/' + target.id);
      } else {
        await api.put('/users/' + target.id, { active: true });
      }
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error actualizando el colaborador');
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
          <Link to="/routines" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/sections" className="nav-item" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Secciones</Link>
          <Link to="/users" className="nav-item active" style={{ fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>Colaboradores</Link>
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
            <h2>Gestión de Colaboradores</h2>
            <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
              Da de alta administradores y empleados que podrán iniciar sesión en la app móvil.
            </p>
          </div>
          <button className="btn" onClick={openCreate}>
            + Nuevo colaborador
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">Cargando colaboradores…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">Aún no hay colaboradores registrados.</div>
        ) : (
          <div className="card-grid">
            {users.map((u) => (
              <div className="card" key={u.id}>
                <div className="card-title">
                  <span>{u.name}</span>
                </div>
                <div className="card-meta" style={{ marginBottom: 8 }}>
                  <span className="badge">@{u.username}</span>
                  <span className={u.role === 'admin' ? 'badge required' : 'badge muted'}>
                    {u.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>
                  {u.role === 'employee' && u.shift && (
                    <span className="badge">{u.shift === 'apertura' ? 'Turno apertura' : 'Turno cierre'}</span>
                  )}
                  {!u.active && <span className="badge muted">Inactivo</span>}
                </div>
                {u.email && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>{u.email}</p>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn secondary small" onClick={() => openEdit(u)}>
                    Editar
                  </button>
                  <button className="btn danger small" onClick={() => handleToggleActive(u)}>
                    {u.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.mode === 'create' ? 'Nuevo colaborador' : 'Editar colaborador'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="two-col">
                <div className="field">
                  <label>Nombre completo</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Usuario (para iniciar sesión)</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </div>
              </div>

              <div className="two-col">
                <div className="field">
                  <label>Correo (opcional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Contraseña {modal.mode === 'edit' ? '(dejar vacío para no cambiar)' : '(opcional)'}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={modal.mode === 'edit' ? '••••••••' : 'Puede entrar solo con su nombre'}
                  />
                </div>
              </div>

              <div className="two-col">
                <div className="field">
                  <label>Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'employee' })}
                  >
                    <option value="employee">Colaborador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {form.role === 'employee' && (
                  <div className="field">
                    <label>Turno habitual</label>
                    <select
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value as 'apertura' | 'cierre' })}
                    >
                      <option value="apertura">Apertura</option>
                      <option value="cierre">Cierre</option>
                    </select>
                  </div>
                )}
              </div>

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
