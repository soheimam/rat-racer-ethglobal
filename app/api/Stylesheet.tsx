import React from 'react';

interface FileType {
  type: 'XLS' | 'GIF' | 'PDF' | 'DOC' | 'CSV';
  color: string;
}

interface FileRow {
  id: number;
  label: string;
  subdescription: string;
  filename: string;
  filesize: string;
  filetype: FileType;
  userCount: number;
  avatars: string[];
}

const fileTypeColors: Record<string, string> = {
  XLS: 'bg-emerald-500',
  GIF: 'bg-purple-500',
  PDF: 'bg-red-500',
  DOC: 'bg-blue-500',
  CSV: 'bg-teal-500',
};

const mockData: FileRow[] = [
  {
    id: 1,
    label: 'Label',
    subdescription: '@subdescription',
    filename: 'Figr system.docx',
    filesize: '1.2mb',
    filetype: { type: 'XLS', color: fileTypeColors.XLS },
    userCount: 12,
    avatars: ['🧑', '👨', '👩'],
  },
  {
    id: 2,
    label: 'Label',
    subdescription: '@subdescription',
    filename: 'Figr system.docx',
    filesize: '1.2mb',
    filetype: { type: 'GIF', color: fileTypeColors.GIF },
    userCount: 12,
    avatars: ['🧑', '👨', '👩'],
  },
  {
    id: 3,
    label: 'Label',
    subdescription: '@subdescription',
    filename: 'Figr system.docx',
    filesize: '1.2mb',
    filetype: { type: 'PDF', color: fileTypeColors.PDF },
    userCount: 12,
    avatars: ['🧑', '👨', '👩'],
  },
  {
    id: 4,
    label: 'Label',
    subdescription: '@subdescription',
    filename: 'Figr system.docx',
    filesize: '1.2mb',
    filetype: { type: 'DOC', color: fileTypeColors.DOC },
    userCount: 12,
    avatars: ['🧑', '👨', '👩'],
  },
  {
    id: 5,
    label: 'Label',
    subdescription: '@subdescription',
    filename: 'Figr system.docx',
    filesize: '1.2mb',
    filetype: { type: 'CSV', color: fileTypeColors.CSV },
    userCount: 12,
    avatars: ['🧑', '👨', '👩'],
  },
];

export default function StyleSheet() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#1a1a1a] rounded-3xl border border-white/[0.06] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-8 py-5 border-b border-white/[0.06]">
            <div className="w-10"></div>
            <button className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors justify-start">
              Table header
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors justify-start">
              Table header
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors justify-start">
              Table header
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="w-24"></div>
          </div>

          {/* Table Rows */}
          {mockData.map((row, index) => (
            <div
              key={row.id}
              className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-8 py-6 hover:bg-white/[0.02] transition-colors ${
                index !== mockData.length - 1 ? 'border-b border-white/[0.04]' : ''
              }`}
            >
              {/* Checkbox + Avatar */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded bg-[#2a2a2a] border border-white/[0.1] checked:bg-blue-500 checked:border-blue-500 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Label */}
              <div className="flex flex-col justify-center">
                <p className="text-white font-medium text-[15px]">{row.label}</p>
                <p className="text-gray-500 text-sm">{row.subdescription}</p>
              </div>

              {/* File Info */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-14 bg-[#2a2a2a] rounded-lg border border-white/[0.08] flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 ${row.filetype.color} px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg`}>
                    {row.filetype.type}
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-white text-[15px] font-medium">{row.filename}</p>
                  <p className="text-gray-500 text-sm">{row.filesize}</p>
                </div>
              </div>

              {/* User Count + Avatars */}
              <div className="flex items-center gap-4">
                <p className="text-gray-400 text-[15px]">{row.userCount} users</p>
                <div className="flex items-center -space-x-2">
                  {row.avatars.map((avatar, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-[#1a1a1a] flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}-${idx}`}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-[#1a1a1a] flex items-center justify-center text-white text-xs font-semibold">
                    +4
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
