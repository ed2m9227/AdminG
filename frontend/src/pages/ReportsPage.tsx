import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface ReportData {
  total_revenue: number
  average_appointment_value: number
  total_appointments: number
  new_customers: number
  appointment_completion_rate: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadReports()
  }, [days])

  const loadReports = async () => {
    try {
      setLoading(true)
      // TODO: Reemplazar con API call real
      // const { data } = await reportsAPI.revenue(?days=${days})
      // setData(data)
      setData({
        total_revenue: 45000,
        average_appointment_value: 1500,
        total_appointments: 30,
        new_customers: 8,
        appointment_completion_rate: 92,
      })
    } catch (err) {
      setError('Error al cargar reportes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Cargando reportes...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Metrics */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {/* Revenue Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${data.total_revenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Avg Appointment Value */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Valor Promedio Cita</p>
              <p className="text-2xl font-bold text-gray-900">
                ${data.average_appointment_value.toLocaleString()}
              </p>
            </div>

            {/* Total Appointments */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total de Citas</p>
              <p className="text-2xl font-bold text-gray-900">{data.total_appointments}</p>
            </div>

            {/* New Customers */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Clientes Nuevos</p>
              <p className="text-2xl font-bold text-gray-900">{data.new_customers}</p>
            </div>

            {/* Completion Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Tasa de Completitud</p>
              <p className="text-2xl font-bold text-blue-600">{data.appointment_completion_rate}%</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Chart Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Día</h3>
              <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                <p className="text-gray-400">Gráfico de ingresos (implementar Chart.js)</p>
              </div>
            </div>

            {/* Appointments Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Citas por Servicio</h3>
              <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                <p className="text-gray-400">Gráfico de servicios (implementar Chart.js)</p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Los gráficos utilizarán Chart.js o Recharts. Los datos mostrados son
              datos de demostración.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
