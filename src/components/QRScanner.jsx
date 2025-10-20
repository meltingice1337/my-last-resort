import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { parseQRPayload, reconstructDataFromChunks } from '../util/qr-chunks.util';

export default function QRScanner({ onScan, onClose }) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [qrBounds, setQrBounds] = useState(null);
    const [detectionRipple, setDetectionRipple] = useState(null);
    const [lastScannedIndex, setLastScannedIndex] = useState(null);

    // Unified chunk state - single source of truth
    const [chunkState, setChunkState] = useState({
        chunks: [],
        scannedIndices: new Set(),
        expectedTotal: null
    });

    const streamRef = useRef(null);
    const isRunningRef = useRef(false);
    const lastScannedRef = useRef(null);
    const lastScannedTimeRef = useRef(0);
    const animationFrameRef = useRef(null);
    const videoRef = useRef(null);

    const SCAN_DEBOUNCE_MS = 1000;

    useEffect(() => {
        let mounted = true;

        const startScanner = async () => {
            try {
                const videoElement = document.getElementById('qr-reader');
                if (!videoElement || videoElement.tagName !== 'VIDEO') {
                    if (mounted) setError('Video element not found');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (!mounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                videoElement.srcObject = stream;
                streamRef.current = stream;
                videoRef.current = videoElement;

                await new Promise((resolve) => {
                    videoElement.onloadedmetadata = () => {
                        videoElement.play();
                        resolve();
                    };
                });

                if (!mounted) return;

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;

                if (mounted) {
                    isRunningRef.current = true;
                    setScanning(true);
                }

                // Note: jsQR scans the ENTIRE video frame, not just the center box.
                // The purple box is just visual guidance for users.
                const scanFrame = () => {
                    if (!mounted || !isRunningRef.current) return;

                    try {
                        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, canvas.width, canvas.height);

                        if (code?.data) {
                            handleQRDetection(code.data, code.location, videoElement);
                        }
                    } catch (err) {
                        console.error('Error in scan frame:', err);
                    }

                    animationFrameRef.current = requestAnimationFrame(scanFrame);
                };

                scanFrame();
            } catch (err) {
                console.error('Error starting scanner:', err);
                if (mounted) {
                    if (err.name === 'NotAllowedError') {
                        setError('Camera permission denied. Please allow camera access.');
                    } else if (err.name === 'NotFoundError') {
                        setError('No camera found on this device.');
                    } else if (err.name === 'NotReadableError') {
                        setError('Camera is already in use by another application.');
                    } else {
                        setError('Failed to start camera. Please try again.');
                    }
                }
            }
        };

        startScanner();

        return () => {
            mounted = false;

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                isRunningRef.current = false;
            }
        };
    }, []);

    const handleQRDetection = (decodedText, location, videoElement) => {
        const now = Date.now();

        // Debounce: ignore if same QR scanned too recently
        if (lastScannedRef.current === decodedText &&
            now - lastScannedTimeRef.current < SCAN_DEBOUNCE_MS) {
            return;
        }

        // Cool feedback effects!

        // 1. Haptic feedback (mobile)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // 2. Show QR bounds highlight
        if (location && videoRef.current) {
            const video = videoRef.current;
            const scaleX = video.offsetWidth / video.videoWidth;
            const scaleY = video.offsetHeight / video.videoHeight;

            const bounds = {
                topLeft: { x: location.topLeftCorner.x * scaleX, y: location.topLeftCorner.y * scaleY },
                topRight: { x: location.topRightCorner.x * scaleX, y: location.topRightCorner.y * scaleY },
                bottomLeft: { x: location.bottomLeftCorner.x * scaleX, y: location.bottomLeftCorner.y * scaleY },
                bottomRight: { x: location.bottomRightCorner.x * scaleX, y: location.bottomRightCorner.y * scaleY }
            };

            // Calculate center for ripple effect
            const centerX = (bounds.topLeft.x + bounds.topRight.x + bounds.bottomLeft.x + bounds.bottomRight.x) / 4;
            const centerY = (bounds.topLeft.y + bounds.topRight.y + bounds.bottomLeft.y + bounds.bottomRight.y) / 4;

            setQrBounds(bounds);
            setDetectionRipple({ x: centerX, y: centerY });

            setTimeout(() => {
                setQrBounds(null);
                setDetectionRipple(null);
            }, 600);
        }

        // 3. Flash effect
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);

        lastScannedRef.current = decodedText;
        lastScannedTimeRef.current = now;

        const payload = parseQRPayload(decodedText);

        if (payload) {
            // Multi-part QR code
            handleMultiPartQR(payload, videoElement);
        } else {
            // Single QR code
            handleComplete(decodedText, videoElement);
        }
    };

    const handleMultiPartQR = (payload, videoElement) => {
        setChunkState(prevState => {
            const { chunks, scannedIndices, expectedTotal } = prevState;

            // Check if this is from a different set
            if (expectedTotal !== null && payload.total !== expectedTotal) {
                console.log('Different set detected, resetting...');

                // Double vibration for warning
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }

                return {
                    chunks: [payload],
                    scannedIndices: new Set([payload.index]),
                    expectedTotal: payload.total
                };
            }

            // Skip if already scanned
            if (scannedIndices.has(payload.index)) {
                console.log(`Chunk ${payload.index} already scanned, ignoring`);
                return prevState;
            }

            // Show which part was just scanned with pulse effect
            setLastScannedIndex(payload.index);
            setTimeout(() => setLastScannedIndex(null), 1000);

            // Add new chunk
            const newChunks = [...chunks, payload];
            const newIndices = new Set([...scannedIndices, payload.index]);
            const newState = {
                chunks: newChunks,
                scannedIndices: newIndices,
                expectedTotal: payload.total
            };

            // Check if we have all chunks
            const hasAllChunks = newIndices.size === payload.total;
            console.log(`Scanned ${newIndices.size}/${payload.total} chunks. Complete: ${hasAllChunks}`);

            if (hasAllChunks) {
                // Celebration vibration!
                if (navigator.vibrate) {
                    navigator.vibrate([50, 50, 50, 50, 200]);
                }

                // Sort chunks by index and reconstruct
                const sortedChunks = newChunks
                    .sort((a, b) => a.index - b.index)
                    .map(chunk => `SHARE_${chunk.index + 1}_OF_${chunk.total}|${chunk.data}`);

                try {
                    const reconstructed = reconstructDataFromChunks(sortedChunks);
                    handleComplete(reconstructed, videoElement);
                } catch (err) {
                    console.error('Failed to reconstruct data:', err);
                    setError('Failed to reconstruct QR data. Please try again.');
                }
            }

            return newState;
        });
    };

    const handleComplete = (data, videoElement) => {
        console.log('QR scan complete!');
        setScanned(true);
        setScanning(false);

        setTimeout(() => {
            if (isRunningRef.current && streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                isRunningRef.current = false;
            }
            onScan(data);
            onClose();
        }, 500);
    };

    const handleManualClose = () => {
        if (streamRef.current && isRunningRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            isRunningRef.current = false;
        }
        onClose();
    };

    const { scannedIndices, expectedTotal } = chunkState;
    const scannedCount = scannedIndices.size;
    const isMultiPart = expectedTotal && expectedTotal > 1;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-end justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-xl overflow-hidden w-full max-w-md my-auto">
                <div className="flex items-center justify-between p-4 bg-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <Camera className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <h3 className="font-bold text-white truncate">
                            {scanned ? 'QR Code Detected!' : 'Scan QR Code'}
                        </h3>
                    </div>
                    <button
                        onClick={handleManualClose}
                        className="text-gray-400 hover:text-white transition-colors touch-manipulation p-2 flex-shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative flex-shrink-0">
                    <video
                        id="qr-reader"
                        className="w-full bg-black"
                        style={{ maxHeight: 'min(70vh, 400px)' }}
                        playsInline
                    />

                    {/* Scanning overlay */}
                    {scanning && !scanned && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {/* Guide box */}
                            <div className="relative border-4 border-purple-500 rounded-lg"
                                style={{ width: '250px', height: '250px' }}>
                                {/* Corner accents */}
                                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-lg"></div>
                                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-lg"></div>
                                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-lg"></div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-lg"></div>
                            </div>
                        </div>
                    )}

                    {/* QR Detection Highlight - shows actual detected QR position */}
                    {qrBounds && (
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                            <polygon
                                points={`${qrBounds.topLeft.x},${qrBounds.topLeft.y} ${qrBounds.topRight.x},${qrBounds.topRight.y} ${qrBounds.bottomRight.x},${qrBounds.bottomRight.y} ${qrBounds.bottomLeft.x},${qrBounds.bottomLeft.y}`}
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="4"
                                className="qr-bounds-highlight"
                            />
                        </svg>
                    )}

                    {/* Detection ripple effect */}
                    {detectionRipple && (
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                left: `${detectionRipple.x}px`,
                                top: `${detectionRipple.y}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <div className="detection-ripple"></div>
                        </div>
                    )}

                    {/* Flash effect on detection */}
                    {showFlash && (
                        <div className="absolute inset-0 bg-gradient-radial from-green-400 to-transparent opacity-60 pointer-events-none flash-effect" />
                    )}

                    {isMultiPart && scannedCount > 0 && !scanned && (
                        <div className="absolute top-4 left-4 right-4 bg-slate-900/90 rounded-lg p-4 backdrop-blur-sm border border-purple-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <p className="text-sm font-semibold text-green-300">
                                    Scanned {scannedCount} of {expectedTotal} parts
                                </p>
                            </div>
                            <div className="flex gap-1 mb-2">
                                {Array.from({ length: expectedTotal }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-2 rounded-full transition-all duration-300 ${scannedIndices.has(i)
                                            ? lastScannedIndex === i
                                                ? 'bg-green-400 animate-pulse-scale shadow-lg shadow-green-400/50'
                                                : 'bg-green-400'
                                            : 'bg-gray-600'
                                            }`}
                                    />
                                ))}
                            </div>
                            {scannedCount < expectedTotal && (
                                <p className="text-xs text-gray-400">
                                    Next: {Array.from({ length: expectedTotal })
                                        .map((_, i) => i)
                                        .filter(i => !scannedIndices.has(i))
                                        .map(i => `#${i + 1}`)
                                        .slice(0, 3)
                                        .join(', ')}
                                    {Array.from({ length: expectedTotal }).filter((_, i) => !scannedIndices.has(i)).length > 3 ? '...' : ''}
                                </p>
                            )}
                        </div>
                    )}

                    {scanned && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-4">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-6">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                                <p className="text-red-400 mb-4">{error}</p>
                                <button
                                    onClick={handleManualClose}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg text-white transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {!error && (
                    <div className="p-4 bg-slate-800 text-center flex-shrink-0">
                        <p className="text-sm text-gray-300">
                            {scanned
                                ? 'QR code detected successfully!'
                                : scanning
                                    ? isMultiPart
                                        ? `📱 Scan anywhere in view • ${scannedCount}/${expectedTotal} parts collected`
                                        : '📱 Point camera at QR code anywhere in view'
                                    : 'Starting camera...'}
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                #qr-reader {
                    width: 100%;
                    display: block;
                    object-fit: cover;
                }
                
                /* Flash effect */
                .flash-effect {
                    animation: flash 0.2s ease-out forwards;
                }
                
                @keyframes flash {
                    0% { opacity: 0.6; }
                    100% { opacity: 0; }
                }
                
                /* Detection ripple */
                .detection-ripple {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    border: 3px solid #22c55e;
                    animation: ripple 0.6s ease-out forwards;
                }
                
                @keyframes ripple {
                    0% {
                        transform: scale(0.3);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
                
                /* QR bounds highlight */
                .qr-bounds-highlight {
                    animation: boundsGlow 0.6s ease-out forwards;
                    filter: drop-shadow(0 0 8px #22c55e);
                }
                
                @keyframes boundsGlow {
                    0% {
                        opacity: 1;
                        stroke-width: 4;
                    }
                    100% {
                        opacity: 0;
                        stroke-width: 2;
                    }
                }
                
                /* Pulse scale for newly detected parts */
                .animate-pulse-scale {
                    animation: pulseScale 1s ease-out;
                }
                
                @keyframes pulseScale {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                }
            `}</style>
        </div>
    );
}