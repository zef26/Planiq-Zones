import { Trash2, Edit3, MapPin } from "lucide-react";
import { useEditor } from "../context/EditorContext";

function Tooltip({ text, children }) {
  return (
    <div className="relative group inline-block">
      {children}
      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap
        px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition">
        {text}
      </span>
    </div>
  );
}

export default function ZoneList() {
  const { zones, setZones, selectedId, setSelectedId } = useEditor();

  const handleDelete = (id) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleEdit = (id) => {
    alert("Редактируем зону: " + id);
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-full max-w-sm">
      <h2 className="text-lg font-semibold mb-3">Список зон</h2>
      <div className="space-y-2">
        {zones.map((zone) => (
          <div
            key={zone.id}
            onClick={() => handleSelect(zone.id)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition
              ${selectedId === zone.id
                ? "bg-blue-100 border border-blue-400"
                : "bg-gray-50 hover:bg-gray-100"
              }`}
          >
            <div className="flex items-center gap-2">
              <MapPin
                size={20}
                className={selectedId === zone.id ? "text-blue-600" : "text-gray-400"}
              />
              <span
                className={`font-medium ${
                  selectedId === zone.id ? "text-blue-700" : "text-gray-700"
                }`}
              >
                {zone.name || `Зона ${zone.id}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Tooltip text="Редактировать">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(zone.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-lg transition"
                >
                  <Edit3 size={18} className="text-gray-600" />
                </button>
              </Tooltip>
              <Tooltip text="Удалить">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(zone.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded-lg transition"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
