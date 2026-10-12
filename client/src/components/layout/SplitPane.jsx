import { useCallback, useRef, useState } from 'react';

const KEYBOARD_STEP = 2;

const readStoredSize = (storageKey, fallback, min, max) => {
  if (!storageKey) return fallback;
  try {
    const stored = Number(localStorage.getItem(storageKey));
    return Number.isFinite(stored) && stored >= min && stored <= max ? stored : fallback;
  } catch {
    return fallback;
  }
};

const storeSize = (storageKey, size) => {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, String(Math.round(size * 10) / 10));
  } catch {
    // Storage may be unavailable; the layout still works, it just is not remembered.
  }
};

/**
 * Two panes with a draggable divider, like LeetCode's workspace.
 * `defaultSize`, `min` and `max` are percentages of the container for the first pane.
 *
 * direction="horizontal" puts the panes side by side; "vertical" stacks them.
 */
export function SplitPane({
  direction = 'horizontal',
  defaultSize = 50,
  min = 20,
  max = 80,
  storageKey,
  label = 'Resize panels',
  className = '',
  children,
}) {
  const [first, second] = children;
  const containerRef = useRef(null);
  const [size, setSize] = useState(() => readStoredSize(storageKey, defaultSize, min, max));
  const [isDragging, setIsDragging] = useState(false);
  const isHorizontal = direction === 'horizontal';

  const clamp = useCallback((value) => Math.min(max, Math.max(min, value)), [min, max]);

  const commit = useCallback(
    (value) => {
      const next = clamp(value);
      setSize(next);
      storeSize(storageKey, next);
    },
    [clamp, storageKey]
  );

  const sizeFromPointer = (event) => {
    const rect = containerRef.current.getBoundingClientRect();
    const offset = isHorizontal ? event.clientX - rect.left : event.clientY - rect.top;
    const total = isHorizontal ? rect.width : rect.height;
    return (offset / total) * 100;
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!isDragging) return;
    setSize(clamp(sizeFromPointer(event)));
  };

  const handlePointerUp = (event) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    commit(sizeFromPointer(event));
  };

  const handleKeyDown = (event) => {
    const decrease = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const increase = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (event.key === decrease) commit(size - KEYBOARD_STEP);
    else if (event.key === increase) commit(size + KEYBOARD_STEP);
    else if (event.key === 'Home') commit(min);
    else if (event.key === 'End') commit(max);
    else return;

    event.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      className={`split-pane split-${direction}${isDragging ? ' is-dragging' : ''} ${className}`.trim()}
    >
      <div className="split-pane-first" style={{ flexBasis: `${size}%` }}>
        {first}
      </div>

      <div
        className="split-handle"
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={min}
        aria-valuemax={max}
        title="Drag to resize. Double-click to reset."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => commit(defaultSize)}
        onKeyDown={handleKeyDown}
      >
        <span className="split-handle-grip" aria-hidden="true" />
      </div>

      <div className="split-pane-second">{second}</div>
    </div>
  );
}
