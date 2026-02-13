import { useState, useEffect } from 'react'
import { Package, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react'

interface InventoryItem {
  id: number
  name: string
  sku: string
  quantity: number
  min_stock: number
  price: number
  category: string
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity: '',
    min_stock: '',
    price: '',
    category: '',
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      // TODO: Reemplazar con API call real
      // const { data } = await inventoryAPI.list()
      // setItems(data)
      setItems([])
    } catch (err) {
      setError('Error al cargar inventario')
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
        // await inventoryAPI.update(editingId, formData)
      } else {
        // TODO: API call to create
        // await inventoryAPI.create(formData)
      }
      resetForm()
      loadItems()
    } catch (err) {
      setError('Error al guardar producto')
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro?')) return
    try {
      // TODO: API call to delete
      // await inventoryAPI.delete(id)
      loadItems()
    } catch (err) {
      setError('Error al eliminar producto')
      console.error(err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      quantity: '',
      min_stock: '',
      price: '',
      category: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const lowStockItems = items.filter((item) => item.quantity <= item.min_stock)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Cargando inventario...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Productos con Stock Bajo</h3>
          <p className="text-sm text-yellow-700">{lowStockItems.length} productos necesitan reorden</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Producto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre del Producto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Stock Mínimo"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              className="border rounded px-3 py-2"
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="border rounded px-3 py-2"
              step="0.01"
              required
            />
            <input
              type="text"
              placeholder="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="border rounded px-3 py-2"
              required
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
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No hay productos en el inventario</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cantidad</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Mínimo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Precio</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{item.sku}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">
                    <span
                      className={
                        item.quantity <= item.min_stock ? 'text-red-600 font-semibold' : 'text-gray-700'
                      }
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{item.min_stock}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
