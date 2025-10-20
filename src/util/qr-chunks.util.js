// Split data into chunks for multiple QR codes
export const splitDataIntoQRChunks = (data, maxChunkSize = 1000) => {
    const chunks = [];
    for (let i = 0; i < data.length; i += maxChunkSize) {
        chunks.push(data.substring(i, i + maxChunkSize));
    }
    return chunks.map((chunk, index) => ({
        index,
        total: chunks.length,
        data: chunk,
        // Include metadata so scanner knows how to reassemble
        metadata: `SHARE_${index + 1}_OF_${chunks.length}`
    }));
};

// Reconstruct data from chunks
export const reconstructDataFromChunks = (chunks) => {
    // Sort by index to ensure correct order
    const sorted = chunks.sort((a, b) => {
        const aIndex = parseInt(a.split('_')[1]);
        const bIndex = parseInt(b.split('_')[1]);
        return aIndex - bIndex;
    });

    // Extract just the data portion (remove metadata)
    return sorted.map(chunk => {
        // Find where the actual data starts (after metadata prefix)
        const match = chunk.match(/^SHARE_\d+_OF_\d+\|(.+)$/);
        return match ? match[1] : chunk;
    }).join('');
};

// Create QR code payload with sequential position
export const createQRPayload = (shareData, chunkIndex, totalChunks) => {
    return `SHARE_${chunkIndex + 1}_OF_${totalChunks}|${shareData}`;
};

// Parse QR payload - extract position info
export const parseQRPayload = (payload) => {
    const match = payload.match(/^SHARE_(\d+)_OF_(\d+)\|(.+)$/);
    if (!match) {
        return null;
    }

    const index = parseInt(match[1]) - 1;
    const total = parseInt(match[2]);
    const data = match[3];

    return {
        index,
        total,
        data,
        position: parseInt(match[1]) // 1-indexed position for UI
    };
};
