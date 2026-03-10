import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { parseShare } from "../util/share.util";

export default function QRScanner({ onScan, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [qrBounds, setQrBounds] = useState(null);
  const [detectionRipple, setDetectionRipple] = useState(null);

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
        const videoElement = document.getElementById("qr-reader");
        if (!videoElement || videoElement.tagName !== "VIDEO") {
          if (mounted) setError("Video element not found");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
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

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        if (mounted) {
          isRunningRef.current = true;
          setScanning(true);
        }

        const scanFrame = () => {
          if (!mounted || !isRunningRef.current) return;

          try {
            context.drawImage(
              videoElement,
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const imageData = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const code = jsQR(imageData.data, canvas.width, canvas.height);

            if (code?.data) {
              handleQRDetection(code.data, code.location, videoElement);
            }
          } catch (err) {
            console.error("Error in scan frame:", err);
          }

          animationFrameRef.current = requestAnimationFrame(scanFrame);
        };

        scanFrame();
      } catch (err) {
        console.error("Error starting scanner:", err);
        if (mounted) {
          if (err.name === "NotAllowedError") {
            setError(
              "Camera permission denied. Please allow camera access.",
            );
          } else if (err.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else if (err.name === "NotReadableError") {
            setError(
              "Camera is already in use by another application.",
            );
          } else {
            setError("Failed to start camera. Please try again.");
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
        streamRef.current.getTracks().forEach((track) => track.stop());
        isRunningRef.current = false;
      }
    };
  }, []);

  const handleQRDetection = (decodedText, location) => {
    const now = Date.now();

    if (
      lastScannedRef.current === decodedText &&
      now - lastScannedTimeRef.current < SCAN_DEBOUNCE_MS
    ) {
      return;
    }

    // Validate that it's a valid share
    const parsed = parseShare(decodedText);
    if (!parsed) return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 200]);
    }

    // QR bounds highlight
    if (location && videoRef.current) {
      const video = videoRef.current;
      const scaleX = video.offsetWidth / video.videoWidth;
      const scaleY = video.offsetHeight / video.videoHeight;

      const bounds = {
        topLeft: {
          x: location.topLeftCorner.x * scaleX,
          y: location.topLeftCorner.y * scaleY,
        },
        topRight: {
          x: location.topRightCorner.x * scaleX,
          y: location.topRightCorner.y * scaleY,
        },
        bottomLeft: {
          x: location.bottomLeftCorner.x * scaleX,
          y: location.bottomLeftCorner.y * scaleY,
        },
        bottomRight: {
          x: location.bottomRightCorner.x * scaleX,
          y: location.bottomRightCorner.y * scaleY,
        },
      };

      const centerX =
        (bounds.topLeft.x +
          bounds.topRight.x +
          bounds.bottomLeft.x +
          bounds.bottomRight.x) /
        4;
      const centerY =
        (bounds.topLeft.y +
          bounds.topRight.y +
          bounds.bottomLeft.y +
          bounds.bottomRight.y) /
        4;

      setQrBounds(bounds);
      setDetectionRipple({ x: centerX, y: centerY });

      setTimeout(() => {
        setQrBounds(null);
        setDetectionRipple(null);
      }, 600);
    }

    // Flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    lastScannedRef.current = decodedText;
    lastScannedTimeRef.current = now;

    handleComplete(decodedText);
  };

  const handleComplete = (data) => {
    setScanned(true);
    setScanning(false);

    setTimeout(() => {
      if (isRunningRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        isRunningRef.current = false;
      }
      onScan(data);
    }, 500);
  };

  const handleManualClose = () => {
    if (streamRef.current && isRunningRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      isRunningRef.current = false;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-end justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl overflow-hidden w-full max-w-md my-auto">
        <div className="flex items-center justify-between p-4 bg-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <h3 className="font-bold text-white truncate">
              {scanned ? "Share Detected!" : "Scan Share QR Code"}
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
            style={{ maxHeight: "min(70vh, 400px)" }}
            playsInline
          />

          {/* Scanning overlay */}
          {scanning && !scanned && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="relative border-4 border-purple-500 rounded-lg"
                style={{ width: "250px", height: "250px" }}
              >
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-lg"></div>
              </div>
            </div>
          )}

          {/* QR Detection Highlight */}
          {qrBounds && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            >
              <polygon
                points={`${qrBounds.topLeft.x},${qrBounds.topLeft.y} ${qrBounds.topRight.x},${qrBounds.topRight.y} ${qrBounds.bottomRight.x},${qrBounds.bottomRight.y} ${qrBounds.bottomLeft.x},${qrBounds.bottomLeft.y}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth="4"
                className="qr-bounds-highlight"
              />
            </svg>
          )}

          {/* Detection ripple */}
          {detectionRipple && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${detectionRipple.x}px`,
                top: `${detectionRipple.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="detection-ripple"></div>
            </div>
          )}

          {/* Flash effect */}
          {showFlash && (
            <div className="absolute inset-0 bg-gradient-radial from-green-400 to-transparent opacity-60 pointer-events-none flash-effect" />
          )}

          {/* Success overlay */}
          {scanned && (
            <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
              <div className="bg-green-500 rounded-full p-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
          )}

          {/* Error overlay */}
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
                ? "Share detected successfully!"
                : scanning
                  ? "Point camera at a share QR code"
                  : "Starting camera..."}
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
        .flash-effect {
          animation: flash 0.2s ease-out forwards;
        }
        @keyframes flash {
          0% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        .detection-ripple {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid #22c55e;
          animation: ripple 0.6s ease-out forwards;
        }
        @keyframes ripple {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .qr-bounds-highlight {
          animation: boundsGlow 0.6s ease-out forwards;
          filter: drop-shadow(0 0 8px #22c55e);
        }
        @keyframes boundsGlow {
          0% { opacity: 1; stroke-width: 4; }
          100% { opacity: 0; stroke-width: 2; }
        }
      `}</style>
    </div>
  );
}
