import { useEditor } from "../context/EditorContext";
import { useRef, useState, useCallback, useEffect } from "react";
import { Square, Type, Triangle, MousePointer, Hand } from "lucide-react";

export default function CanvasStage() {
  const { zones, addZone, image, mode, selectedId, setSelectedId, updateZone, panOffset, setPanOffset } = useEditor();
  const canvasRef = useRef(null);
  const svgRef = useRef(null); // для polygon
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempZone, setTempZone] = useState(null);
  const [polyPoints, setPolyPoints] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const getRelativePos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + panOffset.x,
      y: e.clientY - rect.top + panOffset.y
    };
  }, [panOffset]);

  // MouseDown
  const handleMouseDown = useCallback((e) => {
    const pos = getRelativePos(e);
    if (mode === "hand") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
    if (mode === "polygon") {
      if (polyPoints.length === 0 || polyPoints[0].x !== pos.x || polyPoints[0].y !== pos.y) {
        setPolyPoints(prev => [...prev, pos]);
      }
      return;
    }
    if (mode === "text") {
      addZone(pos.x, pos.y, 150, 50, "text", { content: "Текст..." });
      setSelectedId(zones.length ? zones[zones.length - 1].id : null); // фокус на новую
      return;
    }
    if (mode === "rect") {
      setStartPos(pos);
      setTempZone({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    // Drag/Resize для select
    let targetZone = null;
    let handle = null;
    zones.forEach((zone) => {
      const zoneX = zone.x - panOffset.x;
      const zoneY = zone.y - panOffset.y;
      if (pos.x >= zoneX && pos.x <= zoneX + zone.width && pos.y >= zoneY && pos.y <= zoneY + zone.height) {
        targetZone = zone;
      }
      const resizeSize = 10;
      if (pos.x >= zoneX + zone.width - resizeSize && pos.x <= zoneX + zone.width &&
          pos.y >= zoneY + zone.height - resizeSize && pos.y <= zoneY + zone.height) {
        handle = 'se';
        targetZone = zone;
      }
    });

    if (targetZone) {
      setSelectedId(targetZone.id);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
      } else {
        setIsDragging(true);
        setDragOffset({ x: pos.x - (targetZone.x - panOffset.x), y: pos.y - (targetZone.y - panOffset.y) });
      }
    } else if (mode === "select") {
      setSelectedId(null);
    }
  }, [mode, zones, getRelativePos, addZone, setSelectedId, panOffset]);

  // MouseMove
  const handleMouseMove = useCallback((e) => {
    const pos = getRelativePos(e);
    if (mode === "rect" && tempZone) {
      setTempZone({
        ...tempZone,
        width: Math.max(0, pos.x - startPos.x),
        height: Math.max(0, pos.y - startPos.y),
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y)
      });
    }
    if (mode === "polygon") {
      // preview line to next point
      if (svgRef.current) {
        svgRef.current.style.cursor = polyPoints.length > 0 ? 'crosshair' : 'crosshair';
      }
    }
    if (isDragging && selectedId) {
      const zone = zones.find(z => z.id === selectedId);
      if (zone) {
        updateZone(selectedId, {
          x: pos.x - dragOffset.x + panOffset.x,
          y: pos.y - dragOffset.y + panOffset.y
        });
      }
    }
    if (isResizing && selectedId && resizeHandle === 'se') {
      const zone = zones.find(z => z.id === selectedId);
      if (zone) {
        updateZone(selectedId, {
          width: Math.max(20, pos.x - (zone.x - panOffset.x)),
          height: Math.max(20, pos.y - (zone.y - panOffset.y))
        });
      }
    }
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [mode, tempZone, startPos, isDragging, selectedId, zones, dragOffset, updateZone, isResizing, resizeHandle, getRelativePos, panOffset, isPanning, panStart]);

  // MouseUp
  const handleMouseUp = useCallback((e) => {
    const pos = getRelativePos(e);
    if (mode === "rect" && tempZone && tempZone.width > 0) {
      addZone(tempZone.x, tempZone.y, tempZone.width, tempZone.height, "rect");
    }
    setTempZone(null);
    setIsDragging(false);
    setIsResizing(false);
    setIsPanning(false);
  }, [mode, tempZone, addZone, getRelativePos]);

  // Click for select
  const handleClick = useCallback((e) => {
    if (mode === "select") {
      const pos = getRelativePos(e);
      addZone(pos.x, pos.y, 120, 90, "rect");
    }
  }, [mode, getRelativePos, addZone]);

  // DoubleClick for polygon close
  const handleDoubleClick = useCallback((e) => {
    if (mode === "polygon" && polyPoints.length > 2) {
      addZone(polyPoints[0].x, polyPoints[0].y, 0, 0, "polygon", { points: [...polyPoints, polyPoints[0]] });
      setPolyPoints([]);
    }
  }, [mode, polyPoints, addZone]);

  // Cursor class
  const cursorClass = mode === "hand" ? "cursor-move" : 
                     mode === "select" ? "cursor-default" : 
                     "cursor-crosshair";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = cursorClass;
  }, [mode, cursorClass]);

  return (
    <div
      ref={canvasRef}
      className={`w-full h-full bg-gray-200 rounded-xl relative ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
        {image && <img src={image} alt="Background" className="absolute top-0 left-0 w-full h-full object-contain" />}
        
        {/* Zones */}
        {zones.map((z) => {
          const isSelected = selectedId === z.id;
          const zoneX = z.x;
          const zoneY = z.y;
          return (
            <div
              key={z.id}
              className={`absolute border-2 ${isSelected ? 'border-blue-500' : 'border-gray-500'} ${z.type === 'text' ? 'bg-white/80' : 'bg-blue-200/30'}`}
              style={{ left: zoneX, top: zoneY, width: z.width, height: z.height }}
            >
              {z.type === "rect" && <div className="w-full h-full" />}
              {z.type === "polygon" && (
                <svg className="w-full h-full" viewBox={`0 0 ${z.width} ${z.height}`}>
                  <polygon
                    points={z.points.map(p => `${p.x - zoneX},${p.y - zoneY}`).join(' ')}
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
                  className="w-full h-full outline-none p-2 text-sm resize-none"
                  onBlur={(e) => updateZone(z.id, { content: e.target.innerText })}
                  dangerouslySetInnerHTML={{ __html: z.content || "" }}
                />
              )}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize" />
              )}
            </div>
          );
        })}

        {/* Temp rect */}
        {tempZone && mode === "rect" && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-200/20 pointer-events-none"
            style={{ left: tempZone.x, top: tempZone.y, width: tempZone.width, height: tempZone.height }}
          />
        )}

        {/* Temp polygon preview */}
        {mode === "polygon" && polyPoints.length > 0 && (
          <svg ref={svgRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ left: 0, top: 0 }}>
            <polyline
              points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
            <circle cx={polyPoints[polyPoints.length - 1]?.x} cy={polyPoints[polyPoints.length - 1]?.y} r="3" fill="#3b82f6" />
          </svg>
        )}
      </div>

      {!image && zones.length === 0 && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 text-center">
          Загрузи изображение и используй инструменты!
        </span>
      )}
    </div>
  );
}