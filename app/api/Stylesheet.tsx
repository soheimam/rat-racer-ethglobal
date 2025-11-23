import React, { useState } from 'react';

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
  XLS: '#a0aec0',
  GIF: '#718096',
  PDF: '#4a5568',
  DOC: '#cbd5e0',
  CSV: '#a0aec0',
};

const mockData: FileRow[] = [
  {
    id: 1,
    label: 'RACE DATA',
    subdescription: '// system.record',
    filename: 'race_results.docx',
    filesize: '1.2mb',
    filetype: { type: 'XLS', color: fileTypeColors.XLS },
    userCount: 12,
    avatars: ['1', '2', '3'],
  },
  {
    id: 2,
    label: 'TRACK INFO',
    subdescription: '// circuit.data',
    filename: 'track_layout.gif',
    filesize: '1.2mb',
    filetype: { type: 'GIF', color: fileTypeColors.GIF },
    userCount: 12,
    avatars: ['1', '2', '3'],
  },
  {
    id: 3,
    label: 'RAT STATS',
    subdescription: '// racer.profile',
    filename: 'statistics.pdf',
    filesize: '1.2mb',
    filetype: { type: 'PDF', color: fileTypeColors.PDF },
    userCount: 12,
    avatars: ['1', '2', '3'],
  },
  {
    id: 4,
    label: 'ENTRY LOG',
    subdescription: '// participant.list',
    filename: 'entries.docx',
    filesize: '1.2mb',
    filetype: { type: 'DOC', color: fileTypeColors.DOC },
    userCount: 12,
    avatars: ['1', '2', '3'],
  },
  {
    id: 5,
    label: 'PRIZE DATA',
    subdescription: '// rewards.config',
    filename: 'prize_pool.csv',
    filesize: '1.2mb',
    filetype: { type: 'CSV', color: fileTypeColors.CSV },
    userCount: 12,
    avatars: ['1', '2', '3'],
  },
];

