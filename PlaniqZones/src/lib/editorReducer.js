/**
 * Состояние редактора — один reducer, чтобы отмена/повтор были честными снимками зон,
 * а не набором разрозненных `useState`. Координаты зон — пиксели оригинала картинки.
 *
 * `image`   — `{ src, width, height, name, remote }` (remote — ссылка на storage; локальный файл — object URL).
 * `project` — `{ slug, name }` ЖК с бэка (или null при локальной картинке).
 * `blocks`  — корпуса ЖК `{ id, name, floors }`: к ним привязываются зоны.
 * `media`   — `media` ЖК как пришло: чужие ключи сохраняем при экспорте.
 * `zones`   — `{ id, name, type, points, blockId, color }`.
 *
 * Модуль чистый (без React) — покрыт тестами.
 */

export const ZONE_COLOR = '#3960C7'
const HISTORY_LIMIT = 100

export const initialState = {
  image: null,
  project: null,
  blocks: [],
  media: {},
  zones: [],
  selectedIds: [],
  mode: 'select',
  gridSnap: false,
  past: [],
  future: [],
}

let seq = 0
export const newId = () => `z-${Date.now().toString(36)}-${(seq++).toString(36)}`

/** Изменения зон проходят через `commit`: прошлое копится, будущее сбрасывается. */
function commit(state, zones, extra = {}) {
  return {
    ...state,
    ...extra,
    zones,
    past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.zones],
    future: [],
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case 'load':
      // Новая картинка/ЖК: старые зоны не имеют смысла в другой системе координат.
      return {
        ...initialState,
        image: action.image ?? null,
        project: action.project ?? null,
        blocks: action.blocks ?? [],
        media: action.media ?? {},
        zones: action.zones ?? [],
        gridSnap: state.gridSnap,
      }
    case 'setMode':
      return { ...state, mode: action.mode, selectedIds: action.mode === 'select' ? state.selectedIds : [] }
    case 'setGridSnap':
      return { ...state, gridSnap: action.value }
    case 'select':
      return { ...state, selectedIds: action.ids }
    case 'add': {
      const zone = { id: newId(), name: action.zone.name ?? `Зона ${state.zones.length + 1}`, color: ZONE_COLOR, blockId: null, ...action.zone }
      return commit(state, [...state.zones, zone], { selectedIds: [zone.id] })
    }
    case 'update':
      return commit(state, state.zones.map((z) => (z.id === action.id ? { ...z, ...action.props } : z)))
    case 'updateMany':
      return commit(state, state.zones.map((z) => { const p = action.patch(z); return p ? { ...z, ...p } : z }))
    /* Перетаскивание — много промежуточных шагов; в историю кладём только начало жеста
       (`beginGesture`), сами шаги правят зоны без записи в прошлое. */
    case 'beginGesture':
      return { ...state, past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.zones], future: [] }
    case 'patchLive':
      return { ...state, zones: state.zones.map((z) => (z.id === action.id ? { ...z, ...action.props } : z)) }
    case 'patchLiveMany':
      return { ...state, zones: state.zones.map((z) => { const p = action.patch(z); return p ? { ...z, ...p } : z }) }
    case 'delete': {
      const ids = new Set(action.ids)
      if (!ids.size) return state
      return commit(state, state.zones.filter((z) => !ids.has(z.id)), { selectedIds: [] })
    }
    case 'undo': {
      if (!state.past.length) return state
      const zones = state.past[state.past.length - 1]
      return { ...state, zones, past: state.past.slice(0, -1), future: [state.zones, ...state.future], selectedIds: [] }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [zones, ...future] = state.future
      return { ...state, zones, past: [...state.past, state.zones], future, selectedIds: [] }
    }
    default:
      return state
  }
}
