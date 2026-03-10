import { writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import QRCode from 'qrcode';
import type { SharePayload, VaultConfig } from './types.js';

// A5 dimensions in points (148mm x 210mm)
const A5_WIDTH = 420;
const A5_HEIGHT = 595;

const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.2, 0.2, 0.2),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.7, 0.7, 0.7),
  red: rgb(0.8, 0.1, 0.1),
  purple: rgb(0.35, 0.11, 0.53),
};

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor = COLORS.lightGray
) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth: 1 });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLORS.black
) {
  page.drawText(text, { x, y, size, font, color });
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateSharePDF(
  share: SharePayload,
  config: VaultConfig,
  outputPath: string
): Promise<void> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  // Compact JSON with zero whitespace for clean copy-paste
  const shareJson = JSON.stringify(share).replace(/\s/g, '');

  const qrBuffer = await QRCode.toBuffer(shareJson, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 400,
    type: 'png',
  });
  const qrImage = await doc.embedPng(qrBuffer);

  await drawShareCard(doc, share, qrImage, shareJson, font, fontBold, fontMono);
  await drawInstructions(doc, share, config, font, fontBold, fontMono);
  await drawConsoleRecovery(doc, config, font, fontBold, fontMono);

  const pdfBytes = await doc.save();
  await writeFile(outputPath, pdfBytes);
}

async function drawShareCard(
  doc: PDFDocument,
  share: SharePayload,
  qrImage: Awaited<ReturnType<typeof PDFDocument.prototype.embedPng>>,
  shareJson: string,
  font: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont
): Promise<void> {
  const page = doc.addPage([A5_WIDTH, A5_HEIGHT]);
  let y = A5_HEIGHT - 40;

  // Title
  drawText(page, 'EMERGENCY VAULT', 30, y, fontBold, 18, COLORS.purple);
  y -= 22;
  drawText(page, `SHARE #${share.i} of ${share.n}`, 30, y, fontBold, 14, COLORS.darkGray);
  y -= 25;

  // Confidential warning
  page.drawRectangle({
    x: 25, y: y - 40, width: A5_WIDTH - 50, height: 40,
    color: rgb(1, 0.95, 0.95),
  });
  drawBox(page, 25, y - 40, A5_WIDTH - 50, 40, COLORS.red);
  drawText(page, 'CONFIDENTIAL — DO NOT SHARE THIS DOCUMENT', 35, y - 25, fontBold, 9, COLORS.red);
  drawText(page, 'Store securely. This is one piece of an emergency recovery system.', 35, y - 36, font, 7, COLORS.gray);
  y -= 60;

  // QR Code
  const qrSize = 200;
  const qrX = (A5_WIDTH - qrSize) / 2;
  page.drawImage(qrImage, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize });
  y -= qrSize + 10;

  drawText(
    page,
    'Scan this QR code at the recovery website',
    (A5_WIDTH - font.widthOfTextAtSize('Scan this QR code at the recovery website', 8)) / 2,
    y, font, 8, COLORS.gray
  );
  y -= 25;

  // Plain text fallback
  drawText(page, 'PLAIN TEXT FALLBACK (copy as one continuous string):', 30, y, fontBold, 8, COLORS.darkGray);
  y -= 12;

  const maxCharsPerLine = 60;
  const jsonLines: string[] = [];
  for (let i = 0; i < shareJson.length; i += maxCharsPerLine) {
    jsonLines.push(shareJson.substring(i, i + maxCharsPerLine));
  }

  drawBox(page, 25, y - (jsonLines.length * 10 + 8), A5_WIDTH - 50, jsonLines.length * 10 + 8);
  for (const line of jsonLines) {
    drawText(page, line, 30, y - 8, fontMono, 7, COLORS.darkGray);
    y -= 10;
  }
  y -= 15;

  // Metadata
  drawText(
    page,
    `Share ${share.i} of ${share.n}  |  Threshold: ${share.t}  |  ${new Date().toLocaleDateString()}`,
    30, y, font, 7, COLORS.lightGray
  );

  // Footer
  drawText(page, 'Emergency Vault — Recovery Share', 30, 20, font, 7, COLORS.lightGray);
  drawText(page, 'Page 1 of 3', A5_WIDTH - 80, 20, font, 7, COLORS.lightGray);
}

async function drawInstructions(
  doc: PDFDocument,
  share: SharePayload,
  config: VaultConfig,
  font: PDFFont,
  fontBold: PDFFont,
  _fontMono: PDFFont
): Promise<void> {
  const page = doc.addPage([A5_WIDTH, A5_HEIGHT]);
  let y = A5_HEIGHT - 40;

  drawText(page, 'RECOVERY INSTRUCTIONS', 30, y, fontBold, 16, COLORS.purple);
  y -= 30;

  const steps = [
    {
      title: 'Step 1: Gather shares',
      body: `You need at least ${share.t} of ${share.n} share holders to recover the secret. Contact the other holders and coordinate.`,
    },
    {
      title: 'Step 2: Access the recovery tool',
      body: config.repoUrl
        ? `Go to: ${config.repoUrl}`
        : 'Access the Emergency Vault recovery website.',
    },
    {
      title: 'Step 3: Scan or paste each share',
      body: 'Each holder scans their QR code or pastes the plain text from their share card. The order does not matter.',
    },
    {
      title: 'Step 4: Decrypt',
      body: `Once ${share.t} shares are entered, click "Decrypt" to recover the secret. The tool will fetch the encrypted vault and decrypt it using the reconstructed key.`,
    },
  ];

  for (const step of steps) {
    drawText(page, step.title, 30, y, fontBold, 11, COLORS.darkGray);
    y -= 16;
    const lines = wrapText(step.body, A5_WIDTH - 80, font, 9);
    for (const line of lines) {
      drawText(page, line, 40, y, font, 9, COLORS.gray);
      y -= 13;
    }
    y -= 10;
  }

  y -= 10;
  drawBox(page, 25, y - 50, A5_WIDTH - 50, 50, COLORS.red);
  drawText(page, 'SECURITY REMINDERS', 35, y - 12, fontBold, 9, COLORS.red);
  drawText(page, '- Never photograph or digitize this document', 35, y - 24, font, 8, COLORS.gray);
  drawText(page, '- Destroy after use if the vault owner instructs you to', 35, y - 35, font, 8, COLORS.gray);
  drawText(page, '- A single share alone cannot recover anything', 35, y - 46, font, 8, COLORS.gray);

  // Footer
  drawText(page, 'Emergency Vault — Recovery Instructions', 30, 20, font, 7, COLORS.lightGray);
  drawText(page, 'Page 2 of 3', A5_WIDTH - 80, 20, font, 7, COLORS.lightGray);
}

