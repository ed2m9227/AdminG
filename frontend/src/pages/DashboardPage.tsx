import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { customersAPI, reportsAPI, plansAPI } from '../api/client';
import { BarChart3, Users, Zap } from 'lucide-react';

interface DashboardMetrics {
  total_revenue: number;
  total_appointments: number;
  total_customers: number;
  occupancy_rate: number;
  average_service_value: number;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        // Cargar métricas
        const { data: dashData } = await reportsAPI.dashboard(30);
        setMetrics(dashData);

        // Cargar clientes
        const { data: customersData } = await customersAPI.list();
        setCustomerCount(customersData.length);

        // Cargar plan del usuario
        const { data: plansData } = await plansAPI.list();
        const userPlan = plansData.find((p: any) => p.id === user.plan_id);
        setPlan(userPlan);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  const planFeatures = plan?.features || [];
  const hasReports = planFeatures.some((f: any) => f.feature_code === 'reports');
  const hasInventory = planFeatures.some((f: any) => f.feature_code === 'inventory');
  const hasPayments = planFeatures.some((f: any) => f.feature_code === 'payments');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AdminG / AdminPro</h1>
            <p className="text-sm text-gray-600 mt-1">Plan: {plan?.display_name || 'Cargando...'}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${metrics.total_revenue.toFixed(2)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Citas (30 días)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.total_appointments}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Clientes Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customerCount}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Ocupación</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.occupancy_rate.toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a
            href="/customers"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clientes</h3>
            <p className="text-sm text-gray-600">Gestión de clientes y contactos</p>
            <div className="mt-4 text-blue-600 font-semibold text-sm">Ver →</div>
          </a>

          <a
            href="/appointments"
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Citas</h3>
            <p className="text-sm text-gray-600">Agenda y programación</p>
            <div className="mt-4 text-blue-600 font-semibold text-sm">Ver →</div>
          </a>

          {hasReports && (
            <a
              href="/reports"
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
              <p className="text-sm text-gray-600">Análisis y métricas detalladas</p>
              <div className="mt-4 text-blue-600 font-semibold text-sm">Ver →</div>
            </a>
          )}

          {hasInventory && (
            <a
              href="/inventory"
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventario</h3>
              <p className="text-sm text-gray-600">Gestión de almacén y SKUs</p>
              <div className="mt-4 text-blue-600 font-semibold text-sm">Ver →</div>
            </a>
          )}

          {hasPayments && (
            <a
              href="/payments"
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagos</h3>
              <p className="text-sm text-gray-600">Transacciones y facturación</p>
              <div className="mt-4 text-blue-600 font-semibold text-sm">Ver →</div>
            </a>
          )}
        </div>

        {/* Upgrade CTA */}
        {plan && !hasPayments && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Actualiza tu plan para más funcionalidades
            </h3>
            <p className="text-gray-600 mb-4">
              Tu plan {plan.display_name} no incluye inventario, pagos y análisis avanzado. Actualiza ahora a AdminPro Start.
            </p>
            <a
              href="/plans"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Ver planes →
            </a>
          </div>
        )}
      </main>
    </div>
  );
};
