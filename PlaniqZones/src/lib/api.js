/**
 * Загрузка ЖК с публичного бэка Qoshni по slug — генплан и список корпусов.
 *
 * Адрес чтения — `https://apiv1.qoshni.uz` (отдельный поддомен FastAPI; на `api.qoshni.uz`
 * `/v1/*` даёт 404). CORS у бэка `*`, у хранилища картинок — тоже, поэтому редактор ходит
 * туда прямо из браузера. Переопределить — `VITE_API_URL` в `.env.local`.
 *
 * Ручки: `GET /v1/projects/{slug}` — `name`, `media.visual_view` (генплан), `media[blockId]`
 * (текущие контуры); `GET /v1/projects/{slug}/blocks` — `blocks[{id, name, floors}]`.
 */

export const API_BASE = (import.meta.env?.VITE_API_URL ?? 'https://apiv1.qoshni.uz').replace(/\/$/, '')

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error('ЖК с таким slug не найден')
  if (!res.ok) throw new Error(`Бэк ответил ${res.status}`)
  return res.json()
}

/** Генплан: `media.visual_view`; нет — первое фото ЖК (обводить по фото хуже, но лучше, чем ничего). */
function genplanOf(media) {
  if (!media || typeof media !== 'object') return null
  if (typeof media.visual_view === 'string' && media.visual_view) return { src: media.visual_view, isGenplan: true }
  const first = Array.isArray(media.images) ? media.images.find((s) => typeof s === 'string' && s) : null
  return first ? { src: first, isGenplan: false } : null
}

export async function fetchProject(slug) {
  const clean = String(slug ?? '').trim().replace(/^.*\/complexes\//, '').replace(/[?#].*$/, '').replace(/\/$/, '')
  if (!clean) throw new Error('Введите slug ЖК, например nurafshon-park')
  const [detail, blocksRes] = await Promise.all([getJson(`/v1/projects/${encodeURIComponent(clean)}`), getJson(`/v1/projects/${encodeURIComponent(clean)}/blocks`)])
  const blocks = (Array.isArray(blocksRes?.blocks) ? blocksRes.blocks : [])
    .filter((b) => b && b.id)
    .map((b) => ({ id: String(b.id), name: String(b.name ?? b.id), floors: b.floors ?? null }))
  return {
    project: { slug: detail.slug ?? clean, name: detail.name ?? clean },
    genplan: genplanOf(detail.media),
    media: detail.media && typeof detail.media === 'object' ? detail.media : {},
    blocks,
  }
}

/** Натуральный размер картинки — единственная система координат редактора. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Картинка не загрузилась'))
    img.src = src
  })
}
