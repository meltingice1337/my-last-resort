import React, { useState, useRef, useEffect } from "react";
import {
  Unlock,
  Camera,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  ShieldCheck,
  Loader,
} from "lucide-react";
import Header from "./Header";
import QRScanner from "./QRScanner";
import { parseShare, validateShareSet } from "../util/share.util";
import { reconstructKey } from "../util/sss.util";
import { decryptVault } from "../util/crypto.util";
import { fetchVault } from "../util/vault.util";

export default function RecoveryApp() {
  const [shares, setShares] = useState([]); // parsed SharePayload objects
  const [pasteValue, setPasteValue] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [decryptedSecret, setDecryptedSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  const threshold = shares.length > 0 ? shares[0].t : null;
  const total = shares.length > 0 ? shares[0].n : null;
  const canDecrypt = threshold && shares.length >= threshold;

  useEffect(() => {
    if ((decryptedSecret || error) && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [decryptedSecret, error]);

  const addShare = (raw) => {
    const parsed = parseShare(raw);
    if (!parsed) {
      setError("Invalid share format. Expected a JSON share from a recovery card.");
      return false;
    }

    // Check compatibility with existing shares
    if (shares.length > 0) {
      const { v, t, n } = shares[0];
      if (parsed.v !== v || parsed.t !== t || parsed.n !== n) {
        setError("This share is from a different vault. All shares must be from the same set.");
        return false;
      }
    }

    // Check for duplicates
    if (shares.some((s) => s.i === parsed.i)) {
      setError(`Share #${parsed.i} is already added.`);
      return false;
    }

    setShares((prev) => [...prev, parsed]);
    setError("");
    return true;
  };

  const removeShare = (index) => {
    setShares((prev) => prev.filter((_, idx) => idx !== index));
    setError("");
  };

  const handlePaste = () => {
    if (!pasteValue.trim()) return;
    if (addShare(pasteValue.trim())) {
      setPasteValue("");
    }
  };

  const handleScan = (data) => {
    setShowScanner(false);
    addShare(data);
  };

  const handleDecrypt = async () => {
    setError("");
    setLoading(true);

    try {
      const validation = validateShareSet(shares);
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }

      // Reconstruct key from shares
      const hexShares = shares.map((s) => s.s);
      const keyHex = reconstructKey(hexShares);

      // Fetch encrypted vault
      const vault = await fetchVault();

      // Decrypt
      const plaintext = await decryptVault(vault.ciphertext, vault.iv, keyHex);

      setDecryptedSecret(plaintext);
    } catch (err) {
      console.error("Decryption error:", err);
      if (err.message?.includes("vault.json")) {
        setError(err.message);
      } else {
        setError(
          "Decryption failed. The shares may be incorrect or from a different vault.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decryptedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy to clipboard. Please select and copy manually.");
    }
  };

  // Initial state — show landing
  if (!decryptedSecret && shares.length === 0 && !error) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto flex flex-col p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col justify-center">
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex items-center justify-center mb-2">
              <Unlock className="w-10 h-10 sm:w-12 sm:h-12 text-pink-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Emergency Vault Recovery
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              Gather shares from trusted holders to recover the secret.
            </p>
          </div>

          <div className="space-y-3 mb-4 sm:mb-6">
            <button
              onClick={() => setShowScanner(true)}
              className="group w-full bg-gradient-to-br from-pink-600 to-pink-800 active:from-pink-500 active:to-pink-700 hover:from-pink-500 hover:to-pink-700 p-4 sm:p-6 rounded-xl transition-all transform active:scale-95 sm:hover:scale-105 shadow-2xl touch-manipulation"
            >
              <div className="flex items-center justify-center gap-3">
                <Camera className="w-6 h-6" />
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-bold">
                    Scan Share QR Code
                  </h2>
                  <p className="text-xs sm:text-sm text-pink-200">
                    Use camera to scan a recovery card
                  </p>
                </div>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-gray-400">
                  or paste share data
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                placeholder='Paste share JSON here... {"v":1,"i":1,...}'
                className="flex-1 h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm resize-none touch-manipulation"
              />
              <button
                onClick={handlePaste}
                disabled={!pasteValue.trim()}
                className="px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors touch-manipulation"
              >
                Add
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 backdrop-blur">
            <h3 className="text-sm sm:text-base font-bold mb-2 text-white">
              How this works
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-gray-300">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="font-semibold text-pink-300 mb-0.5">
                  1. Gather
                </div>
                <p className="text-xs">
                  Collect shares from enough holders
                </p>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="font-semibold text-pink-300 mb-0.5">
                  2. Scan
                </div>
                <p className="text-xs">
                  Scan QR codes or paste share data
                </p>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="font-semibold text-pink-300 mb-0.5">
                  3. Decrypt
                </div>
                <p className="text-xs">
                  Shares reconstruct the encryption key
                </p>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="font-semibold text-pink-300 mb-0.5">
                  4. Recover
                </div>
                <p className="text-xs">
                  The vault is decrypted and secret revealed
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300">
                <strong className="text-green-400">Secure:</strong> A single
                share alone cannot recover anything. Everything runs in your
                browser — nothing is sent to any server.
              </div>
            </div>
          </div>
        </div>

        {showScanner && (
          <QRScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    );
  }

  // Collection / decryption state
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto flex flex-col p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto w-full">
        <Header />

        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur">
          {!decryptedSecret && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                <Unlock className="w-6 h-6 text-pink-400 flex-shrink-0" />
                <span>Collect Shares</span>
              </h2>

              {/* Share counter */}
              {threshold && (
                <div className="mb-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">
                      {shares.length} of {threshold} shares collected
                    </span>
                    {canDecrypt && (
                      <span className="text-xs text-green-400 font-semibold">
                        Ready to decrypt
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: total }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                          shares.some((s) => s.i === i + 1)
                            ? "bg-green-400"
                            : i < threshold
                              ? "bg-slate-600"
                              : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Collected shares */}
              <div className="space-y-2 mb-4">
                {shares.map((share, idx) => (
                  <div
                    key={share.i}
                    className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3 border border-green-800/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-semibold text-sm">
                        Share #{share.i}
                      </span>
                      <span className="text-xs text-gray-500">
                        of {share.n}
                      </span>
                    </div>
                    <button
                      onClick={() => removeShare(idx)}
                      className="text-gray-500 hover:text-red-400 transition-colors touch-manipulation p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add more shares */}
              {!canDecrypt && (
                <div className="space-y-3 mb-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowScanner(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 active:bg-purple-600 py-3 rounded-lg font-semibold text-sm transition-colors touch-manipulation"
                    >
                      <Camera className="w-4 h-4" />
                      Scan QR Code
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={pasteValue}
                      onChange={(e) => setPasteValue(e.target.value)}
                      placeholder="Paste share JSON..."
                      className="flex-1 h-16 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-xs resize-none touch-manipulation"
                    />
                    <button
                      onClick={handlePaste}
                      disabled={!pasteValue.trim()}
                      className="px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold transition-colors touch-manipulation"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Extra shares beyond threshold */}
              {canDecrypt && (
                <div className="space-y-3 mb-4">
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm text-gray-300 transition-colors touch-manipulation"
                  >
                    <Plus className="w-4 h-4" />
                    Add another share (optional)
                  </button>
                </div>
              )}

              {/* Decrypt button */}
              <button
                onClick={handleDecrypt}
                disabled={!canDecrypt || loading}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 active:from-pink-500 active:to-purple-500 hover:from-pink-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all transform active:scale-95 sm:hover:scale-105 touch-manipulation flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5" />
                    {canDecrypt
                      ? "Decrypt Vault"
                      : `Need ${threshold ? threshold - shares.length : "?"} more shares`}
                  </>
                )}
              </button>
            </>
          )}

          {/* Error display */}
          {error && (
            <div
              ref={!decryptedSecret ? resultRef : undefined}
              className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 sm:p-6 mt-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Decrypted result */}
          {decryptedSecret && (
            <div ref={resultRef}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-green-300">
                  Secret Recovered
                </h2>
              </div>

              <div className="bg-slate-950 rounded-lg p-4 sm:p-6 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all overflow-x-auto mb-4 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {decryptedSecret}
              </div>

              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all touch-manipulation ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
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

              <p className="text-xs text-gray-400 mt-3 text-center">
                This is sensitive. Keep it safe. Close your browser when done.
              </p>
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