export default function StyleSheet() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-700 rounded-full filter blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600 rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
      </div>

      {/* Scanlines Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-6xl font-black tracking-tighter mb-2 glitch"
            data-text="[ FILE SYSTEM ]"
            style={{
              textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
              fontFamily: 'monospace',
              color: '#cbd5e0'
            }}
          >
            [ FILE SYSTEM ]
          </h1>
          <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>
            {'// RACE ARCHIVES // DATA RECORDS'}
          </p>
        </div>

        {/* Table Container */}
        <div
          className="border-4 overflow-hidden"
          style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-8 py-5 border-b-2"
            style={{ borderColor: '#4a5568' }}
          >
            <div className="w-10"></div>
            <button className="flex items-center gap-2 text-xs font-mono font-black tracking-wider hover:text-white transition-colors justify-start" style={{ color: '#718096' }}>
              [ RECORD ]
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 text-xs font-mono font-black tracking-wider hover:text-white transition-colors justify-start" style={{ color: '#718096' }}>
              [ FILE DATA ]
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center gap-2 text-xs font-mono font-black tracking-wider hover:text-white transition-colors justify-start" style={{ color: '#718096' }}>
              [ ACCESS ]
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
              className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-4 px-8 py-6 transition-all duration-300 ${
                index !== mockData.length - 1 ? 'border-b-2' : ''
              }`}
              style={{
                borderColor: '#4a5568',
                background: hoveredRow === row.id ? 'linear-gradient(to right, #1a202c, #000000)' : 'transparent',
                boxShadow: hoveredRow === row.id ? '0 0 25px rgba(74,85,104,0.3)' : 'none'
              }}
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Checkbox + Avatar */}
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  className="w-5 h-5 bg-black border-2 cursor-pointer"
                  style={{ borderColor: '#4a5568' }}
                />
                <div
                  className="w-12 h-12 flex items-center justify-center overflow-hidden flex-shrink-0 border-2"
                  style={{
                    background: 'linear-gradient(to bottom right, #2d3748, #1a202c)',
                    borderColor: '#4a5568'
                  }}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}`}
                  alt="Avatar"
                  className="w-full h-full object-cover opacity-80"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                </div>
              </div>

              {/* Label */}
              <div className="flex flex-col justify-center">
                <p className="font-mono font-black text-sm tracking-wider" style={{ color: '#cbd5e0' }}>
                  {row.label}
                </p>
                <p className="font-mono text-xs" style={{ color: '#718096' }}>
                  {row.subdescription}
                </p>
              </div>

              {/* File Info */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-12 h-14 border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: '#2d3748',
                      borderColor: '#4a5568'
                    }}
                  >
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#718096' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] font-black border"
                    style={{
                      backgroundColor: '#2d3748',
                      borderColor: row.filetype.color,
                      color: '#e2e8f0',
                      boxShadow: `0 0 10px ${row.filetype.color}40`
                    }}
                  >
                    {row.filetype.type}
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="font-mono font-bold text-sm" style={{ color: '#e2e8f0' }}>
                    {row.filename}
                  </p>
                  <p className="font-mono text-xs" style={{ color: '#718096' }}>
                    {row.filesize}
                  </p>
                </div>
              </div>

              {/* User Count + Avatars */}
              <div className="flex items-center gap-4">
                <p className="font-mono text-xs font-black tracking-wider" style={{ color: '#a0aec0' }}>
                  {row.userCount} USERS
                </p>
                <div className="flex items-center -space-x-2">
                  {row.avatars.map((avatar, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 border-2 flex items-center justify-center overflow-hidden"
                      style={{
                        background: 'linear-gradient(to bottom right, #4a5568, #2d3748)',
                        borderColor: '#000000'
                      }}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id}-${idx}`}
                        alt="User avatar"
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ))}
                  <div
                    className="w-8 h-8 border-2 flex items-center justify-center text-xs font-black"
                    style={{
                      backgroundColor: '#2d3748',
                      borderColor: '#000000',
                      color: '#e2e8f0'
                    }}
                  >
                    +4
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  className="p-2 transition-all duration-300 border-2"
                  style={{
                    borderColor: hoveredRow === row.id ? '#4a5568' : 'transparent',
                    backgroundColor: hoveredRow === row.id ? '#2d3748' : 'transparent'
                  }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#718096' }}>
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                <button className="p-2 group transition-all duration-300 border-2 border-transparent hover:border-red-900/50 hover:bg-red-900/20">
                  <svg
                    className="w-5 h-5 group-hover:text-red-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: '#718096' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="mt-6 flex justify-between items-center font-mono text-xs" style={{ color: '#718096' }}>
          <span>{'// '}{mockData.length} RECORDS FOUND</span>
          <span>{'// SYSTEM STATUS: OPERATIONAL'}</span>
        </div>

        {/* Button Showcase */}
        <div className="mt-16 space-y-12">
          {/* Section Header */}
          <div>
            <h2
              className="text-4xl font-black tracking-tighter mb-2 glitch"
              data-text="[ BUTTON SYSTEM ]"
              style={{
                textShadow: '0 0 20px rgba(160,174,192,0.3)',
                fontFamily: 'monospace',
                color: '#cbd5e0'
              }}
            >
              [ BUTTON SYSTEM ]
            </h2>
            <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>
              {'// INTERACTIVE COMPONENTS // UI ELEMENTS'}
            </p>
          </div>

          {/* Primary Buttons */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black font-mono tracking-wider" style={{ color: '#a0aec0' }}>
              PRIMARY ACTIONS
            </h3>
            <div className="flex flex-wrap gap-6">
              {/* Gradient Border Button - Light to Dark */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)',
                  color: '#cbd5e0',
                  animation: 'subtle-glow 3s ease-in-out infinite'
                }}
              >
                <div
                  className="absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(to bottom, #e2e8f0, #718096)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  EXECUTE
                </span>
              </button>

              {/* Solid Primary */}
              <button
                className="px-8 py-4 font-mono font-black tracking-wider border transition-all duration-300 hover:shadow-[0_0_30px_rgba(74,85,104,0.5)] hover:scale-[1.02]"
                style={{
                  backgroundColor: '#2d3748',
                  borderColor: '#4a5568',
                  color: '#e2e8f0',
                  animation: 'subtle-pulse 4s ease-in-out infinite'
                }}
              >
                CREATE RACE
              </button>

              {/* Gradient Border Animated */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: '#000000',
                  color: '#cbd5e0'
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, #cbd5e0 0%, #718096 50%, #4a5568 100%)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  DEPLOY
                </span>
              </button>
            </div>
          </div>

          {/* Secondary/Outline Buttons */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black font-mono tracking-wider" style={{ color: '#a0aec0' }}>
              SECONDARY ACTIONS
            </h3>
            <div className="flex flex-wrap gap-6">
              {/* Classic Outline with Gradient */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group bg-black hover:scale-[1.02]"
                style={{ 
                  color: '#a0aec0',
                  animation: 'subtle-glow 4s ease-in-out infinite'
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, #cbd5e0, #4a5568)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  CONNECT WALLET
                </span>
              </button>

              {/* Subtle Outline */}
              <button
                className="px-8 py-4 font-mono font-black tracking-wider border transition-all duration-300 hover:border-[#718096] bg-transparent hover:scale-[1.02]"
                style={{
                  borderColor: '#4a5568',
                  color: '#a0aec0',
                  animation: 'subtle-pulse 5s ease-in-out infinite'
                }}
              >
                MINT RAT
              </button>

              {/* Gradient Top-Bottom Border */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(to bottom, rgba(45,55,72,0.3), #000000)',
                  color: '#cbd5e0'
                }}
              >
                <div
                  className="absolute inset-0 group-hover:opacity-100 opacity-70 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(180deg, #e2e8f0 0%, #2d3748 100%)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  ENTER RACE
                </span>
              </button>
            </div>
          </div>

          {/* Icon Buttons */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black font-mono tracking-wider" style={{ color: '#a0aec0' }}>
              ICON ACTIONS
            </h3>
            <div className="flex flex-wrap gap-6 items-center">
              {/* Square Icon with Gradient Border */}
              <button
                className="relative p-4 transition-all duration-300 overflow-hidden group hover:scale-110"
                style={{ 
                  background: '#000000',
                  animation: 'subtle-glow 3s ease-in-out infinite'
                }}
              >
                <div
                  className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #cbd5e0, #4a5568)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <svg className="w-6 h-6 relative z-10 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#a0aec0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>

              {/* Circle Icon with Gradient */}
              <button
                className="relative p-4 transition-all duration-300 overflow-hidden group rounded-full hover:scale-110"
                style={{ 
                  background: '#000000',
                  animation: 'subtle-pulse 4s ease-in-out infinite'
                }}
              >
                <div
                  className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
                  style={{
                    background: 'linear-gradient(to bottom right, #cbd5e0, #2d3748)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <svg className="w-6 h-6 relative z-10 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#a0aec0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Delete/Danger Button */}
              <button
                className="relative p-4 transition-all duration-300 overflow-hidden group hover:scale-110"
                style={{ background: '#000000' }}
              >
                <div
                  className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(to bottom, #ef4444, #7f1d1d)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <svg className="w-6 h-6 relative z-10 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#718096' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Large Call-to-Action */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black font-mono tracking-wider" style={{ color: '#a0aec0' }}>
              HERO ACTIONS
            </h3>
            <div className="flex justify-center py-8">
              <button
                className="relative px-16 py-6 font-mono font-black text-2xl tracking-wider transition-all duration-500 overflow-hidden group hover:scale-105"
                style={{
                  background: 'linear-gradient(to bottom right, #2d3748, #000000)',
                  color: '#cbd5e0'
                }}
              >
                {/* Animated gradient border */}
                <div
                  className="absolute inset-0 opacity-100"
                  style={{
                    background: 'linear-gradient(45deg, #cbd5e0 0%, #718096 25%, #4a5568 50%, #718096 75%, #cbd5e0 100%)',
                    backgroundSize: '200% 200%',
                    padding: '1.5px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    animation: 'gradient-shift 3s ease infinite'
                  }}
                />
                {/* Shine effect on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                    transform: 'translateX(-100%)',
                  }}
                />
                <span className="relative z-10 flex items-center gap-4 group-hover:text-white transition-colors duration-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  START RACE
                </span>
              </button>
            </div>
          </div>

          {/* Button States */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black font-mono tracking-wider" style={{ color: '#a0aec0' }}>
              BUTTON STATES
            </h3>
            <div className="flex flex-wrap gap-6">
              {/* Loading State */}
              <button
                className="px-8 py-4 font-mono font-black tracking-wider border transition-all duration-300 cursor-not-allowed opacity-70"
                style={{
                  backgroundColor: '#2d3748',
                  borderColor: '#4a5568',
                  color: '#718096'
                }}
                disabled
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096' }}></div>
                  PROCESSING
                </div>
              </button>

              {/* Disabled State */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider cursor-not-allowed opacity-50"
                style={{
                  background: '#000000',
                  color: '#4a5568'
                }}
                disabled
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, #4a5568, #2d3748)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10">DISABLED</span>
              </button>

              {/* Success State */}
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(to right, rgba(16,185,129,0.1), #000000)',
                  color: '#10b981',
                  animation: 'subtle-glow 2s ease-in-out infinite'
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, #34d399, #059669)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  COMPLETED
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes gradient-shift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }

          @keyframes subtle-glow {
            0%, 100% {
              box-shadow: 0 0 5px rgba(74, 85, 104, 0.2);
            }
            50% {
              box-shadow: 0 0 15px rgba(74, 85, 104, 0.4);
            }
          }

          @keyframes subtle-pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.9;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
