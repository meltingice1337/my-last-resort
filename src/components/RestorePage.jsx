import React, { useState, useRef, useEffect } from 'react';
import { Unlock, Users, CheckCircle, Camera, AlertCircle, Copy, Check } from 'lucide-react';
import Header from './Header';
import QRScanner from './QRScanner';
import { combineShares } from '../util/sss.util';

export default function RestorePage({ onBack }) {
    const [shareInputs, setShareInputs] = useState(['', '', '']);
    const [restoredSecret, setRestoredSecret] = useState('');
    const [checksum, setChecksum] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanningIndex, setScanningIndex] = useState(null);
    const [copied, setCopied] = useState(false);
    const threshold = 3; // This could be dynamic based on share metadata
    const resultRef = useRef(null);

    // Scroll to result when secret is restored
    useEffect(() => {
        if ((restoredSecret || error) && resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [restoredSecret, error]);

    const restoreSecret = async () => {
        try {
            setError('');
            setLoading(true);

            const validShares = shareInputs.filter(s => s.trim());

            if (validShares.length < threshold) {
                setError(`❌ I need ${threshold} pieces to restore my secret. You've entered ${validShares.length}.`);
                setLoading(false);
                return;
            }

            // Try to decode the secret
            let result;
            try {
                result = await combineShares(validShares);
            } catch (decodeErr) {
                console.error('Decode error:', decodeErr);
                setError('❌ These pieces don\'t match. Check that they\'re from my original recovery plan.');
                setLoading(false);
                return;
            }

            const { secret, checksum: decodedChecksum, isValid } = result;

            if (!secret || secret.trim() === '') {
                setError('❌ No secret recovered. The pieces may be damaged or incorrect.');
                setLoading(false);
                return;
            }

            // Verify checksum
            if (!isValid) {
                setError(`❌ Checksum mismatch. The pieces don't match my original secret. Try again with the correct pieces.`);
                setLoading(false);
                return;
            }

            setRestoredSecret(secret);
            setChecksum(decodedChecksum);
            setLoading(false);
        } catch (err) {
            console.error('Restore error:', err);
            setError(`❌ Unexpected error: ${err.message || 'Unknown error occurred'}`);
            setLoading(false);
        }
    };

    const handleScanQR = (index) => {
        setScanningIndex(index);
        setShowScanner(true);
    };

    const handleQRScan = (data) => {
        const newInputs = [...shareInputs];
        newInputs[scanningIndex] = data;
        setShareInputs(newInputs);
        setShowScanner(false);
        setScanningIndex(null);
    };

    const handleBack = () => {
        setShareInputs(['', '', '']);
        setRestoredSecret('');
        setChecksum('');
        setError('');
        setCopied(false);
        onBack();
    };

    const handleCopySecret = async () => {
        try {
            await navigator.clipboard.writeText(restoredSecret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Could not copy to clipboard. Please try selecting and copying manually.');
        }
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto flex flex-col p-4 sm:p-6 md:p-8">
            <div className="max-w-3xl mx-auto w-full">
                <Header onBack={handleBack} />

                <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
                        <Unlock className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400 flex-shrink-0" />
                        <span>Restore My Secret</span>
                    </h2>

                    <div className="mb-6">
                        <p className="text-sm sm:text-base text-gray-300 mb-4">
                            Contact the people who have my recovery pieces. Gather enough pieces and enter them here to restore the secret. The specific order doesn't matter.
                        </p>

                        <div className="space-y-3 sm:space-y-4">
                            {shareInputs.map((input, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-semibold text-gray-300">
                                            Piece #{idx + 1} from whoever has it
                                        </label>
                                        <button
                                            onClick={() => handleScanQR(idx)}
                                            className="flex items-center gap-1.5 text-xs sm:text-sm text-purple-400 hover:text-purple-300 active:text-purple-300 touch-manipulation p-2 -mr-2"
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span>Scan QR</span>
                                        </button>
                                    </div>
                                    <textarea
                                        value={input}
                                        onChange={(e) => {
                                            const newInputs = [...shareInputs];
                                            newInputs[idx] = e.target.value;
                                            setShareInputs(newInputs);
                                        }}
                                        placeholder="Paste the piece data here or scan the QR code..."
                                        className="w-full h-20 sm:h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-base resize-none touch-manipulation"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShareInputs([...shareInputs, ''])}
                            className="mt-3 sm:mt-4 text-purple-400 active:text-purple-300 hover:text-purple-300 text-sm flex items-center gap-2 touch-manipulation p-2 -ml-2"
                        >
                            <Users className="w-4 h-4" />
                            Add another piece
                        </button>
                    </div>

                    <button
                        onClick={restoreSecret}
                        disabled={shareInputs.filter(s => s.trim()).length < 2 || loading}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 active:from-pink-500 active:to-purple-500 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all transform active:scale-95 sm:hover:scale-105 mb-6 touch-manipulation flex items-center justify-center gap-2"
                    >
                        {loading && (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {loading ? 'Restoring...' : 'Restore Secret'}
                    </button>

                    {error && (
                        <div ref={resultRef} className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 sm:p-6 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm sm:text-base text-red-300 mb-1">{error}</p>
                                    <p className="text-xs sm:text-sm text-red-200">
                                        Make sure all pieces are entered correctly and haven't been corrupted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {restoredSecret && (
                        <div ref={resultRef} className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="font-bold text-sm sm:text-base text-green-300">My Secret is Restored ✓</span>
                            </div>

                            {/* Checksum verification display */}
                            <div className="bg-slate-950/50 rounded p-2 sm:p-3 mb-3 border border-green-700/30">
                                <p className="text-xs text-gray-400 mb-1">Checksum (verification):</p>
                                <p className="font-mono text-sm text-green-400 font-semibold">{checksum}</p>
                            </div>

                            <div className="bg-slate-950 rounded p-3 sm:p-4 font-mono text-xs sm:text-sm text-gray-300 whitespace-pre-wrap break-all overflow-x-auto mb-3">
                                {restoredSecret}
                            </div>

                            <button
                                onClick={handleCopySecret}
                                className={`w-full flex items-center justify-center gap-2 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all touch-manipulation ${copied
                                    ? 'bg-green-600 hover:bg-green-600 text-white'
                                    : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied to clipboard!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy Secret to Clipboard
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-gray-400 mt-3">
                                ⚠️ This is sensitive. Keep it safe. Close your browser after you're done.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showScanner && (
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => {
                        setShowScanner(false);
                        setScanningIndex(null);
                    }}
                />
            )}
        </div>
    );
}
