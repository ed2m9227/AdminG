import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

interface RegisterResponse {
  id: number;
  email: string;
  role: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PLANS = [
  {
    id: 'free',
    name: 'AdminG Free',
    price: '$0',
    description: 'Para empezar',
  },
  {
    id: 'basic',
    name: 'AdminG Basic',
    price: '$5.000',
    description: 'Pequeñas empresas',
  },
  {
    id: 'plus',
    name: 'AdminG Plus',
    price: '$30.000',
    description: 'Empresas en crecimiento',
  },
  {
    id: 'start',
    name: 'AdminPro Start',
    price: '$50.000',
    description: 'Con inventario',
  },
  {
    id: 'max',
    name: 'AdminPro 100k',
    price: '$100.000',
    description: 'Solución completa',
  },
];

const ROLES = [
  { id: 'viewer', name: 'Viewer (Solo lectura)' },
  { id: 'manager', name: 'Manager (Gestor)' },
  { id: 'admin', name: 'Admin (Control total)' },
];

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [plan, setPlan] = useState('free');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post<RegisterResponse>(
        `${API_BASE}/auth/register`,
        {
          email,
          password,
          plan,
          role,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        window.location.href = '/login?next=/onboarding';
      }, 1200);
    } catch (err: any) {
      const message = err.response?.data?.detail;
      setError(message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Crear Cuenta AdminG
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Únete a miles de negocios que confían en AdminG
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            ✓ Registro exitoso. Redirigiendo a login...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.price}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol en el Sistema
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-2">
              {role === 'viewer' && '👁️ Solo puedes ver información'}
              {role === 'manager' && '📊 Puedes gestionar clientes y reportes'}
              {role === 'admin' && '🔐 Control total del sistema'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Planes Disponibles:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {PLANS.map((p) => (
              <div key={p.id}>
                <span className="font-medium">{p.name}:</span> {p.description}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">
            Inicia sesión aquí
          </a>
        </p>
      </div>
    </div>
  );
}
