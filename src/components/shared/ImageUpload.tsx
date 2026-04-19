import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Plus, Trash2 } from 'lucide-react';

interface ImageUploadProps {
  currentPath?: string | null;
  collection: 'projects' | 'characters';
  entityId: string;
  onUploadSuccess: (newPath: string) => void;
  label?: string;
}

export const ImageUpload = ({
  currentPath,
  collection,
  entityId,
  onUploadSuccess,
  label = 'Upload Image',
}: ImageUploadProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Update preview whenever the path from the DB changes
  useEffect(() => {
    if (currentPath) {
      // Logic to resolve the full path from AppData + relative path
      resolveFullUrl(currentPath);
    } else {
      setPreviewUrl(null);
    }
  }, [currentPath]);

  const resolveFullUrl = async (relative: string) => {
    const appData = await appDataDir();
    const fullPath = await join(appData, 'assets', relative);
    const assetUrl = convertFileSrc(fullPath);
    setPreviewUrl(`${assetUrl}?t=${Date.now()}`);
  };

  const handleSelectImage = async () => {
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
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
      )}

      <div className="relative group">
        <button
          type="button"
          onClick={handleSelectImage}
          aria-label={
            previewUrl ? 'Change project cover' : 'Upload project cover'
          }
          className={`
            relative w-full h-40 rounded-2xl transition-all outline-none overflow-hidden
            flex flex-col items-center justify-center border-2 border-dashed cursor-pointer
            ${
              previewUrl
                ? 'border-transparent bg-slate-400'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
            }
            focus-visible:ring-2 focus-visible:ring-[#9333ea] focus-visible:ring-offset-2
          `}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Project cover preview"
                style={{ imageRendering: 'auto' }}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity img-optimize"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div
                  className="
                        inline-flex items-center justify-center whitespace-nowrap 
                        text-xs font-bold transition-all h-8 rounded-lg px-4 gap-2 
                        bg-[#9333ea] text-white shadow-lg
                        transform translate-y-2 group-hover:translate-y-0
                    "
                >
                  Change Image
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-[#9333ea] transition-colors">
                <Plus size={20} />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                Click to browse
              </p>
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
            title="Remove image"
            className="absolute top-2 right-2 p-2 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 hover:scale-110 transition-all border border-red-100 z-20 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
