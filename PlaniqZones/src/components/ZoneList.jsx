import { useState } from "react";
import { Trash2, Edit3, MapPin, Save, Square, Triangle, Type, Palette } from "lucide-react";
import { useEditor } from "../context/EditorContext";

function Tooltip({ text, children }) {
  return (
    <div className="relative group">
      {children}
      <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}

const typeIcons = { rect: Square, polygon: Triangle, text: Type };

export default function ZoneList() {
  const { zones, selectedIds, selectZone, updateZone, deleteZone, updateSelected } = useEditor();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [colorInput, setColorInput] = useState("#60a5fa");

  const handleSelect = (zone) => {
    selectZone(zone.id, e.ctrlKey);
    setEditingId(null);
    setColorInput(zone.color || "#60a5fa");
  };

  const startEdit = (zone) => {
    setEditingId(zone.id);
    setEditName(zone.name || "");
  };

  const saveEdit = () => {
    if (editingId) updateZone(editingId, { name: editName });
    setEditingId(null);
  };

  const changeColor = (e) => {
    setColorInput(e.target.value);
    if (selectedIds.length === 1) updateZone(selectedIds[0], { color: e.target.value });
    else updateSelected({ color: e.target.value });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 w-full">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <MapPin size={20} className="text-gray-400" />
        Список зон ({zones.length})
      </h2>
      {selectedIds.length > 1 && (
        <div className="mb-2 p-2 bg-blue-50 rounded flex gap-2 items-center">
          <span className="text-sm text-blue-700">Выбрано: {selectedIds.length}</span>
          <Tooltip text="Цвет для всех">
            <input type="color" value={colorInput} onChange={changeColor} className="w-8 h-8 rounded cursor-pointer" />
          </Tooltip>
        </div>
      )}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {zones.map((zone) => {
          const isSelected = selectedIds.includes(zone.id);
          const Icon = typeIcons[zone.type] || MapPin;
          return (
            <div
              key={zone.id}
              onClick={(e) => handleSelect(zone, e)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition
                ${isSelected ? "bg-blue-100 border-2 border-blue-400" : "bg-gray-50 hover:bg-gray-100"}`}
            >
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => selectZone(zone.id, true)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4"
                />
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
                  <span className={`font-medium truncate ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                    {zone.name || `Зона ${zone.id.toString().slice(-4)}`}
                  </span>
                )}
                <span className="text-xs text-gray-400">({zone.type})</span>
              </div>
              <div className="flex items-center gap-1">
                {isSelected && (
                  <Tooltip text="Цвет">
                    <input
                      type="color"
                      value={colorInput}
                      onChange={changeColor}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </Tooltip>
                )}
                {editingId === zone.id ? (
                  <Tooltip text="Сохранить">
                    <button onClick={saveEdit} className="p-1 hover:bg-green-200 rounded">
                      <Save size={14} className="text-green-600" />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip text="Редактировать">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(zone); }} className="p-1 hover:bg-gray-200 rounded">
                      <Edit3 size={14} className="text-gray-600" />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Удалить">
                  <button onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }} className="p-1 hover:bg-red-100 rounded">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
      {zones.length === 0 && <p className="text-gray-500 text-sm mt-4 italic text-center">Добавь зоны!</p>}
    </div>
  );
}