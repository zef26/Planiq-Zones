import { useRef } from "react";
import { MousePointer, Square, Triangle, Type, Hand, Upload, FileDown, FileUp, Trash2, Undo, Redo, ZoomIn, ZoomOut, Grid } from "lucide-react";
import { useEditor } from "../context/EditorContext";

const tools = [
  { id: "select", title: "Выделение", Icon: MousePointer },
  { id: "rect", title: "Прямоугольник", Icon: Square },
  { id: "polygon", title: "Полигон", Icon: Triangle },
  { id: "text", title: "Текст", Icon: Type },
  { id: "hand", title: "Рука", Icon: Hand },
];

export default function Toolbar() {
  const { mode, setMode, setZones, zones, image, setImage, zoom, setZoom, undo, redo, historyPosRef, gridSnap, setGridSnap, exportPNG, exportSVG, updateSelected } = useEditor();
  const uploadRef = useRef(null);
  const importRef = useRef(null);

  const handleFileToBase64 = (file, callback) => {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileToBase64(file, setImage);
  };

  const handleZoomIn = () => setZoom(Math.min(10, zoom * 1.2));
  const handleZoomOut = () => setZoom(Math.max(0.1, zoom / 1.2));
  const handleResetZoom = () => { setZoom(1); setPanOffset({ x: 0, y: 0 }); };

  const handleExport = () => {
    const data = { zones, image };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotation.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data?.zones) setZones(data.zones);
        if (data?.image) setImage(data.image);
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Tools */}
      <div className="flex items-center gap-2">
        {tools.map(({ id, title, Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`p-2 rounded-xl flex items-center justify-center transition-all shadow-sm
              ${mode === id ? "bg-blue-600 text-white scale-105 shadow-md" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
            title={title}
          >
            <Icon size={18} />
          </button>
        ))}
        <span className="text-sm text-gray-600">{tools.find(t => t.id === mode)?.title}</span>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <button onClick={handleZoomOut} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <span className="text-sm text-gray-600 w-12 text-center">{zoom.toFixed(1)}x</span>
        <button onClick={handleZoomIn} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button onClick={handleResetZoom} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" title="Reset">1x</button>
      </div>

      {/* History */}
      <div className="flex items-center gap-2">
        <button onClick={undo} disabled={historyPosRef.current === 0} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50" title="Undo">
          <Undo size={18} />
        </button>
        <button onClick={redo} disabled={historyPosRef.current === historyPosRef.max} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50" title="Redo">
          <Redo size={18} />
        </button>
      </div>

      {/* Grid & Text styles */}
      <div className="flex items-center gap-2">
        <button onClick={() => setGridSnap(!gridSnap)} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" title="Grid">
          <Grid size={18} />
        </button>
        {mode === 'text' && (
          <>
            <button onClick={() => updateSelected({ style: { bold: true } })} className="p-1 bg-gray-200 rounded text-sm font-bold">B</button>
            <button onClick={() => updateSelected({ style: { italic: true } })} className="p-1 bg-gray-200 rounded text-sm italic">I</button>
          </>
        )}
      </div>

      {/* File */}
      <div className="flex items-center gap-2">
        <button onClick={() => uploadRef.current?.click()} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1" title="Upload">
          <Upload size={18} />
          {image && <div className="w-4 h-4 bg-cover rounded" style={{ backgroundImage: `url(${image})` }} />}
        </button>
        <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />

        <button onClick={() => importRef.current?.click()} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100" title="Import">
          <FileUp size={18} />
        </button>
        <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />

        <button onClick={handleExport} className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500" title="JSON">
          <FileDown size={18} />
        </button>

        <button onClick={exportPNG} className="p-2 rounded-xl bg-green-600 text-white hover:bg-green-500" title="PNG">
          PNG
        </button>

        <button onClick={exportSVG} className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500" title="SVG">
          SVG
        </button>

        <button onClick={() => { setZones([]); setImage(null); setZoom(1); setPanOffset({ x: 0, y: 0 }); }} className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-500" title="Clear">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}