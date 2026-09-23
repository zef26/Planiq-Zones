import { useRef, useState } from 'react'
import { Copy, Download, FileUp, FolderOpen, Image as ImageIcon, Save } from 'lucide-react'
import { useEditor } from '../hooks/useEditor'
import { fetchProject, loadImage } from '../lib/api'
import { buildMedia, buildProjectFile, parseMedia, parseProjectFile } from '../lib/exportMedia'

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const base = 'flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const action = `${base} border-[#C2CEEE] bg-white text-[#3960C7] hover:bg-[#EBEFF9]`
// Отдельная строка классов, а не «action + синий»: две утилиты фона в одном className спорят, и побеждает порядок в CSS
const primary = `${base} border-[#3960C7] bg-[#3960C7] text-white hover:bg-[#2E4FA8]`

/**
 * Источник и результат: загрузить ЖК с бэка по slug (генплан + корпуса + уже обведённое)
 * или картинку с диска; сохранить/открыть проект; экспортировать `media` для бэка.
 */
export default function ProjectBar() {
  const { state, dispatch } = useEditor()
  const { image, project, blocks, zones, media } = state
  const [slug, setSlug] = useState('nurafshon-park')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error' | 'warn', text }
  const imageInput = useRef(null)
  const projectInput = useRef(null)

  const loadFromBackend = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const data = await fetchProject(slug)
      if (!data.genplan) throw new Error('У ЖК нет ни генплана (visual_view), ни фото — обводить нечего')
      const img = await loadImage(data.genplan.src)
      const loaded = { ...img, name: data.genplan.src.split('/').pop(), remote: true }
      const imported = parseMedia(data.media, data.blocks, loaded)
      dispatch({ type: 'load', image: loaded, project: data.project, blocks: data.blocks, media: data.media, zones: imported })
      setStatus({
        kind: data.genplan.isGenplan ? 'ok' : 'warn',
        text: `${data.project.name}: корпусов ${data.blocks.length}, ${img.width}×${img.height}px${imported.length ? `, контуров с бэка: ${imported.length}` : ''}${data.genplan.isGenplan ? '' : '. ⚠️ visual_view нет — взято первое фото'}`,
      })
    } catch (e) {
      setStatus({ kind: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const openImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      const img = await loadImage(url)
      dispatch({ type: 'load', image: { ...img, name: file.name, remote: false }, project: null, blocks: [], media: {}, zones: [] })
      setStatus({ kind: 'ok', text: `${file.name}: ${img.width}×${img.height}px. Корпусов нет — id корпуса вписывайте в зону руками` })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  const saveProject = () => {
    download(`planiq-${project?.slug ?? image?.name ?? 'project'}.json`, buildProjectFile({ project, image, blocks, zones }))
  }

  const openProject = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = parseProjectFile(await file.text())
      let img = image
      if (parsed.image?.src) img = { ...(await loadImage(parsed.image.src)), name: parsed.image.name, remote: true }
      if (!img) throw new Error('В проекте картинка с диска — сначала откройте её, потом проект')
      if (parsed.image && (parsed.image.width !== img.width || parsed.image.height !== img.height)) {
        throw new Error(`Проект рисовался на картинке ${parsed.image.width}×${parsed.image.height}, а открыта ${img.width}×${img.height} — координаты не совпадут`)
      }
      dispatch({ type: 'load', image: img, project: parsed.project, blocks: parsed.blocks.length ? parsed.blocks : blocks, media, zones: parsed.zones })
      setStatus({ kind: 'ok', text: `Проект открыт: зон ${parsed.zones.length}` })
    } catch (err) {
      setStatus({ kind: 'error', text: err.message })
    }
  }

  const exportMedia = async (toClipboard) => {
    if (!image) return
    const { media: out, warnings } = buildMedia({ zones, image, existing: media })
    if (toClipboard) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(out, null, 2))
        setStatus({ kind: warnings.length ? 'warn' : 'ok', text: ['media скопирован в буфер', ...warnings].join(' · ') })
      } catch {
        setStatus({ kind: 'error', text: 'Буфер обмена недоступен — сохраните файлом' })
      }
      return
    }
    download(`media-${project?.slug ?? 'genplan'}.json`, out)
    setStatus({ kind: warnings.length ? 'warn' : 'ok', text: ['media сохранён файлом', ...warnings].join(' · ') })
  }

  const exportable = image && zones.some((z) => z.blockId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-xs font-bold text-gray-800">ЖК с бэка</label>
        <div className="flex gap-1">
          <input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && loadFromBackend()}
            placeholder="slug, например nurafshon-park"
            className="min-w-0 flex-1 rounded-lg border border-[#C2CEEE] px-2 py-1.5 font-mono text-xs focus:border-[#3960C7] focus:outline-none"
          />
          <button type="button" onClick={loadFromBackend} disabled={busy} className={action} title="Загрузить генплан и корпуса">
            <FileUp size={14} />{busy ? '…' : 'Загрузить'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => imageInput.current?.click()} className={action} title="Картинка с диска (без корпусов)"><ImageIcon size={14} />Картинка</button>
        <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={openImage} />
        <button type="button" onClick={() => projectInput.current?.click()} className={action} title="Открыть сохранённый проект"><FolderOpen size={14} />Открыть</button>
        <input ref={projectInput} type="file" accept="application/json" className="hidden" onChange={openProject} />
        <button type="button" onClick={saveProject} disabled={!image} className={action} title="Сохранить проект, чтобы продолжить позже"><Save size={14} />Сохранить</button>
      </div>

      {project && (
        <div className="rounded-lg bg-[#EBEFF9] p-2 text-xs text-gray-700">
          <div className="font-bold text-gray-900">{project.name}</div>
          <div className="font-mono text-[11px] text-gray-500">{project.slug}</div>
          {image && <div className="mt-1">Генплан {image.width}×{image.height}px · корпусов {blocks.length}</div>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-gray-800">Экспорт для бэка</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => exportMedia(false)} disabled={!exportable} className={primary} title="media.json в формате бэка"><Download size={14} />media.json</button>
          <button type="button" onClick={() => exportMedia(true)} disabled={!exportable} className={action} title="Скопировать JSON в буфер"><Copy size={14} />В буфер</button>
        </div>
        <p className="text-[11px] leading-4 text-gray-500">Координаты — проценты от ширины и высоты генплана (0–100), по id корпуса. Формат ждёт подтверждения бэка (B-44).</p>
      </div>

      {status && (
        <p role="status" className={`rounded-lg p-2 text-xs ${status.kind === 'error' ? 'bg-red-50 text-red-800' : status.kind === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
          {status.text}
        </p>
      )}
    </div>
  )
}