async function drawConsoleRecovery(
  doc: PDFDocument,
  config: VaultConfig,
  font: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont
): Promise<void> {
  const page = doc.addPage([A5_WIDTH, A5_HEIGHT]);
  let y = A5_HEIGHT - 40;

  drawText(page, 'MANUAL RECOVERY (LAST RESORT)', 30, y, fontBold, 14, COLORS.purple);
  y -= 20;
  drawText(page, 'If the recovery website is unavailable, use this browser console script.', 30, y, font, 9, COLORS.gray);
  y -= 25;

  drawText(page, 'Prerequisites:', 30, y, fontBold, 10, COLORS.darkGray);
  y -= 14;
  drawText(page, '- A modern web browser (Chrome, Firefox, Safari, Edge)', 40, y, font, 8, COLORS.gray);
  y -= 12;
  drawText(page, '- Access to vault.json (or its contents)', 40, y, font, 8, COLORS.gray);
  y -= 12;
  drawText(page, `- At least ${config.threshold} share JSON strings`, 40, y, font, 8, COLORS.gray);
  y -= 20;

  drawText(page, 'Instructions:', 30, y, fontBold, 10, COLORS.darkGray);
  y -= 14;
  drawText(page, '1. Open browser DevTools (F12) and go to Console tab', 40, y, font, 8, COLORS.gray);
  y -= 12;
  drawText(page, '2. Copy and paste the script below, then press Enter', 40, y, font, 8, COLORS.gray);
  y -= 12;
  drawText(page, '3. Follow the on-screen prompts', 40, y, font, 8, COLORS.gray);
  y -= 20;

  const script = [
    `(async()=>{`,
    `  await new Promise(r=>{let s=document.createElement('script');`,
    `    s.src='https://cdn.jsdelivr.net/npm/secrets.js-grempe@2.0.0/secrets.min.js';`,
    `    s.onload=r;document.head.append(s)});`,
    `  window.recover=async function(shares,vaultUrl){`,
    `    const parsed=shares.map(s=>`,
    `      typeof s==='string'?JSON.parse(s):s);`,
    `    const hexes=parsed.map(p=>p.s);`,
    `    const keyHex=secrets.combine(hexes);`,
    `    const vault=await(await fetch(vaultUrl)).json();`,
    `    const key=new Uint8Array(`,
    `      keyHex.match(/.{2}/g).map(b=>parseInt(b,16)));`,
    `    const iv=Uint8Array.from(atob(vault.iv),`,
    `      c=>c.charCodeAt(0));`,
    `    const ct=Uint8Array.from(atob(vault.ciphertext),`,
    `      c=>c.charCodeAt(0));`,
    `    const ck=await crypto.subtle.importKey(`,
    `      'raw',key,{name:'AES-GCM'},false,['decrypt']);`,
    `    const pt=await crypto.subtle.decrypt(`,
    `      {name:'AES-GCM',iv},ck,ct);`,
    `    const text=new TextDecoder().decode(pt);`,
    `    console.log('SECRET:',text);return text;`,
    `  };`,
    `  console.log('Ready! Use:');`,
    `  console.log('recover([share1,share2,share3],"<URL>")');`,
    `})();`,
  ];

  const boxHeight = script.length * 9 + 12;
  page.drawRectangle({
    x: 25, y: y - boxHeight, width: A5_WIDTH - 50, height: boxHeight,
    color: rgb(0.95, 0.95, 0.97),
  });
  drawBox(page, 25, y - boxHeight, A5_WIDTH - 50, boxHeight);

  for (const line of script) {
    drawText(page, line, 32, y - 10, fontMono, 6.5, COLORS.darkGray);
    y -= 9;
  }
  y -= 20;

  if (config.repoUrl) {
    drawText(page, `Vault URL: ${config.repoUrl}/vault.json`, 30, y, font, 8, COLORS.gray);
    y -= 15;
  }

  drawBox(page, 25, y - 30, A5_WIDTH - 50, 30, COLORS.red);
  drawText(page, 'After recovery, close all browser tabs and clear console history.', 35, y - 18, fontBold, 8, COLORS.red);

  // Footer
  drawText(page, 'Emergency Vault — Manual Recovery Script', 30, 20, font, 7, COLORS.lightGray);
  drawText(page, 'Page 3 of 3', A5_WIDTH - 80, 20, font, 7, COLORS.lightGray);
}
