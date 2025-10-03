import { EditorProvider } from "./context/EditorContext";
import Toolbar from "./components/Toolbar";
import CanvasStage from "./components/CanvasStage";
import ZoneList from "./components/ZoneList";

export default function App() {
  return (
    <EditorProvider>
      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Toolbar */}
        <div className="p-4 border-b bg-white shadow">
          <Toolbar />
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Zone List */}
          <div className="w-64 border-r bg-white p-4 overflow-y-auto">
            <ZoneList />
          </div>

          {/* Canvas Stage */}
          <div className="flex-1 p-4">
            <CanvasStage />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
