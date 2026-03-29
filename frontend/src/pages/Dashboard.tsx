import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

interface User {
  id: number;
  email: string;
  role: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VersionResponse {
  name: string;
  version: string;
  features: string[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Fetch user info
      const userResponse = await axios.get<User>(
        `${API_BASE}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUser(userResponse.data);

      // Fetch version/features
      const versionResponse = await axios.get<VersionResponse>(
        `${API_BASE}/api/version`
      );
      setVersion(versionResponse.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        setError('Error al cargar datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {version?.name}
            </h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* User Profile Card */}
        {user && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Información de la Cuenta
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="mb-6">
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {user.email}
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-gray-500 text-sm">ID de Usuario</p>
                  <p className="text-xl font-semibold text-gray-900">
                    #{user.id}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500 text-sm">Estado</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.is_active ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-600 font-semibold">
                          Activo
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-600 font-semibold">
                          Inactivo
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-6">
                  <p className="text-gray-500 text-sm">Plan</p>
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-1 rounded">
                    <p className="text-lg font-bold text-blue-900">
                      {user.plan.toUpperCase()}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      ✓ Acceso a todas las características incluidas
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 text-sm">Rol</p>
                  <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mt-1 rounded">
                    <p className="text-lg font-bold text-purple-900">
                      {user.role.toUpperCase()}
                    </p>
                    {user.role === 'admin' && (
                      <p className="text-sm text-purple-700 mt-1">
                        🔐 Control total del sistema
                      </p>
                    )}
                    {user.role === 'manager' && (
                      <p className="text-sm text-purple-700 mt-1">
                        📊 Gestión de recursos
                      </p>
                    )}
                    {user.role === 'viewer' && (
                      <p className="text-sm text-purple-700 mt-1">
                        👁️ Solo lectura
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-100 rounded text-sm text-gray-600">
              <p>
                Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
              </p>
              <p>
                Última actualización:{' '}
                {new Date(user.updated_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        {version && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Características Disponibles
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {version.features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <span className="text-green-600 text-xl flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-gray-900 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                🎯 Próximos Pasos:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Configura tu perfil de negocio en Configuración
                </li>
                <li>• Invita a miembros del team con roles específicos</li>
                <li>
                  • Integra MontelibanoGen para obtener descuentos especiales
                </li>
                <li>• Accede a reportes y análisis en tiempo real</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
