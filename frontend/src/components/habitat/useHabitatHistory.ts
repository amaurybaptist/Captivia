'use client';
import { useCallback, useState } from 'react';
import type { HabitatSnapshot } from '@/lib/habitat/workspace';
export function useHabitatHistory(initial: HabitatSnapshot) {
  const [state, setState] = useState<{
    past: HabitatSnapshot[];
    present: HabitatSnapshot;
    future: HabitatSnapshot[];
  }>({ past: [], present: initial, future: [] });
  const commit = useCallback(
    (next: HabitatSnapshot | ((previous: HabitatSnapshot) => HabitatSnapshot)) => {
      setState((previous) => {
        const value = typeof next === 'function' ? next(previous.present) : next;
        return JSON.stringify(value) === JSON.stringify(previous.present)
          ? previous
          : { past: [...previous.past.slice(-49), previous.present], present: value, future: [] };
      });
    },
    []
  );
  const reset = useCallback(
    (next: HabitatSnapshot) => setState({ past: [], present: next, future: [] }),
    []
  );
  const undo = useCallback(
    () =>
      setState((s) =>
        s.past.length
          ? {
              past: s.past.slice(0, -1),
              present: s.past[s.past.length - 1],
              future: [s.present, ...s.future].slice(0, 50),
            }
          : s
      ),
    []
  );
  const redo = useCallback(
    () =>
      setState((s) =>
        s.future.length
          ? {
              past: [...s.past, s.present].slice(-50),
              present: s.future[0],
              future: s.future.slice(1),
            }
          : s
      ),
    []
  );
  return {
    snapshot: state.present,
    commit,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoTarget: state.past[state.past.length - 1],
    redoTarget: state.future[0],
  };
}
