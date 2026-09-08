import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { LoginResponse } from '../api/types';
import { storeSession } from '../auth';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('Admin London Cafe');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { name: username, username });
      storeSession(res.token, res.user);
      navigate('/routines', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(82, 14, 23, 0.12)',
            border: '1px solid #e6ded7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src="/Logo.webp" alt="London Cafe" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          </div>
        </div>
        <h1 style={{ textAlign: 'center' }}>London Cafe CDJ</h1>
        <p className="subtitle" style={{ textAlign: 'center' }}>Panel administrativo de rutinas</p>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="username">Nombre de usuario o empleado</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoCapitalize="words"
            autoCorrect="off"
            placeholder="ej. Admin London Cafe CDJ o Juan Pérez"
          />
        </div>
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
