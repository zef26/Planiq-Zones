import { useEditor } from "../context/EditorContext";

export default function CanvasStage() {
  const { zones, addZone, image } = useEditor();

  return (
    <div className="w-full h-full bg-gray-200 rounded-xl relative" onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addZone(x, y);
    }}>
      {image && <img src={image} alt="Background" className="absolute top-0 left-0 w-full h-full object-contain" />}
      {zones.map((z) => (
        <div key={z.id} className="absolute border-2 border-blue-500 bg-blue-200/30"
          style={{ left: z.x, top: z.y, width: z.width, height: z.height }} />
      ))}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500">
        Кликни, чтобы добавить зону
      </span>
    </div>
  );
}
