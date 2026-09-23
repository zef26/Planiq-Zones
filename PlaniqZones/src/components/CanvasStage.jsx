import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor } from '../hooks/useEditor'
import { useView } from '../hooks/useView'
import {
  HANDLES, MIN_SIZE, bboxOfPoints, clampPoint, distance, handlePosition, moveWithin, normalizeRect,
  pointInPolygon, rectToPoints, resizeRect, snapToGrid, zoomAround,
} from '../lib/geometry'

const GRID = 10
/** Размеры ручек и допуски — в ЭКРАННЫХ пикселях, делятся на зум, чтобы не расти с картинкой. */
const HANDLE_PX = 10
const HIT_PX = 8
const CLOSE_PX = 12

/**
 * Холст: картинка в НАТУРАЛЬНОМ размере внутри обёртки с transform (pan + zoom), поверх —
 * SVG того же размера. Координаты зон = пиксели картинки, никакого пересчёта под окно.
 *
 * Режимы: `select` — выделение, перенос, ручки прямоугольника и вершины полигона;
 * `rect` — протянуть прямоугольник; `polygon` — клики по вершинам, клик по первой /
 * Enter / двойной клик — замкнуть, Esc — отменить; `hand` — таскать холст (то же —
 * средняя кнопка или зажатый пробел). Колесо — зум вокруг курсора.
 */
