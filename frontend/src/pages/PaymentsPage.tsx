import { useState, useEffect } from 'react'
import { CreditCard, Plus, Download, AlertCircle } from 'lucide-react'

interface Transaction {
  id: number
  date: string
  customer: string
  service: string
  amount: number
  status: string
  payment_method: string
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      // TODO: Reemplazar con API call real
      // const { data: payments } = await paymentsAPI.transactions()
      // const { data: bal } = await paymentsAPI.balance()
      // setTransactions(payments)
      // setBalance(bal.balance)
      setTransactions([])
      setBalance(0)
    } catch (err) {
      setError('Error al cargar pagos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = transactions.reduce((sum, t) => (t.status === 'completed' ? sum + t.amount : sum), 0)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Cargando pagos...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="w-5 h-5" />
            Descargar
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            Nuevo Pago
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Saldo Disponible</p>
          <p className="text-3xl font-bold text-green-600">${balance.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Ingresos Totales</p>
          <p className="text-3xl font-bold text-blue-600">${totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total de Transacciones</p>
          <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
        </div>
      </div>

      {/* Transactions Table */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No hay transacciones registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Servicio</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Método</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-700">{tx.date}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{tx.customer}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{tx.service}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                    ${tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{tx.payment_method}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        tx.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {tx.status === 'completed' ? 'Completado' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bank Details Section */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cuenta</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Banco</p>
            <p className="font-semibold text-gray-900">Banco Ejemplo</p>
          </div>
          <div>
            <p className="text-gray-600">Cuenta</p>
            <p className="font-semibold text-gray-900">1234567890</p>
          </div>
          <div>
            <p className="text-gray-600">CBU</p>
            <p className="font-semibold text-gray-900">123456789012345678901234</p>
          </div>
          <div>
            <p className="text-gray-600">Actual. de Saldo</p>
            <p className="font-semibold text-gray-900">Hoy a las 12:30</p>
          </div>
        </div>
      </div>
    </div>
  )
}
