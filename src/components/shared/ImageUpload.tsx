import { useState, useEffect, useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Plus, Trash2, Move } from 'lucide-react';
import { PortraitFrame } from '../../types/character';

interface ImageUploadProps {
  currentPath?: string | null;
  collection: 'projects' | 'characters';
  entityId: string;
  onUploadSuccess: (newPath: string) => void;
  onReposition?: () => void;
  framing?: PortraitFrame;
  label?: string;
  variant?: 'square' | 'portrait';
  version: number;
}

export const ImageUpload = ({
  currentPath,
  collection,
  entityId,
  onUploadSuccess,
  onReposition,
  framing,
  label = 'Upload Image',
  variant = 'square',
  version,
}: ImageUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resolveFullUrl = useCallback(async (path: string, v: number) => {
    try {
      const appData = await appDataDir();
      const fullPath = await join(appData, 'assets', path);
      const assetUrl = convertFileSrc(fullPath);
      setPreviewUrl(`${assetUrl}?v=${v}`);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (currentPath) {
      resolveFullUrl(currentPath, version);
    } else {
      setPreviewUrl(null);
    }
  }, [currentPath, version, resolveFullUrl]);

  const handleSelectImage = async () => {
    if (!entityId) return;

    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
        ],
      });

      if (selected) {
        setIsUploading(true);

        // 'selected' might be a string or an object with a 'path'
        const filePath =
          typeof selected === 'string' ? selected : (selected as any).path;

        const savedRelativePath: string = await invoke('save_media_file', {
          sourcePath: filePath,
          entityId: entityId,
          collection: collection,
        });

        onUploadSuccess(savedRelativePath);

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-center">
      <div
        className={`relative group ${variant === 'portrait' ? 'w-32' : 'w-full'}`}
      >
        <button
          type="button"
          onClick={handleSelectImage}
          aria-label={previewUrl ? 'Change image' : 'Upload image'}
          className={`
            relative w-full transition-all outline-none overflow-hidden
            flex flex-col items-center justify-center border-2 border-dashed cursor-pointer
            ${
              variant === 'portrait'
                ? 'aspect-[3/4] rounded-xl' // Character Portrait Shape
                : 'h-40 rounded-2xl' // Project Cover Shape
            }
            ${previewUrl ? 'border-transparent bg-purple-300 hover:bg-purple-400' : 'border-slate-200 bg-slate-50'}
            focus-visible:ring-2 focus-visible:ring-[#9333ea]
          `}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  objectPosition: `${framing?.offset_x ?? 50}% ${framing?.offset_y ?? 50}%`,
                  transform: `scale(${framing?.zoom || 1})`,
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity img-optimize"
              />

              {/* HOVER OVERLAY */}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <button
                  type="button"
                  onClick={handleSelectImage}
                  className="w-full py-1.5 bg-white text-slate-800 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg hover:bg-purple-50 transition-colors"
                >
                  Change
                </button>

                {onReposition && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReposition();
                    }}
                    className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Move size={10} />
                    Position
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-[#9333ea] transition-colors">
                <Plus size={18} />
              </div>
              {label && !previewUrl && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  {label}
                </span>
              )}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#9333ea] border-t-transparent"></div>
            </div>
          )}
        </button>

        {/* Trash Button */}
        {previewUrl && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUploadSuccess('');
            }}
            className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full shadow-lg 
            border border-slate-100 transition-all z-20 cursor-pointer
            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
            hover:bg-red-50 hover:scale-110 focus:ring-2 focus:ring-red-500 outline-none"
            aria-label="Remove image"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
