import { useState } from "react";

export function useEditorState() {
  const [mode, setMode] = useState("select"); // select | rect | polygon | text | hand
  const [zones, setZones] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [image, setImage] = useState(null);

  return {
    mode,
    setMode,
    zones,
    setZones,
    selectedId,
    setSelectedId,
    image,
    setImage,
  };
}
