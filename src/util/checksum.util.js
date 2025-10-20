/**
 * Generate a simple checksum for secret verification
 * Uses CRC32-like algorithm for compact representation
 */
export const generateChecksum = (data) => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and take last 8 chars for compact display
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase().slice(-8);
};

/**
 * Verify checksum matches
 */
export const verifyChecksum = (data, checksum) => {
    return generateChecksum(data) === checksum;
};
