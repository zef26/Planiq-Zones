import { createContext, useContext, useState } from "react";

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select");
  const [image, setImage] = useState(null);

  const addZone = (x, y) => {
    const newZone = { id: Date.now(), x, y, width: 120, height: 90, color: "#60a5fa" };
    setZones((prev) => [...prev, newZone]);
  };

  const deleteZone = () => {
    if (selectedId) {
      setZones((prev) => prev.filter((z) => z.id !== selectedId));
      setSelectedId(null);
    }
  };

  const updateZone = (id, newProps) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...newProps } : z)));
  };

  return (
    <EditorContext.Provider
      value={{ zones, setZones, selectedId, setSelectedId, mode, setMode, image, setImage, addZone, deleteZone, updateZone }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside EditorProvider");
  return context;
}
