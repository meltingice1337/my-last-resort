const browserCrypto = globalThis.crypto;

export function getRandomValues(array) {
  return browserCrypto.getRandomValues(array);
}

export function randomBytes(size) {
  const buf = new Uint8Array(size);
  browserCrypto.getRandomValues(buf);
  return buf;
}

export default { getRandomValues, randomBytes, subtle: browserCrypto.subtle };
