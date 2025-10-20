import pako from 'pako';
import { Buffer } from 'node:buffer';

export async function compressText(secretText) {
    const inputBuffer = Buffer.from(secretText, 'utf-8');
    const compressed = pako.deflate(inputBuffer);
    let compressedHex = Buffer.from(compressed).toString('hex');
    return compressedHex;
}

export async function decompressText(compressed) {
    let buffer = Buffer.from(compressed, 'hex');
    const decompressedBuffer = pako.inflate(buffer, { to: 'string' });
    return decompressedBuffer;
}

(async () => {
    await Promise.all([
        new Promise(r => {
            let s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/secrets.js-grempe@2.0.0/secrets.min.js';
            s.onload = r; document.head.append(s)
        }),
        new Promise(r => {
            let s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako_inflate.min.js';
            s.onload = r; document.head.append(s)
        })
    ]);

    console.log('✅ Ready! Use: recover(["share1", "share2", "share3"])');

    window.recover = function (shares) {
        const hex = shares.map(s => {
            let h = Array.from(atob(s.slice(1)), c =>
                c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
            return s[0] === 'O' ? h.slice(0, -1) : h;
        });

        const combined = secrets.combine(hex);
        const bytes = new Uint8Array(combined.match(/.{2}/g).map(b => parseInt(b, 16)));
        const text = pako.inflate(bytes, { to: 'string' });

        const [checksum, ...parts] = text.split('|');
        console.log('SECRET:', parts.join('|'));
        console.log('Checksum:', checksum);
        return parts.join('|');
    };
})();