import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LogOut, Home, Users, Calendar, Package, BarChart3, CreditCard } from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">AdminG</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.email || 'Usuario'}</p>
        </div>

        <nav className="mt-6">
          <Link
            to="/"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Home className="w-5 h-5 mr-3" />
            Dashboard
          </Link>

          <Link
            to="/customers"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Users className="w-5 h-5 mr-3" />
            Clientes
          </Link>

          <Link
            to="/appointments"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <Calendar className="w-5 h-5 mr-3" />
            Citas
          </Link>

          {user?.plan_id && user.plan_id >= 3 && (
            <Link
              to="/inventory"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Package className="w-5 h-5 mr-3" />
              Inventario
            </Link>
          )}

          {user?.plan_id && user.plan_id >= 2 && (
            <Link
              to="/reports"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Reportes
            </Link>
          )}

          {user?.plan_id && user.plan_id >= 3 && (
            <Link
              to="/payments"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <CreditCard className="w-5 h-5 mr-3" />
              Pagos
            </Link>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8 bg-gray-100">
        <Outlet />
      </main>
    </div>
  )
}
