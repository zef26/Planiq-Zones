import { useRef } from "react";
import { MousePointer, Square, Triangle, Type, Hand, Upload, FileDown, FileUp, Trash2 } from "lucide-react";
import { useEditor } from "../context/EditorContext";

const tools = [
  { id: "select", title: "Выделение", Icon: MousePointer },
  { id: "rect", title: "Прямоугольник", Icon: Square },
  { id: "polygon", title: "Полигон", Icon: Triangle },
  { id: "text", title: "Текст", Icon: Type },
  { id: "hand", title: "Рука / Панорамирование", Icon: Hand },
];

export default function Toolbar() {
  const { mode, setMode, setZones, zones, image, setImage } = useEditor();
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

  const handleExport = () => {
    const data = { zones, image };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zones.json";
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
        alert("Ошибка импорта JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center justify-between">
      {/* Tools */}
      <div className="flex items-center gap-2">
        {tools.map(({ id, title, Icon }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => setMode(id)}
              className={`p-2 rounded-xl flex items-center justify-center transition-all shadow-sm
                ${mode === id ? "bg-blue-600 text-white scale-105 shadow-md" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"}`}
            >
              <Icon size={18} />
            </button>
            <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
              {title}
            </span>
          </div>
        ))}
        <span className="text-sm text-gray-600 ml-4">Режим: {tools.find(t => t.id === mode)?.title || mode}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Upload Image with Preview */}
        <div className="relative group">
          <button onClick={() => uploadRef.current?.click()} className="p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition flex items-center gap-2 shadow-sm">
            <Upload size={18} />
            {image && <div className="w-5 h-5 bg-cover rounded" style={{ backgroundImage: `url(${image})` }} />}
          </button>
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
          <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Загрузить изображение
          </span>
        </div>

        {/* Import JSON */}
        <div className="relative group">
          <button onClick={() => importRef.current?.click()} className="p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition shadow-sm">
            <FileUp size={18} />
          </button>
          <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Импорт
          </span>
        </div>

        {/* Export */}
        <button onClick={handleExport} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition" title="Экспорт JSON">
          <FileDown size={18} />
        </button>

        {/* Clear All */}
        <button onClick={() => { setZones([]); setImage(null); }} className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow transition" title="Очистить всё">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}