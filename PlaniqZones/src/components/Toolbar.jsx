import { Grid3x3, Hand, Maximize2, MousePointer2, Pentagon, Redo2, Square, Trash2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEditor } from '../hooks/useEditor'
import { useView } from '../hooks/useView'

const TOOLS = [
  { id: 'select', title: 'Выделение (V)', Icon: MousePointer2 },
  { id: 'rect', title: 'Прямоугольник (R)', Icon: Square },
  { id: 'polygon', title: 'Полигон (P)', Icon: Pentagon },
  { id: 'hand', title: 'Рука (H, пробел)', Icon: Hand },
]

const btn = (active = false, disabled = false) =>
  `flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-sm transition-colors ${
    active ? 'bg-[#3960C7] text-white' : 'text-gray-700 hover:bg-[#EBEFF9] hover:text-[#3960C7]'
  } ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-gray-700' : 'cursor-pointer'}`

/** Инструменты рисования, зум и история. Файлы и загрузка ЖК — в `ProjectBar`. */
export default function Toolbar() {
  const { state, dispatch, canUndo, canRedo } = useEditor()
  const { view, zoomBy, zoomTo, fit } = useView()
  const hasImage = !!state.image
  const hasSelection = state.selectedIds.length > 0

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1" role="toolbar" aria-label="Инструменты">
        {TOOLS.map((tool) => {
          const Icon = tool.Icon
          return (
            <button key={tool.id} type="button" title={tool.title} aria-pressed={state.mode === tool.id} onClick={() => dispatch({ type: 'setMode', mode: tool.id })} className={btn(state.mode === tool.id)}>
              <Icon size={18} />
            </button>
          )
        })}
        <span className="ml-1 text-xs text-gray-500">{TOOLS.find((t) => t.id === state.mode)?.title}</span>
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-1" aria-label="Масштаб">
        <button type="button" title="Отдалить" onClick={() => zoomBy(1 / 1.25)} disabled={!hasImage} className={btn(false, !hasImage)}><ZoomOut size={18} /></button>
        <button type="button" title="100 %" onClick={() => zoomTo(1)} disabled={!hasImage} className={`${btn(false, !hasImage)} w-14 font-mono text-xs`}>{Math.round(view.zoom * 100)}%</button>
        <button type="button" title="Приблизить" onClick={() => zoomBy(1.25)} disabled={!hasImage} className={btn(false, !hasImage)}><ZoomIn size={18} /></button>
        <button type="button" title="Вписать в кадр" onClick={() => fit(state.image)} disabled={!hasImage} className={btn(false, !hasImage)}><Maximize2 size={18} /></button>
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-1" aria-label="История">
        <button type="button" title="Отменить (Ctrl+Z)" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} className={btn(false, !canUndo)}><Undo2 size={18} /></button>
        <button type="button" title="Повторить (Ctrl+Y)" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} className={btn(false, !canRedo)}><Redo2 size={18} /></button>
        <button type="button" title="Удалить выделенное (Del)" onClick={() => dispatch({ type: 'delete', ids: state.selectedIds })} disabled={!hasSelection} className={btn(false, !hasSelection)}><Trash2 size={18} /></button>
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <button type="button" title="Привязка к сетке 10 px" aria-pressed={state.gridSnap} onClick={() => dispatch({ type: 'setGridSnap', value: !state.gridSnap })} className={btn(state.gridSnap)}>
        <Grid3x3 size={18} />
        <span className="text-xs">Сетка</span>
      </button>

      <span className="ml-auto text-xs text-gray-400">Колесо — зум · пробел + тянуть — холст · Shift+клик — несколько зон · стрелки — сдвиг на 1 px</span>
    </div>
  )
}
