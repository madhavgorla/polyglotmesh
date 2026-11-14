import React from 'react';
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

interface PlaybackBarProps {
  currentIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  compact?: boolean;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentIndex,
  totalSteps,
  isPlaying,
  onTogglePlay,
  onFirst,
  onPrev,
  onNext,
  onLast,
  compact = false
}) => {
  const btnBase =
    'inline-flex items-center justify-center rounded-md border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  const sizeCls = compact ? 'w-8 h-8' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-1.5 select-none">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
        title={isPlaying ? 'Pause' : 'Play'}
        className={`${sizeCls} ${btnBase} ${
          isPlaying ? 'border-emerald-500/60 text-emerald-400 bg-emerald-950/30' : ''
        }`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <button
        type="button"
        onClick={onFirst}
        disabled={currentIndex === 0}
        aria-label="Reset to first step"
        title="Reset"
        className={`${sizeCls} ${btnBase}`}
      >
        <SkipBack className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onPrev}
        disabled={currentIndex === 0}
        aria-label="Previous step"
        title="Previous"
        className={`${sizeCls} ${btnBase}`}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <span className="px-2.5 text-xs font-mono tabular-nums text-neutral-300 whitespace-nowrap min-w-[56px] text-center">
        {currentIndex + 1} / {totalSteps}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={currentIndex >= totalSteps - 1}
        aria-label="Next step"
        title="Next"
        className={`${sizeCls} ${btnBase}`}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onLast}
        disabled={currentIndex >= totalSteps - 1}
        aria-label="Jump to last step"
        title="End"
        className={`${sizeCls} ${btnBase}`}
      >
        <SkipForward className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
