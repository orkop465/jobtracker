"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Called when a file is dropped anywhere on the window. */
  onDrop: (file: File) => void;
  /** Disable the overlay (e.g. while a parse animation is running). */
  disabled?: boolean;
}

/**
 * Window-level drag-and-drop overlay. Shown when the user drags a file
 * from the OS over the page; consumes the drop and forwards the file.
 */
export function DragOverlay({ onDrop, disabled }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (disabled) return;
    let counter = 0;

    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      counter += 1;
      setShow(true);
    }
    function onDragLeave() {
      counter = Math.max(0, counter - 1);
      if (counter === 0) setShow(false);
    }
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
    }
    function onDropHandler(e: DragEvent) {
      if (!e.dataTransfer?.types?.includes("Files")) return;
      e.preventDefault();
      counter = 0;
      setShow(false);
      const f = e.dataTransfer.files[0];
      if (f) onDrop(f);
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDropHandler);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDropHandler);
    };
  }, [onDrop, disabled]);

  if (disabled || !show) return null;
  return (
    <div className="res-drop-overlay">
      <div className="res-drop-overlay-inner">
        <div className="res-drop-overlay-eyebrow">Drop to upload</div>
        <div className="res-drop-overlay-title">Add a new resume variant</div>
      </div>
    </div>
  );
}
