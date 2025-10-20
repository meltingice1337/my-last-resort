import { pdf } from '@react-pdf/renderer';
import { RecoveryPlanPDF } from './RecoveryPlanPDF';
import { splitDataIntoQRChunks, createQRPayload } from './qr-chunks.util';
import QRCode from 'qrcode';

// Helper to generate QR code data URLs
const generateQRDataUrl = async (data) => {
    return await QRCode.toDataURL(data, {
        width: 200,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
    });
};

export const generateSharePDF = async (share, threshold, numShares) => {
    // Split large share data into chunks for QR codes
    const chunks = splitDataIntoQRChunks(share.data, 1000);

    // Generate all QR codes BEFORE rendering PDF
    const qrImages = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const qrPayload = createQRPayload(chunk.data, chunk.index, chunk.total);
        const qrDataUrl = await generateQRDataUrl(qrPayload);
        qrImages.push(qrDataUrl);
    }

    // Generate PDF document with pre-generated QR codes
    const pdfDoc = (
        <RecoveryPlanPDF
            share={share}
            threshold={threshold}
            numShares={numShares}
            chunks={chunks}
            qrImages={qrImages}
        />
    );

    // Render and save
    const blob = await pdf(pdfDoc).toBlob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MyLastResort-share-${share.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};