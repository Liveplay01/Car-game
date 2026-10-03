import qrcode from 'qrcode-generator';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * A QR code for `text` as an inline SVG: dark modules on a white card with its quiet zone, so
 * a phone camera reads it on the game's dark page. Built by hand from the module matrix (no
 * markup string, nothing for the CSP to object to). The lobby shows one next to the invite
 * code, so a friend in the same room scans it and lands in the game.
 */
export function qrSvg(text: string, label: string): SVGSVGElement {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n + quiet * 2} ${n + quiet * 2}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const back = document.createElementNS(SVG, 'rect');
  back.setAttribute('width', String(n + quiet * 2));
  back.setAttribute('height', String(n + quiet * 2));
  back.setAttribute('fill', '#ffffff');
  const dark = document.createElementNS(SVG, 'path');
  dark.setAttribute('d', d);
  dark.setAttribute('fill', '#0b0d10');
  svg.append(back, dark);
  return svg;
}
