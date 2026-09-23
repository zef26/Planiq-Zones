import { useCallback, useMemo, useRef, useState } from 'react'
import { ViewContext } from './contexts'
import { fitView, zoomAround } from '../lib/geometry'

/**
 * Вид холста: зум и смещение. Отдельно от зон — это состояние экрана, в историю не входит.
 * Контейнер холста регистрирует себя в `boxRef`, чтобы «Вписать» знал размер кадра.
 */
export default function ViewProvider({ children }) {
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const boxRef = useRef(null)

  const fit = useCallback((image) => {
    const box = boxRef.current
    if (!image || !box) return
    setView(fitView(image.width, image.height, box.clientWidth, box.clientHeight))
  }, [])

  /** Зум кнопками — вокруг центра кадра. */
  const zoomBy = useCallback((factor) => {
    const box = boxRef.current
    const center = box ? { x: box.clientWidth / 2, y: box.clientHeight / 2 } : { x: 0, y: 0 }
    setView((v) => zoomAround(v, factor, center))
  }, [])

  const zoomTo = useCallback((zoom) => {
    const box = boxRef.current
    const center = box ? { x: box.clientWidth / 2, y: box.clientHeight / 2 } : { x: 0, y: 0 }
    setView((v) => zoomAround(v, zoom / v.zoom, center))
  }, [])

  const value = useMemo(() => ({ view, setView, boxRef, fit, zoomBy, zoomTo }), [view, fit, zoomBy, zoomTo])
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}
