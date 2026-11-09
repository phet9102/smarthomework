import { forwardRef, useMemo } from 'react';
import qrcode from 'qrcode-generator';

/** Renders a QR code as crisp SVG (no canvas, scales to any size). */
const QrCode = forwardRef(function QrCode({ value, size = 232, label }, ref) {
  const { path, dim } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const quiet = 4;
    let d = '';
    for (let r = 0; r < count; r += 1) {
      for (let c = 0; c < count; c += 1) {
        if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      }
    }
    return { path: d, dim: count + quiet * 2 };
  }, [value]);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
});

export default QrCode;

/**
 * Saves the QR (plus amount text) as a PNG, so phone users can open it from
 * their banking app ("scan from image") instead of scanning their own screen.
 */
export async function downloadQrPng(svgEl, { filename, title, subtitle }) {
  if (!svgEl) return;
  const qrSize = 600;
  const pad = 40;
  const header = 110;
  const width = qrSize + pad * 2;
  const height = qrSize + pad * 2 + header;

  const svgText = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0f3b6e';
  ctx.fillRect(0, 0, width, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PromptPay', width / 2, 47);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(title, width / 2, 108);
  if (subtitle) {
    ctx.fillStyle = '#64748b';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(subtitle, width / 2, height - 16);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, pad, header + 10, qrSize, qrSize);
  URL.revokeObjectURL(url);

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}
