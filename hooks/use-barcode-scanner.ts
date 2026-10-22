'use client';

import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxScanTime?: number;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minScanTimeMs,
  minLength = 3,
  maxScanTimeMs = 100,
}: BarcodeScannerOptions & { minScanTimeMs?: number }) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return;
        }
      }

      const now = Date.now();

      if (now - lastKeyTimeRef.current > maxScanTimeMs) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          const scanned = bufferRef.current;
          bufferRef.current = '';
          onScan(scanned);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, maxScanTimeMs + 50);
    },
    [enabled, minLength, maxScanTimeMs, onScan]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, handleKeyDown]);

  return { isEnabled: enabled };
}
