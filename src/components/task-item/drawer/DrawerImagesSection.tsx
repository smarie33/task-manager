"use client";

import React from "react";
import { FileMeta } from "@/types/task";

type DrawerImagesSectionProps = {
  images: FileMeta[];
};

const DrawerImagesSection: React.FC<DrawerImagesSectionProps> = ({ images }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Images</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((f) => (
          <div key={f.id} className="rounded-md border overflow-hidden">
            <img
              src={f.url}
              alt={f.name}
              className="w-full h-28 object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrawerImagesSection;