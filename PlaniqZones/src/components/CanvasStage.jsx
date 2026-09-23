import { useEditor } from "../context/EditorContext";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Grid } from "lucide-react";

export default function CanvasStage() {
  const { zones, addZone, image, mode, selectedIds, setSelectedIds, selectZone, updateZone, updateSelected, panOffset, setPanOffset, zoom, setZoom, gridSnap, setGridSnap, deleteSelected, undo, redo } = useEditor();
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectBox, setSelectBox] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempZone, setTempZone] = useState(null);
  const [polyPoints, setPolyPoints] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState(0);
  const [dragThreshold, setDragThreshold] = useState(10); // px

  const snapToGrid = useCallback((pos) => gridSnap ? {
    x: Math.round(pos.x / 20) * 20,
    y: Math.round(pos.y / 20) * 20
  } : pos, [gridSnap]);

  const getRelativePos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = e.clientX - rect.left;
    const scaleY = e.clientY - rect.top;
    return snapToGrid({
      x: (scaleX - panOffset.x) / zoom,
      y: (scaleY - panOffset.y) / zoom
    });
  }, [panOffset, zoom, snapToGrid]);

  // Intersection check for lasso
  const intersects = useCallback((box, zone) => {
    const boxRect = new DOMRect(box.x * zoom + panOffset.x, box.y * zoom + panOffset.y, box.width * zoom, box.height * zoom);
    const zoneRect = new DOMRect(zone.x * zoom + panOffset.x, zone.y * zoom + panOffset.y, zone.width * zoom, zone.height * zoom);
    return !(boxRect.right < zoneRect.left || zoneRect.right < boxRect.left ||
             boxRect.bottom < zoneRect.top || zoneRect.bottom < boxRect.top);
  }, [zoom, panOffset]);

  const getHandlePos = useCallback((handle, x, y, w, h) => {
    const positions = {
      n: { x: x + w / 2, y: y - 4 },
      s: { x: x + w / 2, y: y + h },
      e: { x: x + w, y: y + h / 2 },
      w: { x: x - 4, y: y + h / 2 },
      ne: { x: x + w, y: y - 4 },
      nw: { x: x - 4, y: y - 4 },
      se: { x: x + w, y: y + h },
      sw: { x: x - 4, y: y + h }
    };
    return positions[handle];
  }, []);

  const throttle = useCallback((func, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId); // Захват событий
    const pos = getRelativePos(e);
    const ctrlKey = e.ctrlKey;
    const shiftKey = e.shiftKey;
    setStartPos(pos);

    if (mode === "hand") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    if (mode === "select" && ctrlKey && shiftKey) {
      setIsMultiSelecting(true);
      setSelectBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }
    if (mode === "polygon") {
      const first = polyPoints[0];
      if (first && Math.abs(pos.x - first.x) < 10 && Math.abs(pos.y - first.y) < 10 && polyPoints.length > 2) {
        const points = [...polyPoints, first];
        const bbox = points.reduce((acc, p) => ({
          minX: Math.min(acc.minX, p.x), minY: Math.min(acc.minY, p.y),
          maxX: Math.max(acc.maxX, p.x), maxY: Math.max(acc.maxY, p.y)
        }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        addZone(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, "polygon", { points });
        setPolyPoints([]);
        return;
      }
      setPolyPoints(prev => [...prev, pos]);
      return;
    }
    if (mode === "text") {
      addZone(pos.x, pos.y, 150, 50, "text", { content: "Текст..." });
      return;
    }
    if (mode === "rect") {
      setTempZone({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    // Выделение/Drag/Resize
    let targetZone = null;
    let handle = null;
    zones.forEach((zone) => {
      const adjX = zone.x * zoom + panOffset.x;
      const adjY = zone.y * zoom + panOffset.y;
      const adjW = zone.width * zoom;
      const adjH = zone.height * zoom;
      if (pos.x * zoom >= adjX && pos.x * zoom <= adjX + adjW && pos.y * zoom >= adjY && pos.y * zoom <= adjY + adjH) {
        targetZone = zone;
      }
      const handleSize = 8 / zoom;
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(h => {
        const hp = getHandlePos(h, adjX, adjY, adjW, adjH);
        if (Math.hypot(pos.x * zoom - hp.x, pos.y * zoom - hp.y) < handleSize) {
          handle = h;
          targetZone = zone;
        }
      });
    });

    if (targetZone) {
      if (ctrlKey) {
        selectZone(targetZone.id, true); // Toggle add/remove
      } else {
        setSelectedIds([targetZone.id]);
      }
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragOffset({ x: pos.x * zoom - getHandlePos(handle, targetZone.x * zoom + panOffset.x, targetZone.y * zoom + panOffset.y, targetZone.width * zoom, targetZone.height * zoom).x, y: pos.y * zoom - getHandlePos(handle, targetZone.x * zoom + panOffset.x, targetZone.y * zoom + panOffset.y, targetZone.width * zoom, targetZone.height * zoom).y });
      } else {
        setIsDragging(true);
        setDragOffset({ x: pos.x * zoom - (targetZone.x * zoom), y: pos.y * zoom - (targetZone.y * zoom) });
      }
    } else if (mode === "select") {
      if (!ctrlKey) setSelectedIds([]); // Deselect on empty unless Ctrl
    }
  }, [mode, zones, getRelativePos, addZone, selectZone, setSelectedIds, panOffset, zoom, polyPoints, getHandlePos]);

  const handlePointerMove = useCallback(throttle((e) => {
    const pos = getRelativePos(e);
    const shiftKey = e.shiftKey;
    const dragDist = Math.hypot(pos.x - startPos.x, pos.y - startPos.y) * zoom;

    if (isMultiSelecting && selectBox) {
      setSelectBox({
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y)
      });
      return;
    }
    if (mode === "rect" && tempZone && dragDist > dragThreshold) {
      const newX = Math.min(startPos.x, pos.x);
      const newY = Math.min(startPos.y, pos.y);
      setTempZone({
        x: newX, y: newY,
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y)
      });
      return;
    }
    if (isDragging && dragDist > dragThreshold) {
      const deltaX = (e.clientX - dragOffset.x - panOffset.x) / zoom;
      const deltaY = (e.clientY - dragOffset.y - panOffset.y) / zoom;
      updateSelected({ x: deltaX, y: deltaY }); // Применить delta ко всем selected
      return;
    }
    if (isResizing && selectedIds.length === 1 && dragDist > dragThreshold) {
      const zone = zones.find(z => z.id === selectedIds[0]);
      let newW = zone.width, newH = zone.height, newX = zone.x, newY = zone.y;
      const aspect = shiftKey ? zone.width / zone.height : 1;
      // Пример для 'se' — аналогично для других
      if (resizeHandle === 'se') {
        newW = Math.max(20 / zoom, (e.clientX - zone.x * zoom - panOffset.x) / zoom);
        newH = shiftKey ? newW * aspect : Math.max(20 / zoom, (e.clientY - zone.y * zoom - panOffset.y) / zoom);
      } // Добавить cases для других handles
      updateZone(selectedIds[0], { x: newX, y: newY, width: newW, height: newH });
      return;
    }
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, 16), [mode, tempZone, startPos, isDragging, selectedIds, zones, dragOffset, updateSelected, isResizing, resizeHandle, getRelativePos, isPanning, panStart, zoom, panOffset, isMultiSelecting, selectBox, dragThreshold]);

  const handlePointerUp = useCallback((e) => {
    const pos = getRelativePos(e);
    const dragDist = Math.hypot(pos.x - startPos.x, pos.y - startPos.y) * zoom;

    if (mode === "rect" && tempZone && dragDist > dragThreshold) {
      addZone(tempZone.x, tempZone.y, tempZone.width, tempZone.height);
    }
    if (isMultiSelecting) {
      // Lasso: add intersecting zones
      const newSelected = [...selectedIds];
      zones.forEach((zone) => {
        if (intersects(selectBox, zone) && !newSelected.includes(zone.id)) {
          newSelected.push(zone.id);
        }
      });
      setSelectedIds(newSelected);
      setSelectBox(null);
      setIsMultiSelecting(false);
    }
    if (dragDist <= dragThreshold && mode === "select") {
      setSelectedIds([]); // Deselect if no drag
    }
    setTempZone(null);
    setIsDragging(false);
    setIsResizing(false);
    setIsPanning(false);
  }, [mode, tempZone, addZone, getRelativePos, isMultiSelecting, selectBox, selectedIds, setSelectedIds, zones, intersects, dragThreshold]);

  const handleClick = useCallback((e) => {
    if (mode === "select" && e.detail === 1) { // Single click
      const pos = getRelativePos(e);
      addZone(pos.x, pos.y);
    }
  }, [mode, getRelativePos, addZone]);

  const handlePointerLeave = useCallback((e) => {
    handlePointerUp(e); // Cancel on leave
  }, [handlePointerUp]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(10, Math.max(0.1, zoom * delta));
    setZoom(newZoom);
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setPanOffset({
      x: mouseX - (mouseX - panOffset.x) * (newZoom / zoom),
      y: mouseY - (mouseY - panOffset.y) * (newZoom / zoom)
    });
  }, [zoom, panOffset]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setLastTouchDist(dist);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist / lastTouchDist;
      setZoom(Math.min(10, Math.max(0.1, zoom * delta)));
      setLastTouchDist(dist);
      e.preventDefault();
    }
  }, [lastTouchDist, zoom]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') setSelectedIds([]);
      if (e.key === 'Delete') deleteSelected();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, deleteSelected, setSelectedIds]);

  const cursorClass = isPanning ? "cursor-grabbing" : 
                     isResizing ? `cursor-${resizeHandle}-resize` : 
                     mode === "hand" ? "cursor-grab" : 
                     isMultiSelecting ? "cursor-crosshair" : "cursor-default";

  const renderedZones = useMemo(() => zones.map((z) => {
    const isSelected = selectedIds.includes(z.id);
    const adjX = z.x * zoom + panOffset.x;
    const adjY = z.y * zoom + panOffset.y;
    const adjW = z.width * zoom;
    const adjH = z.height * zoom;
    return { z, isSelected, adjX, adjY, adjW, adjH };
  }), [zones, selectedIds, zoom, panOffset]);

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full bg-gray-200 rounded-xl relative select-none ${cursorClass}`} // user-select: none
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      style={{ overflow: 'hidden', touchAction: 'none' }}
    >
      <div
        ref={wrapperRef}
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {image && <img src={image} alt="Background" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" />}
        {renderedZones.map(({ z, isSelected, adjX, adjY, adjW, adjH }) => (
          <div
            key={z.id}
            className={`absolute border-2 ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-500'} ${z.type === 'text' ? 'bg-white/90' : 'bg-blue-200/30'} rounded overflow-hidden cursor-move`}
            style={{ left: adjX, top: adjY, width: adjW, height: adjH }}
          >
            {z.type === "rect" && <div className="w-full h-full" />}
            {z.type === "polygon" && (
              <svg className="w-full h-full" viewBox={`0 0 ${z.width} ${z.height}`}>
                <polygon
                  points={z.points.map(p => `${p.x - z.x},${p.y - z.y}`).join(' ')}
                  fill={z.color + '20'}
                  stroke={z.color}
                  strokeWidth="2"
                />
              </svg>
            )}
            {z.type === "text" && (
              <div
                contentEditable
                suppressContentEditableWarning
                className={`w-full h-full outline-none p-1 text-sm resize-none overflow-auto ${z.style?.bold ? 'font-bold' : ''} ${z.style?.italic ? 'italic' : ''}`}
                onInput={(e) => updateZone(z.id, { content: e.currentTarget.innerText })}
                style={{ minHeight: '100%' }}
              >
                {z.content || "Текст..."}
              </div>
            )}
            {isSelected && (
              <>
                <span className="absolute -top-1 -left-1 text-xs bg-blue-500 text-white px-1 rounded">{z.name}</span>
                {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(h => (
                  <div
                    key={h}
                    className={`absolute bg-blue-500 w-3 h-3 rounded-full cursor-${h}-resize`}
                    style={getHandlePos(h, adjX, adjY, adjW, adjH)}
                  />
                ))}
              </>
            )}
          </div>
        ))}
        {tempZone && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-200/20 pointer-events-none"
            style={{ left: tempZone.x * zoom + panOffset.x, top: tempZone.y * zoom + panOffset.y, width: tempZone.width * zoom, height: tempZone.height * zoom }}
          />
        )}
        {mode === "polygon" && polyPoints.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
            <polyline
              points={polyPoints.map(p => `${p.x * zoom},${p.y * zoom}`).join(' ')}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
            {polyPoints.map((p, i) => (
              <circle key={i} cx={p.x * zoom} cy={p.y * zoom} r="3" fill="#3b82f6" />
            ))}
          </svg>
        )}
      </div>
      {selectBox && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-200/20 pointer-events-none"
          style={{ left: selectBox.x * zoom + panOffset.x, top: selectBox.y * zoom + panOffset.y, width: selectBox.width * zoom, height: selectBox.height * zoom }}
        />
      )}
      {selectedIds.length > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded text-sm">
          Выбрано: {selectedIds.length}
        </div>
      )}
      {polyPoints.length > 0 && <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">Точек: {polyPoints.length} (клик на первую для закрытия)</div>}
      {!image && zones.length === 0 && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 text-center">
          Загрузи изображение и используй инструменты!
        </span>
      )}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">Zoom: {zoom.toFixed(2)}x | Esc: Deselect | Del: Delete</div>
      <button onClick={() => setGridSnap(!gridSnap)} className="absolute top-2 right-2 p-1 bg-white rounded shadow text-xs">
        <Grid size={12} />
        {gridSnap ? 'On' : 'Off'}
      </button>
    </div>
  );
}