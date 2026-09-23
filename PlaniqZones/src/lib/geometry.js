/**
 * Геометрия зон. Все координаты — в ПИКСЕЛЯХ ОРИГИНАЛА картинки (natural size), поэтому
 * они не зависят ни от размера окна, ни от зума: это и есть «точно». В проценты переводим
 * только на экспорте (`toPercent`) — так контур ляжет на генплан любого размера.
 *
 * Зона — `{ id, name, type: 'rect' | 'polygon', points: [{x, y}, …], blockId, color }`.
 * У прямоугольника четыре точки по часовой: верх-лево, верх-право, низ-право, низ-лево.
 * Модуль чистый: без React и DOM, покрыт тестами.
 */

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
export const MIN_SIZE = 4

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const round2 = (v) => Math.round(v * 100) / 100

export function bboxOfPoints(points) {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function rectToPoints({ x, y, width, height }) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

/** Нормализует прямоугольник, нарисованный в любую сторону (ширина/высота могут быть отрицательными). */
export function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

export function movePoints(points, dx, dy) {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

/** Сдвиг с ограничением картинкой: контур не выезжает за края. */
export function moveWithin(points, dx, dy, imgW, imgH) {
  const box = bboxOfPoints(points)
  const cdx = clamp(dx, -box.x, imgW - box.x - box.width)
  const cdy = clamp(dy, -box.y, imgH - box.y - box.height)
  return movePoints(points, cdx, cdy)
}

/**
 * Изменение размера прямоугольника за ручку: `dx`/`dy` — смещение мыши в пикселях картинки.
 * Противоположная сторона стоит на месте; размер не меньше `MIN_SIZE`; в пределах картинки.
 */
export function resizeRect(rect, handle, dx, dy, imgW, imgH) {
  let { x, y, width, height } = rect
  const right = x + width
  const bottom = y + height
  let nx = x, ny = y, nr = right, nb = bottom
  if (handle.includes('w')) nx = clamp(x + dx, 0, right - MIN_SIZE)
  if (handle.includes('e')) nr = clamp(right + dx, x + MIN_SIZE, imgW)
  if (handle.includes('n')) ny = clamp(y + dy, 0, bottom - MIN_SIZE)
  if (handle.includes('s')) nb = clamp(bottom + dy, y + MIN_SIZE, imgH)
  return { x: nx, y: ny, width: nr - nx, height: nb - ny }
}

/** Позиция ручки прямоугольника (в пикселях картинки). */
export function handlePosition(rect, handle) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  switch (handle) {
    case 'nw': return { x: rect.x, y: rect.y }
    case 'n': return { x: cx, y: rect.y }
    case 'ne': return { x: right, y: rect.y }
    case 'e': return { x: right, y: cy }
    case 'se': return { x: right, y: bottom }
    case 's': return { x: cx, y: bottom }
    case 'sw': return { x: rect.x, y: bottom }
    case 'w': return { x: rect.x, y: cy }
    default: return { x: cx, y: cy }
  }
}

/** Точка внутри многоугольника (лучевой метод). Прямоугольник — тоже многоугольник из четырёх точек. */
export function pointInPolygon(pt, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j]
    const crosses = (a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export const snapToGrid = (v, grid) => (grid > 0 ? Math.round(v / grid) * grid : v)

export function clampPoint(p, imgW, imgH) {
  return { x: clamp(p.x, 0, imgW), y: clamp(p.y, 0, imgH) }
}

/** Пиксели картинки → проценты от её ширины/высоты (0–100, два знака). Формат экспорта, см. B-44. */
export function toPercent(points, imgW, imgH) {
  return points.map((p) => [round2((p.x / imgW) * 100), round2((p.y / imgH) * 100)])
}

/** Обратно: проценты → пиксели картинки (импорт готовых контуров с бэка). */
export function fromPercent(coords, imgW, imgH) {
  return coords.map(([x, y]) => ({ x: (x / 100) * imgW, y: (y / 100) * imgH }))
}

/** Является ли четырёхточечный контур прямоугольником со сторонами по осям. */
export function isAxisAlignedRect(points) {
  if (points.length !== 4) return false
  const [a, b, c, d] = points
  return a.y === b.y && b.x === c.x && c.y === d.y && d.x === a.x
}

/** Зум, при котором картинка целиком помещается в кадр, и смещение, центрирующее её. */
export function fitView(imgW, imgH, boxW, boxH, padding = 24) {
  if (!imgW || !imgH || !boxW || !boxH) return { zoom: 1, pan: { x: 0, y: 0 } }
  const zoom = Math.min((boxW - padding * 2) / imgW, (boxH - padding * 2) / imgH, 4)
  const safe = zoom > 0 ? zoom : 1
  return {
    zoom: safe,
    pan: { x: (boxW - imgW * safe) / 2, y: (boxH - imgH * safe) / 2 },
  }
}

/** Зум колесом «вокруг курсора»: точка под курсором остаётся на месте. */
export function zoomAround(view, factor, cursor, min = 0.05, max = 16) {
  const zoom = clamp(view.zoom * factor, min, max)
  const k = zoom / view.zoom
  return {
    zoom,
    pan: { x: cursor.x - (cursor.x - view.pan.x) * k, y: cursor.y - (cursor.y - view.pan.y) * k },
  }
}
