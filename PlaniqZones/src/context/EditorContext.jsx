import { createContext, useContext, useState, useCallback, useRef } from "react";

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [zones, setZones] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mode, setMode] = useState("select");
  const [image, setImage] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gridSnap, setGridSnap] = useState(false);
  const historyRef = useRef([]);
  const historyPosRef = useRef(0);

  const saveHistory = useCallback(() => {
    if (historyPosRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyPosRef.current + 1);
    }
    historyRef.current.push({ zones: [...zones], selectedIds: [...selectedIds], image, panOffset, zoom });
    historyPosRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, [zones, selectedIds, image, panOffset, zoom]);

  const undo = useCallback(() => {
    if (historyPosRef.current > 0) {
      historyPosRef.current--;
      const state = historyRef.current[historyPosRef.current];
      setZones(state.zones);
      setSelectedIds(state.selectedIds);
      setImage(state.image);
      setPanOffset(state.panOffset);
      setZoom(state.zoom);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyPosRef.current < historyRef.current.length - 1) {
      historyPosRef.current++;
      const state = historyRef.current[historyPosRef.current];
      setZones(state.zones);
      setSelectedIds(state.selectedIds);
      setImage(state.image);
      setPanOffset(state.panOffset);
      setZoom(state.zoom);
    }
  }, []);

  const addZone = useCallback((x, y, width = 120, height = 90, type = "rect", extra = {}) => {
    saveHistory();
    const newZone = { 
      id: Date.now(), x, y, width, height, 
      name: `Зона ${zones.length + 1}`, type, color: "#60a5fa", ...extra,
      style: {} // для text: { bold: false, italic: false }
    };
    setZones((prev) => [...prev, newZone]);
    setSelectedIds([newZone.id]);
  }, [zones.length, saveHistory]);

  const deleteZone = useCallback((id) => {
    saveHistory();
    setZones((prev) => prev.filter((z) => z.id !== id));
    setSelectedIds((prev) => prev.filter(s => s !== id));
  }, [saveHistory]);

  const deleteSelected = useCallback(() => {
    saveHistory();
    setZones((prev) => prev.filter((z) => !selectedIds.includes(z.id)));
    setSelectedIds([]);
  }, [selectedIds, saveHistory]);

  const updateZone = useCallback((id, newProps) => {
    saveHistory();
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...newProps } : z)));
  }, [saveHistory]);

  const updateSelected = useCallback((props) => {
    saveHistory();
    setZones((prev) => prev.map((z) => selectedIds.includes(z.id) ? { ...z, ...props } : z));
  }, [selectedIds, saveHistory]);

  const selectZone = useCallback((id, multi = false) => {
    if (multi && selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(s => s !== id));
    } else {
      setSelectedIds(multi ? [...selectedIds, id] : [id]);
    }
  }, [selectedIds]);

  // Export stubs
  const exportPNG = useCallback(() => {
    // Use html2canvas for real export
    console.log('PNG exported');
  }, [zones, image]);

  const exportSVG = useCallback(() => {
    // Build SVG string
    console.log('SVG exported');
  }, [zones]);

  // Init
  useState(() => saveHistory());

  const value = {
    zones, setZones, selectedIds, setSelectedIds, mode, setMode, image, setImage, 
    panOffset, setPanOffset, zoom, setZoom, gridSnap, setGridSnap, addZone, deleteZone, 
    deleteSelected, updateZone, updateSelected, selectZone, undo, redo, exportPNG, exportSVG,
    historyPosRef: { current: historyPosRef.current, max: historyRef.current.length - 1 }
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside EditorProvider");
  return context;
}