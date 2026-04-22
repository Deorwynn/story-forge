import { useState, useEffect, useCallback } from 'react';
import ModalShell from '../shared/ModalShell';
import Slider from '../shared/Slider';
import Button from '../shared/Button';
import { PortraitFrame } from '../../types/character';

interface PortraitFramerModalProps {
  imageSrc: string;
  initialFrame: PortraitFrame | null | undefined; // Allow null/undefined
  onSave: (frame: PortraitFrame) => void;
  onClose: () => void;
}

export default function PortraitFramerModal({
  imageSrc,
  initialFrame,
  onSave,
  onClose,
}: PortraitFramerModalProps) {
  const [zoom, setZoom] = useState(initialFrame?.zoom ?? 1);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({
    x: initialFrame?.offset_x ?? 50,
    y: initialFrame?.offset_y ?? 50,
  });

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const container = document.getElementById('viewfinder-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Calculate percentage based on mouse position relative to container
    const x = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100, ((clientY - rect.top) / rect.height) * 100)
    );

    setOffset({ x, y });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      window.requestAnimationFrame(() => {
        updatePosition(e.clientX, e.clientY);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updatePosition]);

  return (
    <ModalShell title="Position Portrait" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
            Click or Drag to Position
          </p>
          <div
            id="viewfinder-container"
            onMouseDown={handleMouseDown}
            className="relative aspect-[3/4] w-full bg-slate-100 rounded-[2rem] overflow-hidden cursor-move border border-slate-200 shadow-inner group"
          >
            <img
              src={imageSrc}
              alt="Framer"
              className="w-full h-full object-contain select-none pointer-events-none"
              style={{
                transform: `
                  scale(${zoom}) 
                  translate(${(offset.x - 50) / zoom}%, ${(offset.y - 50) / zoom}%)
                `,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            />
            {/* Guide Overlay */}
            <div
              className={`absolute inset-0 pointer-events-none border border-white/20 flex items-center justify-center transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <div className="w-8 h-[1px] bg-white/40" />
              <div className="h-8 w-[1px] bg-white/40 absolute" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Slider
            label="Zoom Level"
            min={1}
            max={4}
            value={zoom}
            onChange={setZoom}
            suffix="x"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() =>
                onSave({
                  path: initialFrame?.path || '', // Keep existing path or fallback
                  zoom,
                  offset_x: offset.x,
                  offset_y: offset.y,
                })
              }
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
