import { Pentagon, Square, Trash2 } from 'lucide-react'
import { useEditor } from '../hooks/useEditor'
import { coverage } from '../lib/exportMedia'
import { bboxOfPoints, toPercent } from '../lib/geometry'

const ICON = { rect: Square, polygon: Pentagon }

/**
 * Список зон: имя, тип, привязка к корпусу, удаление. Ниже — сводка «кто без корпуса, какой
 * корпус без зоны»: без неё экспорт молча теряет зоны. У выделенной зоны — её координаты
 * в пикселях и процентах: чтобы сверить глазами, что уходит бэку.
 */
export default function ZoneList() {
  const { state, dispatch } = useEditor()
  const { zones, blocks, selectedIds, image } = state
  const { unboundZones, blocksWithoutZone } = coverage(zones, blocks)
  const selected = selectedIds.length === 1 ? zones.find((z) => z.id === selectedIds[0]) : null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-800">Зоны ({zones.length})</h2>

      {zones.length === 0 && <p className="text-xs text-gray-500">Обведите корпуса прямоугольником или полигоном — они появятся здесь.</p>}

      <ul className="flex flex-col gap-1">
        {zones.map((zone) => {
          const isSelected = selectedIds.includes(zone.id)
          const Icon = ICON[zone.type] ?? Square
          return (
            <li
              key={zone.id}
              onClick={(e) => dispatch({ type: 'select', ids: e.shiftKey ? (isSelected ? selectedIds.filter((id) => id !== zone.id) : [...selectedIds, zone.id]) : [zone.id] })}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2 transition-colors ${isSelected ? 'border-[#3960C7] bg-[#EBEFF9]' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className={isSelected ? 'text-[#3960C7]' : 'text-gray-400'} />
                <input
                  value={zone.name}
                  onChange={(e) => dispatch({ type: 'update', id: zone.id, props: { name: e.target.value } })}
                  onClick={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-medium text-gray-800 focus:border-[#C2CEEE] focus:bg-white focus:outline-none"
                  aria-label="Имя зоны"
                />
                <input
                  type="color"
                  value={zone.color}
                  onChange={(e) => dispatch({ type: 'update', id: zone.id, props: { color: e.target.value } })}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Цвет зоны"
                  title="Цвет"
                />
                <button type="button" title="Удалить" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'delete', ids: [zone.id] }) }} className="rounded p-1 text-red-500 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
              {blocks.length > 0 ? (
                <select
                  value={zone.blockId ?? ''}
                  onChange={(e) => dispatch({ type: 'update', id: zone.id, props: { blockId: e.target.value || null, ...(e.target.value && zone.name.startsWith('Зона ') ? { name: blocks.find((b) => b.id === e.target.value)?.name ?? zone.name } : {}) } })}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full rounded border px-2 py-1 text-xs ${zone.blockId ? 'border-[#C2CEEE] bg-white text-gray-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}
                  aria-label="Корпус"
                >
                  <option value="">— корпус не выбран —</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.floors ? ` · ${b.floors} эт.` : ''}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={zone.blockId ?? ''}
                  onChange={(e) => dispatch({ type: 'update', id: zone.id, props: { blockId: e.target.value.trim() || null } })}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="id корпуса (uuid) — картинка без ЖК"
                  className={`w-full rounded border px-2 py-1 font-mono text-xs ${zone.blockId ? 'border-[#C2CEEE] bg-white' : 'border-amber-300 bg-amber-50'}`}
                  aria-label="Id корпуса"
                />
              )}
            </li>
          )
        })}
      </ul>

      {(unboundZones.length > 0 || blocksWithoutZone.length > 0) && zones.length + blocks.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {unboundZones.length > 0 && <p>Без корпуса: {unboundZones.map((z) => z.name).join(', ')} — в экспорт не попадут.</p>}
          {blocksWithoutZone.length > 0 && <p>Корпуса без зоны: {blocksWithoutZone.map((b) => b.name).join(', ')}.</p>}
        </div>
      )}
      {zones.length > 0 && unboundZones.length === 0 && blocksWithoutZone.length === 0 && blocks.length > 0 && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">Все корпуса обведены — можно экспортировать.</p>
      )}

      {selected && image && (
        <div className="rounded-lg bg-gray-50 p-2 font-mono text-[11px] text-gray-600">
          <div className="mb-1 font-sans text-xs font-bold text-gray-800">{selected.name} · {selected.type === 'rect' ? 'прямоугольник' : `полигон, ${selected.points.length} т.`}</div>
          {(() => { const b = bboxOfPoints(selected.points); return <div>bbox px: {Math.round(b.x)}, {Math.round(b.y)} · {Math.round(b.width)}×{Math.round(b.height)}</div> })()}
          <div className="mt-1 break-all">coords %: {JSON.stringify(toPercent(selected.points, image.width, image.height))}</div>
        </div>
      )}
    </div>
  )
}
