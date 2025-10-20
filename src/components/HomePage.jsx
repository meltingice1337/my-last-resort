import React from 'react';
import { Unlock, CheckCircle2 } from 'lucide-react';

export default function HomePage({ onModeChange }) {
    return (
        <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden flex flex-col p-4 sm:p-6">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col justify-center">
                {/* Header - Compact */}
                <div className="text-center mb-4 sm:mb-6">
                    <div className="flex items-center justify-center mb-2">
                        <Unlock className="w-10 h-10 sm:w-12 sm:h-12 text-pink-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                        Help Recover the Secret
                    </h1>
                    <p className="text-sm sm:text-base text-gray-300">
                        I've trusted you with a piece of my recovery plan.
                    </p>
                </div>

                {/* Main Call to Action - Compact */}
                <div className="mb-4 sm:mb-6">
                    <button onClick={() => onModeChange('restore')}
                        className="group w-full bg-gradient-to-br from-pink-600 to-pink-800 active:from-pink-500 active:to-pink-700 hover:from-pink-500 hover:to-pink-700 p-4 sm:p-6 rounded-xl transition-all transform active:scale-95 sm:hover:scale-105 shadow-2xl touch-manipulation"
                    >
                        <h2 className="text-lg sm:text-xl font-bold mb-1">Begin Recovery</h2>
                        <p className="text-xs sm:text-sm text-pink-200">
                            Scan or enter your piece
                        </p>
                    </button>
                </div>

                {/* How It Works - Compact Grid */}
                <div className="bg-slate-800/50 rounded-lg p-3 sm:p-4 backdrop-blur">
                    <h3 className="text-sm sm:text-base font-bold mb-2 text-white">How this works</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-gray-300">
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="font-semibold text-pink-300 mb-0.5">1. I Split</div>
                            <p className="text-xs">Created pieces of my recovery plan</p>
                        </div>
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="font-semibold text-pink-300 mb-0.5">2. You Scan</div>
                            <p className="text-xs">Enter your piece via QR or text</p>
                        </div>
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="font-semibold text-pink-300 mb-0.5">3. Collect</div>
                            <p className="text-xs">Gather enough pieces together</p>
                        </div>
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="font-semibold text-pink-300 mb-0.5">4. Restore</div>
                            <p className="text-xs">Secret is recovered instantly</p>
                        </div>
                    </div>

                    {/* Security Note - Compact */}
                    <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-300">
                            <strong className="text-green-400">Safe:</strong> Your piece alone is worthless. Only when combined can anything be recovered.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
