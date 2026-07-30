// Web barcode camera — drives the rear camera with getUserMedia and decodes
// frames with the browser's native BarcodeDetector API. Chrome on Android
// supports this (EAN/UPC/Code128/39); browsers without it (iOS Safari) show a
// fallback message pointing to Search/Barcode. This is the piece expo-camera
// doesn't provide on the web.
import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../theme';

interface Props {
  active: boolean;
  onDetected: (code: string) => void;
}

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

export default function BarcodeCamera({ active, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<'camera' | 'unsupported' | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let done = false;
    setError(null);

    const hasDetector = typeof (window as any).BarcodeDetector !== 'undefined';

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => {});

        if (!hasDetector) {
          setError('unsupported');
          return;
        }
        // @ts-ignore — BarcodeDetector isn't in the TS DOM lib yet.
        const detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS });
        timer = setInterval(async () => {
          if (cancelled || done || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes && codes.length ? codes[0].rawValue : null;
            if (raw) {
              done = true;
              if (navigator.vibrate) navigator.vibrate(80);
              onDetectedRef.current(String(raw));
            }
          } catch {
            /* transient decode error — keep scanning */
          }
        }, 250);
      } catch {
        if (!cancelled) setError('camera');
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return (
    <div style={styles.box}>
      <video ref={videoRef} muted playsInline style={styles.video} />
      <div style={styles.reticle} />
      {error === 'unsupported' && (
        <div style={styles.overlay}>
          This browser can’t scan barcodes. Use <b>Search</b> or <b>Barcode</b> instead.
        </div>
      )}
      {error === 'camera' && (
        <div style={styles.overlay}>
          Couldn’t open the camera. Allow camera access for this site (tap the 🔒 in the address bar), then
          reopen Camera.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: 'relative',
    width: '100%',
    height: 320,
    background: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  reticle: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    right: '12%',
    height: '40%',
    border: `2px solid ${theme.accentBlue}`,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12px 14px',
    background: 'rgba(0,0,0,0.75)',
    color: theme.text,
    fontSize: 13,
    lineHeight: 1.4,
    textAlign: 'center',
  },
};
