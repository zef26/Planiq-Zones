import { createContext, useContext, useState, useCallback } from "react";

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select");
  const [image, setImage] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // для hand mode

  const addZone = useCallback((x, y, width = 120, height = 90, type = "rect", extra = {}) => {
    const newZone = { 
      id: Date.now(), 
      x, y, width, height, 
      name: `Зона ${zones.length + 1}`,
      type,
      color: "#60a5fa",
      ...extra // для polygon: points, text: content
    };
    setZones((prev) => [...prev, newZone]);
  }, [zones.length]);

  const deleteZone = useCallback((id) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const updateZone = useCallback((id, newProps) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...newProps } : z)));
  }, []);

  const value = {
    zones, setZones, selectedId, setSelectedId, mode, setMode, image, setImage, 
    panOffset, setPanOffset, addZone, deleteZone, updateZone
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside EditorProvider");
  return context;
}