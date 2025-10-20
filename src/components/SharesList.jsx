import React from 'react';
import { CheckCircle, Download, QrCode, AlertCircle, FileText } from 'lucide-react';

export default function SharesList({ shares, threshold, numShares, onDownload, onDone }) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 md:p-8 backdrop-blur">
            <div className="text-center mb-6 sm:mb-8">
                <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-green-400 mx-auto mb-3 sm:mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Your Recovery Plan is Ready</h2>
                <p className="text-sm sm:text-base text-gray-300 px-4">Print or download each piece and give them to your trusted friends</p>
            </div>

            <div className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
                {shares.map((share) => (
                    <div key={share.id} className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-700">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div className="flex-1">
                                <div className="font-bold text-base sm:text-lg text-purple-300">Piece #{share.id}</div>
                                <div className="text-xs sm:text-sm text-gray-400">For: Friend #{share.id}</div>
                            </div>
                            <button
                                onClick={() => onDownload(share)}
                                className="flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-500 hover:bg-purple-500 px-4 py-2.5 sm:py-2 rounded-lg transition-colors touch-manipulation w-full sm:w-auto"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download PDF</span>
                            </button>
                        </div>
                        <div className="bg-slate-950 rounded p-2.5 sm:p-3 font-mono text-xs text-gray-400 break-all overflow-x-auto">
                            {share.data}
                        </div>
                        <div className="mt-2 sm:mt-3 text-xs text-gray-500 flex items-center gap-2">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>Download includes QR code and printable PDF format</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-red-200">
                        <strong>Share These Pieces:</strong>
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>Give each piece to a different person you trust</li>
                            <li>Tell them this is part of your recovery plan</li>
                            <li>They should store it in their password manager, safe, or secure location</li>
                            <li>One piece alone is useless - you need at least {threshold} pieces</li>
                            <li>Never keep all pieces together in one place</li>
                        </ul>
                    </div>
                </div>
            </div>

            <button
                onClick={onDone}
                className="w-full bg-slate-700 active:bg-slate-600 hover:bg-slate-600 py-3 rounded-lg font-semibold transition-colors touch-manipulation"
            >
                All Done - Go Back Home
            </button>
        </div>
    );
}
