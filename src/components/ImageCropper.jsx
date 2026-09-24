"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, RotateCcw } from 'lucide-react';

const MIN_SIZE = 24;
const FULL = { x: 0, y: 0, w: 1, h: 1 };
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const ASPECTS = [
  { label: 'Free', value: null },
  { label: 'Original', value: 'original' },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function fitAspect(rect, ratio, W, H) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let w = W;
  let h = W / ratio;
  if (h > H) { h = H; w = H * ratio; }
  return { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w, h };
}

function resizeRect(start, handle, dx, dy, W, H, ratio) {
  const hasN = handle.includes('n');
  const hasS = handle.includes('s');
  const hasW = handle.includes('w');
  const hasE = handle.includes('e');

  if (!ratio) {
    let left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h;
    if (hasW) left = clamp(left + dx, 0, right - MIN_SIZE);
    if (hasE) right = clamp(right + dx, left + MIN_SIZE, W);
    if (hasN) top = clamp(top + dy, 0, bottom - MIN_SIZE);
    if (hasS) bottom = clamp(bottom + dy, top + MIN_SIZE, H);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }

  const cx = start.x + start.w / 2;
  const cy = start.y + start.h / 2;
  const maxW = hasE ? W - start.x : hasW ? start.x + start.w : 2 * Math.min(cx, W - cx);
  const maxH = hasS ? H - start.y : hasN ? start.y + start.h : 2 * Math.min(cy, H - cy);
  const dw = hasE ? dx : hasW ? -dx : 0;
  const dh = hasS ? dy : hasN ? -dy : 0;

  let w;
  if ((hasE || hasW) && (hasN || hasS)) w = Math.max(start.w + dw, (start.h + dh) * ratio);
  else if (hasE || hasW) w = start.w + dw;
  else w = (start.h + dh) * ratio;
  w = Math.min(Math.max(w, MIN_SIZE, MIN_SIZE * ratio), maxW, maxH * ratio);
  const h = w / ratio;

  return {
    x: hasE ? start.x : hasW ? start.x + start.w - w : cx - w / 2,
    y: hasS ? start.y : hasN ? start.y + start.h - h : cy - h / 2,
    w,
    h,
  };
}

function drawRect(ax, ay, px, py, W, H, ratio) {
  const dx = px - ax;
  const dy = py - ay;
  let w = Math.abs(dx);
  let h = Math.abs(dy);
  if (ratio) {
    const maxW = dx >= 0 ? W - ax : ax;
    const maxH = dy >= 0 ? H - ay : ay;
    w = Math.min(Math.max(w, h * ratio), maxW, maxH * ratio);
    h = w / ratio;
  }
  return { x: dx >= 0 ? ax : ax - w, y: dy >= 0 ? ay : ay - h, w, h };
}

