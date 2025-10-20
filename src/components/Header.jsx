import React from 'react';
import { Shield } from 'lucide-react';

export default function Header({ onBack }) {
    return (
        <div className="flex items-center justify-between mb-8">
            <button
                onClick={onBack}
                className="text-purple-300 hover:text-white transition-colors"
            >
                ← Back
            </button>
            <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                <span className="font-bold">MyLastResort</span>
            </div>
        </div>
    );
}
