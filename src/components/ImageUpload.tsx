"use client";

import { useState } from "react";

type ImageUploadProps = {
  onImageSelect: (file: File) => void;
};

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    onImageSelect(file); // pass image file to parent
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="border rounded p-2"
      />
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="rounded-lg shadow max-w-xs max-h-64 object-cover"
        />
      )}
    </div>
  );
}
