import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react'

interface Appointment {
  id: number
  customer_id: number
  date: string
  time: string
  service: string
  notes?: string
  status: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    customer_id: '',
    date: '',
    time: '',
    service: '',
    notes: '',
  })

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      // TODO: Reemplazar con API call real
      // const { data } = await appointmentsAPI.list()
      // setAppointments(data)
      setAppointments([])
    } catch (err) {
      setError('Error al cargar citas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        // TODO: API call to update
        // await appointmentsAPI.update(editingId, formData)
      } else {
        // TODO: API call to create
        // await appointmentsAPI.create(formData)
      }
      resetForm()
      loadAppointments()
    } catch (err) {
      setError('Error al guardar cita')
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro?')) return
    try {
      // TODO: API call to delete
      // await appointmentsAPI.delete(id)
      loadAppointments()
    } catch (err) {
      setError('Error al eliminar cita')
      console.error(err)
    }
  }

  const resetForm = () => {
    setFormData({ customer_id: '', date: '', time: '', service: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Cargando citas...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Citas</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Cita
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nueva'} Cita</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="ID Cliente"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Servicio"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <textarea
              placeholder="Notas"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="border rounded px-3 py-2 col-span-2"
              rows={3}
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Guardar
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No hay citas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Hora</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Servicio</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-700">{apt.date}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{apt.time}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{apt.service}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(apt.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