export default function ImageCropper({ src, busy, onCancel, onApply }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [stage, setStage] = useState(null);
  const [crop, setCrop] = useState(FULL);
  const [aspect, setAspect] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, []);

  const scale = natural && stage ? Math.max(0, Math.min(stage.w / natural.w, stage.h / natural.h)) : 0;
  const W = natural ? natural.w * scale : 0;
  const H = natural ? natural.h * scale : 0;
  const ratio = aspect === 'original' ? (natural ? natural.w / natural.h : null) : aspect;
  const rect = { x: crop.x * W, y: crop.y * H, w: crop.w * W, h: crop.h * H };
  const toFraction = r => ({ x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H });

  const apply = () => {
    if (busy || !natural) return;
    const x = clamp(crop.x, 0, 1);
    const y = clamp(crop.y, 0, 1);
    onApply({ x, y, width: Math.min(crop.w, 1 - x), height: Math.min(crop.h, 1 - y) });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !busy) { e.preventDefault(); onCancel(); }
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); apply(); }
  };

  const chooseAspect = (value) => {
    setAspect(value);
    const r = value === 'original' ? natural.w / natural.h : value;
    if (r && W) setCrop(toFraction(fitAspect(rect, r, W, H)));
  };

  const reset = () => {
    setAspect(null);
    setCrop(FULL);
  };

  const beginDrag = (e, mode, handle) => {
    if (busy || !W || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    rootRef.current?.focus();

    const box = canvasRef.current.getBoundingClientRect();
    const start = { ...rect };
    const originX = e.clientX;
    const originY = e.clientY;
    const anchorX = clamp(originX - box.left, 0, W);
    const anchorY = clamp(originY - box.top, 0, H);

    const move = (ev) => {
      const dx = ev.clientX - originX;
      const dy = ev.clientY - originY;
      let next;
      if (mode === 'move') {
        next = { ...start, x: clamp(start.x + dx, 0, W - start.w), y: clamp(start.y + dy, 0, H - start.h) };
      } else if (mode === 'resize') {
        next = resizeRect(start, handle, dx, dy, W, H, ratio);
      } else {
        next = drawRect(anchorX, anchorY, clamp(ev.clientX - box.left, 0, W), clamp(ev.clientY - box.top, 0, H), W, H, ratio);
        if (next.w < MIN_SIZE || next.h < MIN_SIZE) next = start;
      }
      setCrop(toFraction(next));
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return createPortal(
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Crop image" tabIndex={-1} ref={rootRef} onKeyDown={handleKeyDown}>
      <style>{`
        .cropper { position: fixed; inset: 0; z-index: 9000; background: #fff; display: flex; flex-direction: column; font-family: var(--font-sans); color: var(--ink); outline: none; }
        .cropper-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
        .cropper-title { font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); }
        .cropper-aspects { display: flex; flex-wrap: wrap; }
        .cropper-aspect { padding: 0.35rem 0.7rem; margin-left: -1px; border: 1px solid var(--border); background: #fff; color: var(--ink-muted); font-size: 12px; font-weight: 700; }
        .cropper-aspect:first-child { margin-left: 0; }
        .cropper-aspect:hover:not(:disabled) { color: var(--primary); }
        .cropper-aspect.is-active { position: relative; background: var(--primary); border-color: var(--primary); color: #fff; }
        .cropper-aspect.is-active:hover:not(:disabled) { color: #fff; }
        .cropper-reset { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0; color: var(--ink-muted); font-size: 12px; font-weight: 700; }
        .cropper-reset:hover:not(:disabled) { color: var(--primary); }
        .cropper-size { color: var(--ink-subtle); font-size: 12px; font-variant-numeric: tabular-nums; }
        .cropper-actions { display: flex; gap: 0.5rem; margin-left: auto; }
        .cropper-actions .btn { padding: 0.5rem 1rem; font-size: 0.85rem; }
        .cropper button:disabled { opacity: 0.5; cursor: not-allowed; }
        .cropper-stage { flex: 1; min-height: 0; padding: 1.5rem; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .cropper-canvas { position: relative; flex-shrink: 0; outline: 1px solid var(--rule); touch-action: none; user-select: none; cursor: crosshair; }
        .cropper-canvas img { display: block; width: 100%; height: 100%; pointer-events: none; }
        .cropper-scrim { position: absolute; background: rgba(10, 20, 40, 0.55); pointer-events: none; }
        .cropper-frame { position: absolute; border: 1px solid #fff; cursor: move; }
        .cropper-grid-v, .cropper-grid-h { position: absolute; border: 0 solid rgba(255, 255, 255, 0.6); pointer-events: none; }
        .cropper-grid-v { top: 0; bottom: 0; left: 33.333%; right: 33.333%; border-left-width: 1px; border-right-width: 1px; }
        .cropper-grid-h { left: 0; right: 0; top: 33.333%; bottom: 33.333%; border-top-width: 1px; border-bottom-width: 1px; }
        .cropper-handle { --size: 12px; --offset: calc(var(--size) / -2 - 0.5px); position: absolute; width: var(--size); height: var(--size); background: #fff; border: 1px solid var(--primary); }
        .cropper-handle:hover { background: var(--accent-yellow); }
        .cropper-handle-nw { left: var(--offset); top: var(--offset); cursor: nwse-resize; }
        .cropper-handle-n { left: calc(50% - var(--size) / 2); top: var(--offset); cursor: ns-resize; }
        .cropper-handle-ne { right: var(--offset); top: var(--offset); cursor: nesw-resize; }
        .cropper-handle-e { right: var(--offset); top: calc(50% - var(--size) / 2); cursor: ew-resize; }
        .cropper-handle-se { right: var(--offset); bottom: var(--offset); cursor: nwse-resize; }
        .cropper-handle-s { left: calc(50% - var(--size) / 2); bottom: var(--offset); cursor: ns-resize; }
        .cropper-handle-sw { left: var(--offset); bottom: var(--offset); cursor: nesw-resize; }
        .cropper-handle-w { left: var(--offset); top: calc(50% - var(--size) / 2); cursor: ew-resize; }
        .cropper-error { color: var(--ink-subtle); font-size: 0.9rem; }
        @media (pointer: coarse) { .cropper-handle { --size: 22px; } }
      `}</style>

      <div className="cropper-bar">
        <span className="cropper-title">Crop image</span>
        <div className="cropper-aspects" role="group" aria-label="Aspect ratio">
          {ASPECTS.map(option => (
            <button
              key={option.label}
              type="button"
              className={aspect === option.value ? 'cropper-aspect is-active' : 'cropper-aspect'}
              aria-pressed={aspect === option.value}
              onClick={() => chooseAspect(option.value)}
              disabled={busy || !natural}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="cropper-reset" onClick={reset} disabled={busy || !natural}>
          <RotateCcw size={13} /> Reset
        </button>
        {natural && (
          <span className="cropper-size">
            {Math.round(crop.w * natural.w)} × {Math.round(crop.h * natural.h)} px
          </span>
        )}
        <div className="cropper-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={apply} disabled={busy || !natural}>
            {busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            {busy ? 'Cropping…' : 'Apply crop'}
          </button>
        </div>
      </div>

      <div className="cropper-stage" ref={stageRef}>
        {failed ? (
          <p className="cropper-error">This image could not be loaded.</p>
        ) : (
          <div
            className="cropper-canvas"
            ref={canvasRef}
            style={{ width: W, height: H }}
            onPointerDown={e => beginDrag(e, 'draw')}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setFailed(true)}
            />
            {W > 0 && (
              <>
                <div className="cropper-scrim" style={{ left: 0, top: 0, width: W, height: rect.y }} />
                <div className="cropper-scrim" style={{ left: 0, top: rect.y + rect.h, width: W, height: H - rect.y - rect.h }} />
                <div className="cropper-scrim" style={{ left: 0, top: rect.y, width: rect.x, height: rect.h }} />
                <div className="cropper-scrim" style={{ left: rect.x + rect.w, top: rect.y, width: W - rect.x - rect.w, height: rect.h }} />
                <div
                  className="cropper-frame"
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                  onPointerDown={e => beginDrag(e, 'move')}
                >
                  <span className="cropper-grid-v" />
                  <span className="cropper-grid-h" />
                  {HANDLES.map(handle => (
                    <span
                      key={handle}
                      className={`cropper-handle cropper-handle-${handle}`}
                      onPointerDown={e => beginDrag(e, 'resize', handle)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
