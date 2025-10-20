import secrets from 'secrets.js-grempe';
import { Buffer } from 'node:buffer';
import { compressText, decompressText } from './compression.util';
import { generateChecksum } from './checksum.util';

const hexToBase64 = (text) => {
    const wasOdd = text.length % 2 === 1;
    const paddedHex = wasOdd ? text + '0' : text;
    const b64 = Buffer.from(paddedHex, 'hex').toString('base64');
    return (wasOdd ? 'O' : 'E') + b64;
}

const base64ToHex = (base64) => {
    const wasOdd = base64[0] === 'O';
    const actualB64 = base64.slice(1);
    let hex = Buffer.from(actualB64, 'base64').toString('hex');
    if (wasOdd) {
        hex = hex.slice(0, -1);
    }
    return hex;
}

export const splitSecret = async (secret, shares, threshold) => {
    // 1. Generate checksum of original secret
    const checksum = generateChecksum(secret);

    // 2. Embed checksum with secret (checksum|secret)
    const secretWithChecksum = `${checksum}|${secret}`;

    // 3. Compress the secret+checksum
    const compressedHex = await compressText(secretWithChecksum);

    // 4. Split the compressed hex
    const sharesArray = secrets.share(compressedHex, shares, threshold);

    // 5. Convert to base64
    const sharesBase64 = sharesArray.map(share => hexToBase64(share));

    return sharesBase64;
}

export const combineShares = async (shares) => {
    // 1. Convert from base64 to hex
    const hexShares = shares.map(share => base64ToHex(share));

    // 2. Combine the shares
    const combinedHex = secrets.combine(hexShares);

    // 3. Decompress the result
    const decompressed = await decompressText(combinedHex);

    // 4. Extract checksum and secret
    const [embeddedChecksum, ...secretParts] = decompressed.split('|');
    const secret = secretParts.join('|'); // Handle secrets that contain pipes

    // 5. Verify checksum
    const computedChecksum = generateChecksum(secret);
    const isValid = embeddedChecksum === computedChecksum;

    return {
        secret,
        checksum: embeddedChecksum,
        isValid
    };
}