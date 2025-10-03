import React from "react";
import { useEditor } from "../hooks/useEditorState";

export default function ImageUploader() {
  const { editorState, setEditorState } = useEditor();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // читаем файл в base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditorState((prev) => ({
        ...prev,
        image: reader.result, // base64
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 border rounded-md w-fit">
      <input type="file" accept="image/*" onChange={handleFileChange} />

      {editorState.image && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">Загружено:</p>
          <img
            src={editorState.image}
            alt="Uploaded preview"
            className="mt-2 w-40 rounded-md shadow-md"
          />
        </div>
      )}
    </div>
  );
}