export default function CanvasStage() {
  const { state, dispatch } = useEditor()
  const { image, zones, selectedIds, mode, gridSnap } = state
  const { view, setView, boxRef, fit } = useView()
  const [draftRect, setDraftRect] = useState(null)
  const [polyDraft, setPolyDraftState] = useState([])
  // Черновик полигона дублируется в ref: решение «замкнуть или добавить точку» принимается
  // снаружи setState. Внутри updater'а dispatch нельзя — StrictMode зовёт updater дважды,
  // и полигон добавлялся два раза (ловилось вживую 23.09.26).
  const polyRef = useRef([])
  const setPolyDraft = useCallback((pts) => {
    polyRef.current = pts
    setPolyDraftState(pts)
  }, [])
  const [cursor, setCursor] = useState(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const gesture = useRef(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const stateRef = useRef({ zones, selectedIds, mode, gridSnap, image })
  stateRef.current = { zones, selectedIds, mode, gridSnap, image }

  // Новая картинка — вписать в кадр.
  useEffect(() => {
    fit(image)
  }, [image, fit])

  const toImage = useCallback((e) => {
    const box = boxRef.current
    const v = viewRef.current
    const r = box.getBoundingClientRect()
    return { x: (e.clientX - r.left - v.pan.x) / v.zoom, y: (e.clientY - r.top - v.pan.y) / v.zoom }
  }, [boxRef])

  const snapped = useCallback((p) => {
    const { gridSnap: g, image: img } = stateRef.current
    const c = clampPoint(p, img.width, img.height)
    return g ? { x: snapToGrid(c.x, GRID), y: snapToGrid(c.y, GRID) } : c
  }, [])

  /** Что под курсором в режиме выделения: ручка выделенной зоны, вершина полигона или тело зоны. */
  const hitTest = useCallback((p) => {
    const { zones: zs, selectedIds: sel } = stateRef.current
    const tol = HIT_PX / viewRef.current.zoom
    for (const id of sel) {
      const z = zs.find((x) => x.id === id)
      if (!z) continue
      if (z.type === 'rect') {
        const box = bboxOfPoints(z.points)
        for (const h of HANDLES) {
          if (distance(handlePosition(box, h), p) <= tol) return { kind: 'resize', zone: z, handle: h }
        }
      } else {
        const i = z.points.findIndex((pt) => distance(pt, p) <= tol)
        if (i >= 0) return { kind: 'vertex', zone: z, index: i }
      }
    }
    for (let i = zs.length - 1; i >= 0; i--) {
      if (pointInPolygon(p, zs[i].points)) return { kind: 'body', zone: zs[i] }
    }
    return null
  }, [])

  const closePolygon = useCallback(() => {
    const pts = polyRef.current
    if (pts.length >= 3) dispatch({ type: 'add', zone: { type: 'polygon', points: pts } })
    setPolyDraft([])
  }, [dispatch, setPolyDraft])

  const onPointerDown = useCallback((e) => {
    if (!stateRef.current.image) return
    const box = boxRef.current
    box.setPointerCapture(e.pointerId)
    const { mode: m, selectedIds: sel } = stateRef.current
    const wantPan = m === 'hand' || e.button === 1 || spaceHeld
    if (wantPan) {
      gesture.current = { kind: 'pan', startClient: { x: e.clientX, y: e.clientY }, startPan: viewRef.current.pan }
      return
    }
    if (e.button !== 0) return
    const p = snapped(toImage(e))
    if (m === 'rect') {
      gesture.current = { kind: 'rect', start: p }
      setDraftRect({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })
      return
    }
    if (m === 'polygon') {
      const pts = polyRef.current
      if (pts.length >= 3 && distance(pts[0], p) <= CLOSE_PX / viewRef.current.zoom) closePolygon()
      else setPolyDraft([...pts, p])
      return
    }
    const hit = hitTest(p)
    if (!hit) {
      dispatch({ type: 'select', ids: [] })
      return
    }
    if (hit.kind === 'body') {
      const next = e.shiftKey
        ? sel.includes(hit.zone.id) ? sel.filter((id) => id !== hit.zone.id) : [...sel, hit.zone.id]
        : sel.includes(hit.zone.id) ? sel : [hit.zone.id]
      dispatch({ type: 'select', ids: next })
      gesture.current = { kind: 'move', last: p, ids: next, started: false }
      return
    }
    if (hit.kind === 'resize') {
      gesture.current = { kind: 'resize', id: hit.zone.id, handle: hit.handle, box: bboxOfPoints(hit.zone.points), start: p, started: false }
      return
    }
    gesture.current = { kind: 'vertex', id: hit.zone.id, index: hit.index, started: false }
  }, [boxRef, spaceHeld, snapped, toImage, hitTest, dispatch, closePolygon, setPolyDraft])

  const onPointerMove = useCallback((e) => {
    if (!stateRef.current.image) return
    const g = gesture.current
    const raw = toImage(e)
    setCursor(raw)
    if (!g) return
    if (g.kind === 'pan') {
      setView((v) => ({ ...v, pan: { x: g.startPan.x + e.clientX - g.startClient.x, y: g.startPan.y + e.clientY - g.startClient.y } }))
      return
    }
    const p = snapped(raw)
    if (g.kind === 'rect') {
      setDraftRect({ x1: g.start.x, y1: g.start.y, x2: p.x, y2: p.y })
      return
    }
    if (!g.started) {
      dispatch({ type: 'beginGesture' })
      g.started = true
    }
    const { image: img } = stateRef.current
    if (g.kind === 'move') {
      const dx = p.x - g.last.x, dy = p.y - g.last.y
      g.last = p
      const ids = new Set(g.ids)
      dispatch({ type: 'patchLiveMany', patch: (z) => (ids.has(z.id) ? { points: moveWithin(z.points, dx, dy, img.width, img.height) } : null) })
      return
    }
    if (g.kind === 'resize') {
      const next = resizeRect(g.box, g.handle, p.x - g.start.x, p.y - g.start.y, img.width, img.height)
      dispatch({ type: 'patchLive', id: g.id, props: { points: rectToPoints(next) } })
      return
    }
    if (g.kind === 'vertex') {
      const z = stateRef.current.zones.find((x) => x.id === g.id)
      if (!z) return
      const points = z.points.map((pt, i) => (i === g.index ? p : pt))
      dispatch({ type: 'patchLive', id: g.id, props: { points } })
    }
  }, [toImage, snapped, setView, dispatch])

  const onPointerUp = useCallback(() => {
    const g = gesture.current
    gesture.current = null
    if (g?.kind === 'rect' && draftRect) {
      const r = normalizeRect(draftRect.x1, draftRect.y1, draftRect.x2, draftRect.y2)
      if (r.width >= MIN_SIZE && r.height >= MIN_SIZE) dispatch({ type: 'add', zone: { type: 'rect', points: rectToPoints(r) } })
      setDraftRect(null)
    }
  }, [draftRect, dispatch])

  const onDoubleClick = useCallback(() => {
    if (stateRef.current.mode === 'polygon') closePolygon()
  }, [closePolygon])

  // Колесо — нативный слушатель: React вешает wheel пассивно, preventDefault там не работает.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e) => {
      e.preventDefault()
      const r = box.getBoundingClientRect()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setView((v) => zoomAround(v, factor, { x: e.clientX - r.left, y: e.clientY - r.top }))
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [boxRef, setView])

  // Клавиатура: удаление, отмена, Enter для полигона, стрелки — сдвиг на 1 (Shift — 10) px картинки.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      const { selectedIds: sel, zones: zs, image: img } = stateRef.current
      if (e.code === 'Space') { setSpaceHeld(true); e.preventDefault(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); dispatch({ type: 'redo' }); return }
      if (e.key === 'Escape') { setPolyDraft([]); setDraftRect(null); dispatch({ type: 'select', ids: [] }); return }
      if (e.key === 'Enter') { closePolygon(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) { e.preventDefault(); dispatch({ type: 'delete', ids: sel }); return }
      const step = e.shiftKey ? 10 : 1
      const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (arrows[e.key] && sel.length && img) {
        e.preventDefault()
        const [dx, dy] = arrows[e.key]
        const ids = new Set(sel)
        dispatch({ type: 'updateMany', patch: (z) => (ids.has(z.id) ? { points: moveWithin(z.points, dx, dy, img.width, img.height) } : null) })
      }
      void zs
    }
    const onKeyUp = (e) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [dispatch, closePolygon, setPolyDraft])

  const cursorStyle = gesture.current?.kind === 'pan' ? 'grabbing' : mode === 'hand' || spaceHeld ? 'grab' : mode === 'select' ? 'default' : 'crosshair'
  const { zoom, pan } = view
  const handleSize = HANDLE_PX / zoom
  const stroke = (selected) => (selected ? 2.5 : 1.5) / zoom
  const toPoints = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ')
  const draft = draftRect ? normalizeRect(draftRect.x1, draftRect.y1, draftRect.x2, draftRect.y2) : null

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full select-none overflow-hidden rounded-xl bg-[#E8EEF4]"
      style={{ cursor: cursorStyle, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {image ? (
        <div
          style={{ position: 'absolute', left: 0, top: 0, width: image.width, height: image.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <img src={image.src} width={image.width} height={image.height} alt="" draggable={false} style={{ display: 'block', pointerEvents: 'none', userSelect: 'none', maxWidth: 'none' }} />
          <svg width={image.width} height={image.height} viewBox={`0 0 ${image.width} ${image.height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            {zones.map((z) => {
              const selected = selectedIds.includes(z.id)
              const box = bboxOfPoints(z.points)
              return (
                <g key={z.id}>
                  <polygon points={toPoints(z.points)} fill={z.color} fillOpacity={selected ? 0.3 : 0.18} stroke={z.color} strokeWidth={stroke(selected)} strokeLinejoin="round" />
                  <text x={box.x + 6 / zoom} y={box.y + 18 / zoom} fontSize={13 / zoom} fontFamily="Manrope, system-ui, sans-serif" fontWeight="700" fill="#fff" stroke="#142246" strokeWidth={3 / zoom} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                    {z.name}
                  </text>
                  {selected && z.type === 'rect' && HANDLES.map((h) => {
                    const hp = handlePosition(box, h)
                    return <rect key={h} x={hp.x - handleSize / 2} y={hp.y - handleSize / 2} width={handleSize} height={handleSize} fill="#fff" stroke="#3960C7" strokeWidth={1.5 / zoom} />
                  })}
                  {selected && z.type === 'polygon' && z.points.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={handleSize / 2} fill="#fff" stroke="#3960C7" strokeWidth={1.5 / zoom} />
                  ))}
                </g>
              )
            })}
            {draft && (
              <rect x={draft.x} y={draft.y} width={draft.width} height={draft.height} fill="#3960C7" fillOpacity={0.15} stroke="#3960C7" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`} />
            )}
            {polyDraft.length > 0 && (
              <g>
                <polyline points={toPoints(cursor ? [...polyDraft, cursor] : polyDraft)} fill="none" stroke="#3960C7" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`} />
                {polyDraft.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={(i === 0 ? CLOSE_PX / 2 : 4) / zoom} fill={i === 0 ? '#fff' : '#3960C7'} stroke="#3960C7" strokeWidth={1.5 / zoom} />
                ))}
              </g>
            )}
          </svg>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-gray-500">
          Загрузите ЖК по slug или картинку генплана с диска — и обводите корпуса.
        </div>
      )}

      {image && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 font-mono text-[11px] text-gray-700 shadow">
          {Math.round(zoom * 100)}% · {image.width}×{image.height}px
          {cursor && cursor.x >= 0 && cursor.y >= 0 && cursor.x <= image.width && cursor.y <= image.height && (
            <> · x {Math.round(cursor.x)} y {Math.round(cursor.y)} · {((cursor.x / image.width) * 100).toFixed(2)}% {((cursor.y / image.height) * 100).toFixed(2)}%</>
          )}
        </div>
      )}
      {polyDraft.length > 0 && (
        <div className="pointer-events-none absolute right-2 top-2 rounded bg-[#3960C7] px-2 py-1 text-xs text-white shadow">
          Точек: {polyDraft.length} · клик по первой, Enter или двойной клик — замкнуть · Esc — отмена
        </div>
      )}
    </div>
  )
}
