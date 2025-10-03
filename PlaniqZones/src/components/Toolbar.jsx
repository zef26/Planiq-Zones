import { useRef } from "react";
import { MousePointer, Square, Triangle, Type, Hand, Upload, FileDown, FileUp, Trash2 } from "lucide-react";
import { useEditor } from "../context/EditorContext";

const tools = [
  { id: "select", title: "Выделение", Icon: MousePointer },
  { id: "rect", title: "Прямоугольник", Icon: Square },
  { id: "polygon", title: "Полиго́н", Icon: Triangle },
  { id: "text", title: "Текст", Icon: Type },
  { id: "hand", title: "Рука / Перемещение", Icon: Hand },
];

export default function Toolbar() {
  const { mode, setMode, setZones, setImage } = useEditor();
  const uploadRef = useRef(null);
  const importRef = useRef(null);

  const handleExport = () => {
    const data = JSON.stringify({ zones: [] }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zones.json";
    a.click();
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data?.zones) setZones(data.zones);
      } catch {
        alert("Ошибка импорта JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleUploadImage = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage(url);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg z-50">
      {/* Tools */}
      <div className="flex items-center gap-2">
        {tools.map(({ id, title, Icon }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => setMode(id)}
              className={`p-2 rounded-xl flex items-center justify-center transition-all
                ${mode === id ? "bg-blue-600 text-white scale-110 shadow-md" : "text-gray-300 hover:text-white hover:bg-white/20"}`}
            >
              <Icon size={20} />
            </button>
            <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black/70 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
              {title}
            </span>
          </div>
        ))}
      </div>

      <div className="w-px h-6 bg-white/30 mx-2" />

      {/* Upload / Import */}
      <div className="flex items-center gap-2">
        {/* Upload Image */}
        <div className="relative group">
          <button onClick={() => uploadRef.current?.click()} className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/20 transition">
            <Upload size={20} />
          </button>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e.target.files?.[0])} />
          <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black/70 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
            Загрузить изображение
          </span>
        </div>

        {/* Import JSON */}
        <div className="relative group">
          <button onClick={() => importRef.current?.click()} className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/20 transition">
            <FileUp size={20} />
          </button>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => handleImport(e.target.files?.[0])} />
        </div>
      </div>

      {/* Export / Clear */}
      <div className="flex items-center gap-2 ml-2">
        <button onClick={handleExport} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition">
          <FileDown size={20} />
        </button>
        <button onClick={() => setZones([])} className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow transition">
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
