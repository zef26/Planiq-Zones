import { useState } from "react";
import { Trash2, Edit3, MapPin, Save, Square, Triangle, Type } from "lucide-react";
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

const typeIcons = {
  rect: Square,
  polygon: Triangle,
  text: Type,
};

export default function ZoneList() {
  const { zones, setZones, selectedId, setSelectedId, updateZone } = useEditor();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const handleDelete = (id) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    setEditingId(null);
  };

  const startEdit = (zone) => {
    setEditingId(zone.id);
    setEditName(zone.name || "");
  };

  const saveEdit = (id) => {
    updateZone(id, { name: editName });
    setEditingId(null);
  };

  const getTypeIcon = (type) => {
    const Icon = typeIcons[type] || MapPin;
    return <Icon size={16} className={selectedId === zones.find(z => z.id === id)?.id ? "text-blue-600" : "text-gray-400"} />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-full max-w-sm">
      <h2 className="text-lg font-semibold mb-3">Список зон ({zones.length})</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {zones.map((zone) => {
          const isSelected = selectedId === zone.id;
          const Icon = typeIcons[zone.type] || MapPin;
          return (
            <div
              key={zone.id}
              onClick={() => handleSelect(zone.id)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition
                ${isSelected ? "bg-blue-100 border border-blue-400" : "bg-gray-50 hover:bg-gray-100"}`}
            >
              <div className="flex items-center gap-2 flex-1">
                <Icon size={16} className={isSelected ? "text-blue-600" : "text-gray-400"} />
                {editingId === zone.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-2 py-1 border rounded text-sm bg-white"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`font-medium truncate text-sm ${
                      isSelected ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {zone.name || `Зона ${zone.id.substring(zone.id.length - 4)}`}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-1">({zone.type})</span>
              </div>
              <div className="flex gap-1">
                {editingId === zone.id ? (
                  <Tooltip text="Сохранить">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit(zone.id);
                      }}
                      className="p-1 hover:bg-green-200 rounded transition"
                    >
                      <Save size={14} className="text-green-600" />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip text="Редактировать">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(zone);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition"
                    >
                      <Edit3 size={14} className="text-gray-600" />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Удалить">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(zone.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded transition"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
      {zones.length === 0 && <p className="text-gray-500 text-sm mt-4 italic">Нет зон. Добавь с помощью инструментов!</p>}
    </div>
  );
}