import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Button from '../shared/Button';
import { LibraryIcon } from '../shared/Icons';
import AppHeader from './AppHeader';
import { Project } from '../../types/project';
import { ChevronDown } from 'lucide-react';

interface TopNavProps {
  onExit: () => void;
  project: Project;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBookSwitch: (book: any) => void;
}

export default function TopNav({
  onExit,
  project,
  activeTab,
  onTabChange,
  onBookSwitch,
}: TopNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [books, setBooks] = useState<any[]>([]);

  const menus = [
    'Write',
    'Revisions',
    'Plot',
    'Characters',
    'Worldbuilding',
    'Research',
    'Braindump',
  ];

  // Fetch books only when the dropdown is opened
  useEffect(() => {
    if (isOpen && project.type === 'series') {
      invoke('get_project_books', { projectId: project.id })
        .then((res: any) => setBooks(res))
        .catch(console.error);
    }
  }, [isOpen, project.id, project.type]);

  const romanize = (num: number) => {
    if (!num || num < 1) return 'I';
    const lookup: { [key: string]: number } = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };
    let roman = '';
    let n = num;
    for (let i in lookup) {
      while (n >= lookup[i]) {
        roman += i;
        n -= lookup[i];
      }
    }
    return roman;
  };

  return (
    <nav className="flex flex-col shrink-0 font-sans z-30">
      <AppHeader subtitle="Your Creative Writing Studio">
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
          <span className="text-purple-300 text-3xl italic font-serif opacity-30 translate-y-1 select-none">
            ~
          </span>

          <div className="relative">
            <button
              onClick={() => project.type === 'series' && setIsOpen(!isOpen)}
              className={`flex flex-col items-center group transition-all py-1 px-4 rounded-xl relative 
              ${project.type === 'series' ? 'cursor-pointer' : 'cursor-default'}
              ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50/80'} 
            `}
            >
              {/* TOP ROW: Metadata */}
              <div className="flex items-center gap-2 mb-1 min-h-[14px]">
                {project.type === 'series' ? (
                  <>
                    <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-purple-500/80">
                      Volume {romanize(project.volumeNumber || 1)}
                    </span>
                    <span className="text-[8px] text-slate-300 opacity-50">
                      •
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400">
                      {project.seriesName}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-3 h-3 text-slate-300 transition-transform ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
                    />
                  </>
                ) : (
                  <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400">
                    Standalone Novel
                  </span>
                )}
              </div>

              {/* INTERACTIVE HOVER/ACTIVE LINE */}
              {project.type === 'series' && (
                <div
                  className={`h-[1px] transition-all duration-300 ease-out mb-1 bg-purple-200
                  ${isOpen ? 'w-full bg-purple-400' : 'w-0 group-hover:w-1/2'}
                `}
                  aria-hidden="true"
                />
              )}

              {/* BOTTOM ROW: The Book Title */}
              <h2
                className={`text-2xl font-serif font-medium tracking-tight leading-none transition-colors
                  ${isOpen ? 'text-[#9333ea]' : 'text-slate-800'}
                `}
              >
                {project.name || 'Untitled Story'}
              </h2>
            </button>

            {/* DROPDOWN MENU */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white border border-slate-200 shadow-2xl rounded-[2rem] p-3 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-slate-50 mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                      Switch Volume
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                    {books.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          onBookSwitch({
                            ...book,
                            orderIndex: book.order_index ?? book.orderIndex,
                          });
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col cursor-pointer ${
                          book.title === project.name
                            ? 'bg-purple-50 text-purple-700'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase opacity-60">
                          Volume{' '}
                          {(book.order_index ?? book.orderIndex ?? 0) + 1}
                        </span>
                        <span className="text-sm font-semibold">
                          {book.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="text-purple-300 text-3xl italic font-serif opacity-30 translate-y-1 select-none">
            ~
          </span>
        </div>

        <Button
          variant="outline"
          onClick={onExit}
          className="h-9 px-4 shrink-0 shadow-sm border-slate-200"
          icon={<LibraryIcon className="w-4 h-4" />}
        >
          Library
        </Button>
      </AppHeader>

      <div className="flex gap-1 px-6 py-2 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
        {menus.map((m) => (
          <button
            key={m}
            onClick={() => onTabChange(m)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              m === activeTab
                ? 'bg-purple-50 text-purple-700 shadow-[inset_0_0_0_1px_rgba(147,51,234,0.1)]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </nav>
  );
}
