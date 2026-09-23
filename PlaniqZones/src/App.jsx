import EditorProvider from './context/EditorContext'
import ViewProvider from './context/ViewContext'
import Toolbar from './components/Toolbar'
import CanvasStage from './components/CanvasStage'
import ZoneList from './components/ZoneList'
import ProjectBar from './components/ProjectBar'

/**
 * Planiq Zones — обводка корпусов на генплане ЖК для Qoshni.
 * Слева — источник (ЖК с бэка / картинка), экспорт и список зон; справа — холст.
 */
export default function App() {
  return (
    <EditorProvider>
      <ViewProvider>
        <div className="flex h-screen flex-col bg-gray-100 text-gray-900">
          <header className="border-b bg-white px-4 py-2 shadow-sm">
            <div className="mb-1 flex items-baseline gap-2">
              <h1 className="text-sm font-bold text-[#3960C7]">Planiq Zones</h1>
              <span className="text-xs text-gray-500">контуры корпусов на генплане ЖК</span>
            </div>
            <Toolbar />
          </header>
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-white p-4">
              <ProjectBar />
              <ZoneList />
            </aside>
            <main className="min-w-0 flex-1 p-3">
              <CanvasStage />
            </main>
          </div>
        </div>
      </ViewProvider>
    </EditorProvider>
  )
}
