/**
 * Экспорт/импорт контуров в формат `media` бэка Qoshni и файл проекта редактора.
 *
 * Формат бэка (документация 9): `media[blockId] = { img, shape, coords, shape_flr, coords_flr }`.
 * ⚠️ Формат точек бэк НЕ объявил (вопрос B-44 в `docs/backend/QUESTIONS.md` сайта). Наше
 * предположение, пока нет ответа: `shape` — `rect` | `polygon`, `coords` — `[[x, y], …]` в
 * ПРОЦЕНТАХ от ширины/высоты `visual_view` (0–100, два знака), у `rect` — те же четыре угла.
 * Проценты выбраны потому, что не зависят от размера, в котором сайт показывает генплан.
 * Ответит бэк иначе — менять только этот модуль.
 *
 * Модуль чистый, покрыт тестами.
 */

import { bboxOfPoints, fromPercent, isAxisAlignedRect, rectToPoints, toPercent } from './geometry'

export const PROJECT_FILE_VERSION = 1

/** Ключи записи корпуса в `media`, которые мы НЕ трогаем (контур на плане этажа — не наша задача). */
const FLOOR_DEFAULTS = { shape_flr: 'rect', coords_flr: [] }

/**
 * Зоны → `media` бэка. Берём только зоны, привязанные к корпусу; у корпуса без зоны записи
 * нет (пустую не выдумываем). Две зоны на один корпус — берём первую и сообщаем в `warnings`.
 * `existing` — текущее `media` ЖК: сохраняем чужие ключи (`images`, `img_logo`, `visual_view`)
 * и `img`/`coords_flr` записей корпусов, меняем только контур.
 */
export function buildMedia({ zones, image, existing = {} }) {
  const warnings = []
  const media = { ...existing }
  const seen = new Set()
  for (const zone of zones) {
    if (!zone.blockId) {
      warnings.push(`Зона «${zone.name}» не привязана к корпусу — в экспорт не попала`)
      continue
    }
    if (seen.has(zone.blockId)) {
      warnings.push(`У корпуса ${zone.blockId} больше одной зоны — взята первая («${zone.name}» пропущена)`)
      continue
    }
    seen.add(zone.blockId)
    const prev = existing[zone.blockId] && typeof existing[zone.blockId] === 'object' ? existing[zone.blockId] : {}
    media[zone.blockId] = {
      img: prev.img ?? 'self',
      ...FLOOR_DEFAULTS,
      ...prev,
      shape: zone.type === 'rect' ? 'rect' : 'polygon',
      coords: toPercent(zone.points, image.width, image.height),
    }
  }
  return { media, warnings }
}

/**
 * `media` бэка → зоны редактора (продолжить работу над уже обведённым ЖК).
 * Понимаем оба варианта, которые может выбрать бэк (B-44): проценты `[[x, y]]` — как экспортируем
 * мы, и `[x, y, w, h]` у `rect`. Пустой `coords` — записи нет.
 */
export function parseMedia(media, blocks, image) {
  const zones = []
  if (!media || typeof media !== 'object') return zones
  const names = new Map(blocks.map((b) => [b.id, b.name]))
  for (const [key, entry] of Object.entries(media)) {
    if (!names.has(key) || !entry || typeof entry !== 'object') continue
    const coords = Array.isArray(entry.coords) ? entry.coords : []
    let points = []
    if (coords.length === 4 && coords.every((v) => typeof v === 'number')) {
      const [x, y, w, h] = coords
      points = rectToPoints({ x: (x / 100) * image.width, y: (y / 100) * image.height, width: (w / 100) * image.width, height: (h / 100) * image.height })
    } else if (coords.length >= 3 && coords.every((p) => Array.isArray(p) && p.length === 2)) {
      points = fromPercent(coords, image.width, image.height)
    }
    if (points.length < 3) continue
    zones.push({
      id: `imported-${key}`,
      name: names.get(key) ?? key,
      type: entry.shape === 'rect' && isAxisAlignedRect(points) ? 'rect' : 'polygon',
      points,
      blockId: key,
      color: '#3960C7',
    })
  }
  return zones
}

/** Файл проекта редактора — чтобы вернуться к работе. Картинку не вкладываем: ссылка или имя файла. */
export function buildProjectFile({ project, image, blocks, zones }) {
  return {
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    project: project ? { slug: project.slug, name: project.name } : null,
    image: image ? { src: image.remote ? image.src : null, name: image.name, width: image.width, height: image.height } : null,
    blocks,
    zones: zones.map((z) => ({ ...z, points: z.points.map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })) })),
  }
}

/** Разбор файла проекта с проверкой формы; кривой файл → понятная ошибка, а не падение. */
export function parseProjectFile(raw) {
  let data
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    throw new Error('Файл не JSON')
  }
  if (!data || typeof data !== 'object' || data.version !== PROJECT_FILE_VERSION) throw new Error('Это не файл проекта Planiq Zones')
  if (!Array.isArray(data.zones)) throw new Error('В файле нет зон')
  const zones = data.zones.filter(
    (z) => z && typeof z === 'object' && Array.isArray(z.points) && z.points.length >= 3 && z.points.every((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)),
  ).map((z) => ({
    id: String(z.id ?? `z-${Math.random().toString(36).slice(2, 8)}`),
    name: String(z.name ?? ''),
    type: z.type === 'rect' ? 'rect' : 'polygon',
    points: z.points.map((p) => ({ x: p.x, y: p.y })),
    blockId: z.blockId ? String(z.blockId) : null,
    color: typeof z.color === 'string' ? z.color : '#3960C7',
  }))
  return {
    project: data.project ?? null,
    image: data.image ?? null,
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    zones,
  }
}

/** Сводка для панели: что ещё не обведено. */
export function coverage(zones, blocks) {
  const bound = new Set(zones.map((z) => z.blockId).filter(Boolean))
  return {
    unboundZones: zones.filter((z) => !z.blockId),
    blocksWithoutZone: blocks.filter((b) => !bound.has(b.id)),
  }
}

export { bboxOfPoints }
