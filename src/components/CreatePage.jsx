import React, { useState } from 'react';
import Header from './Header';
import ProgressSteps from './ProgressSteps';
import SecretInput from './SecretInput';
import SharesList from './SharesList';
import { splitSecret } from '../util/sss.util';
import { generateSharePDF } from '../util/pdf.util.jsx';

export default function CreatePage({ onBack }) {
    const [step, setStep] = useState(1);
    const [secretText, setSecretText] = useState('');
    const [numShares, setNumShares] = useState(5);
    const [threshold, setThreshold] = useState(3);
    const [shares, setShares] = useState([]);

    const generateShares = async () => {
        if (!secretText.trim()) return;

        const shares = await splitSecret(secretText, numShares, threshold);

        const generatedShares = [];
        for (let i = 0; i < shares.length; i++) {
            const shareId = `SHARE-${i + 1}`;
            const shareData = shares[i];
            generatedShares.push({
                id: i + 1,
                shareId,
                data: shareData,
                qrData: `mylastresort://${shareId}:${shareData}`
            });
        }
        setShares(generatedShares);
        setStep(2);
    };

    const downloadShare = async (share) => {
        await generateSharePDF(share, threshold, numShares);
    };

    const handleDone = () => {
        setStep(1);
        setSecretText('');
        setShares([]);
        onBack();
    };

    const handleBack = () => {
        setStep(1);
        setSecretText('');
        setShares([]);
        onBack();
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto flex flex-col p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto w-full flex-1">
                <Header onBack={handleBack} />

                <ProgressSteps
                    currentStep={step}
                    steps={['Enter Secret', 'Download Shares']}
                />

                {step === 1 && (
                    <SecretInput
                        secretText={secretText}
                        onSecretChange={setSecretText}
                        numShares={numShares}
                        onNumSharesChange={setNumShares}
                        threshold={threshold}
                        onThresholdChange={setThreshold}
                        onGenerate={generateShares}
                    />
                )}

                {step === 2 && (
                    <SharesList
                        shares={shares}
                        threshold={threshold}
                        numShares={numShares}
                        onDownload={downloadShare}
                        onDone={handleDone}
                    />
                )}
            </div>
        </div>
    );
}
