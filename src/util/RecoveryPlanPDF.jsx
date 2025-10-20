import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.4,
    },
    pageContent: {
        marginBottom: 60,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        paddingTop: 15,
        textAlign: 'center',
        fontSize: 7,
        borderTopWidth: 1,
        borderTopColor: '#888',
        color: '#555',
    },
    footerLine: {
        fontSize: 7,
        marginBottom: 2,
        color: '#555',
    },
    headerContainer: {
        marginBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        paddingBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: '#000',
    },
    warningBox: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#000',
    },
    warningTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#000',
    },
    warningText: {
        fontSize: 9,
        textAlign: 'center',
        marginBottom: 4,
        color: '#000',
    },
    detailsBox: {
        marginBottom: 20,
        paddingBottom: 15,
    },
    detailsTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#000',
    },
    detailsLine: {
        fontSize: 10,
        marginBottom: 4,
        color: '#000',
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#000',
    },
    sectionHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#000',
    },
    stepTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 6,
        marginTop: 8,
        color: '#000',
    },
    stepText: {
        fontSize: 8,
        marginBottom: 3,
        marginLeft: 10,
        color: '#000',
    },
    qrSection: {
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#000',
        padding: 15,
    },
    qrLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    qrContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
    },
    qrImage: {
        width: 200,
        height: 200,
    },
    qrInstructions: {
        fontSize: 8,
        flex: 1,
    },
    qrInstructionLine: {
        marginBottom: 4,
        color: '#000',
    },
    notesList: {
        marginBottom: 10,
    },
    noteItem: {
        fontSize: 8,
        marginBottom: 3,
        marginLeft: 10,
        color: '#000',
    },
    techInfo: {
        fontSize: 7,
        marginBottom: 3,
        marginLeft: 10,
        color: '#000',
    },
});

// Pure component - no hooks needed (all QR codes pre-generated)
export const RecoveryPlanPDF = ({ share, threshold, numShares, chunks, qrImages, recoveryUrl = 'https://localhost.app' }) => {
    return (
        <Document>
            {/* Page 1: QR Codes */}
            <Page size="A4" style={styles.page}>
                <View style={styles.pageContent}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>MY RECOVERY PLAN — PIECE #{share.shareId}</Text>
                    </View>

                    {/* Warning Box */}
                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>!!! THIS IS MY LAST RECOVERY PLAN !!!</Text>
                        <Text style={styles.warningText}>This piece of my recovery plan must stay secret.</Text>
                        <Text style={styles.warningText}>Keep it safe and private. Never share with anyone else.</Text>
                    </View>

                    {/* Details Box */}
                    <View style={styles.detailsBox}>
                        <Text style={styles.detailsTitle}>MY RECOVERY PLAN DETAILS:</Text>
                        <Text style={styles.detailsLine}>This is piece {share.shareId} of {numShares}</Text>
                        <Text style={styles.detailsLine}>My recovery requires {threshold} pieces total to unlock</Text>
                        <Text style={styles.detailsLine}>This piece alone is worthless — it's mathematically secure</Text>
                        <Text style={styles.detailsLine}>
                            Created: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                        </Text>
                    </View>

                    {/* QR Codes */}
                    <Text style={styles.sectionTitle}>RECOVERY QR CODES:</Text>
                    <Text style={styles.detailsLine}>Total QR codes on this document: {chunks.length}</Text>

                    {qrImages.map((qrImage, index) => (
                        <View key={index} style={styles.qrSection} break={index > 0 && index % 2 === 0}>
                            <Text style={styles.qrLabel}>
                                QR CODE {index + 1} of {chunks.length}
                            </Text>
                            <View style={styles.qrContainer}>
                                <Image style={styles.qrImage} src={qrImage} />
                                <View style={styles.qrInstructions}>
                                    <Text style={styles.qrInstructionLine}>HOW TO SCAN:</Text>
                                    <Text style={styles.qrInstructionLine}>1. Open browser to {recoveryUrl}</Text>
                                    <Text style={styles.qrInstructionLine}>2. Click "Restore"</Text>
                                    <Text style={styles.qrInstructionLine}>3. Tap "Scan QR"</Text>
                                    <Text style={styles.qrInstructionLine}>4. Point at this code</Text>
                                    {chunks.length > 1 && (
                                        <Text style={styles.qrInstructionLine}>5. Repeat for all codes</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Footer - fixed at bottom */}
                <View style={styles.footer}>
                    <Text style={styles.footerLine}>My Last Recovery Plan</Text>
                    <Text style={styles.footerLine}>
                        Generated: {new Date().toLocaleDateString()} | Piece: {share.shareId} | Page 1/3
                    </Text>
                </View>
            </Page>

            {/* Page 2: Instructions */}
            <Page size="A4" style={styles.page}>
                <View style={styles.pageContent}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>HOW TO USE THIS PIECE</Text>
                    </View>

                    {/* Step 1 */}
                    <View style={styles.section}>
                        <Text style={styles.stepTitle}>Step 1: When I Need My Recovery Plan</Text>
                        <Text style={styles.stepText}>
                            Gather this piece and {threshold - 1} other pieces from the people I trust.
                        </Text>
                        <Text style={styles.stepText}>
                            I will have {numShares} pieces total. Any {threshold} of them are needed.
                        </Text>
                    </View>

                    {/* Step 2 */}
                    <View style={styles.section}>
                        <Text style={styles.stepTitle}>Step 2: Go To Recovery Tool</Text>
                        <Text style={styles.stepText}>Visit on a secure computer:</Text>
                        <Text style={styles.stepText}>  - Go to: {recoveryUrl}</Text>
                        <Text style={styles.stepText}>  - Click "Restore Secret"</Text>
                        <Text style={styles.stepText}>  - Use a trusted device (not public WiFi)</Text>
                    </View>

                    {/* Step 3 */}
                    <View style={styles.section}>
                        <Text style={styles.stepTitle}>Step 3: Combine All Pieces</Text>
                        <Text style={styles.stepText}>Scan or paste {threshold} pieces:</Text>
                        <Text style={styles.stepText}>  - Scan all QR codes from this piece</Text>
                        <Text style={styles.stepText}>  - OR copy-paste the text if scanning fails</Text>
                        <Text style={styles.stepText}>  - Repeat for each of the other pieces</Text>
                    </View>

                    {/* Step 4 */}
                    <View style={styles.section}>
                        <Text style={styles.stepTitle}>Step 4: Recover My Secret</Text>
                        <Text style={styles.stepText}>Click "Combine Shares"</Text>
                        <Text style={styles.stepText}>My original secret will be displayed</Text>
                    </View>

                    {/* Critical Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>⚠ CRITICAL INFORMATION</Text>
                        <View style={styles.notesList}>
                            <Text style={styles.noteItem}>
                                • I need exactly {threshold} pieces to unlock my secret
                            </Text>
                            <Text style={styles.noteItem}>• This piece alone is mathematically useless</Text>
                            <Text style={styles.noteItem}>• Each piece should be recovered from a trusted person</Text>
                            <Text style={styles.noteItem}>
                                • Never photograph, email, or digitally share this page
                            </Text>
                            <Text style={styles.noteItem}>
                                • Only store in a place you trust completely
                            </Text>
                            <Text style={styles.noteItem}>
                                • Use a secure device when recovering my secret
                            </Text>
                        </View>
                    </View>

                    {/* Technical Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>WHY THIS WORKS:</Text>
                        <Text style={styles.techInfo}>
                            My secret is protected by Shamir's Secret Sharing ({threshold} of {numShares})
                        </Text>
                        <Text style={styles.techInfo}>
                            No person can recover my secret from just one piece.
                        </Text>
                        <Text style={styles.techInfo}>
                            Only when combined do the pieces unlock my original secret.
                        </Text>
                    </View>
                </View>

                {/* Footer - fixed at bottom */}
                <View style={styles.footer}>
                    <Text style={styles.footerLine}>My Last Recovery Plan</Text>
                    <Text style={styles.footerLine}>
                        Generated: {new Date().toLocaleDateString()} | Piece: {share.shareId} | Page 2/3
                    </Text>
                </View>
            </Page>

            {/* Page 3: Manual Recovery */}
            <Page size="A4" style={styles.page}>
                <View style={styles.pageContent}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>MANUAL RECOVERY (Offline Backup)</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>If {recoveryUrl} is unavailable:</Text>
                        <Text style={styles.stepText}>Open your browser console and paste this code to recover manually.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>⚠ IMPORTANT:</Text>
                        <Text style={styles.stepText}>• Order doesn't matter — any {threshold} pieces work</Text>
                        <Text style={styles.stepText}>• Can use pieces from any of my {numShares} recipients</Text>
                        <Text style={styles.stepText}>• Only the {threshold} threshold pieces are needed</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>MANUAL RECOVERY CODE:</Text>
                        <View style={{ backgroundColor: '#f5f5f5', padding: 10, marginTop: 8, borderRadius: 4 }}>
                            <Text style={{ fontSize: 4.5, fontFamily: 'Courier', color: '#000', lineHeight: 1.2, wordWrap: 'break-word' }}>
                                {`(async()=>{
  await Promise.all([
    new Promise(r=>{let s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/secrets.js-grempe@2.0.0/secrets.min.js';
      s.onload=r;document.head.append(s)}),
    new Promise(r=>{let s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako_inflate.min.js';
      s.onload=r;document.head.append(s)})
  ]);
  
  console.log('✅ Ready! Use: recover(["share1", "share2", "share3"])');
  
  window.recover = function(shares) {
    const hex = shares.map(s => {
      let h = Array.from(atob(s.slice(1)), c => 
        c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
      return s[0]==='O' ? h.slice(0,-1) : h;
    });
    
    const combined = secrets.combine(hex);
    const bytes = new Uint8Array(combined.match(/.{2}/g).map(b=>parseInt(b,16)));
    const text = pako.inflate(bytes, {to: 'string'});
    
    const [checksum, ...parts] = text.split('|');
    console.log('SECRET:', parts.join('|'));
    console.log('Checksum:', checksum);
    return parts.join('|');
  };
})();
`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>RECOVERY STEPS:</Text>
                        <Text style={{ fontSize: 7, marginBottom: 3, marginLeft: 10, color: '#000' }}>
                            1. Open any browser on a trusted device
                        </Text>
                        <Text style={{ fontSize: 7, marginBottom: 3, marginLeft: 10, color: '#000' }}>
                            2. Press F12 or Ctrl+Shift+I to open developer console
                        </Text>
                        <Text style={{ fontSize: 7, marginBottom: 3, marginLeft: 10, color: '#000' }}>
                            3. Paste the code above into the console
                        </Text>
                        <Text style={{ fontSize: 7, marginBottom: 3, marginLeft: 10, color: '#000' }}>
                            4. Call: recover(["piece1", "piece2", "piece3"])
                        </Text>
                        <Text style={{ fontSize: 7, marginBottom: 3, marginLeft: 10, color: '#000' }}>
                            5. Your secret appears in the console
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>SAFETY REMINDERS:</Text>
                        <Text style={styles.stepText}>• Use ONLY on a device you fully trust</Text>
                        <Text style={styles.stepText}>• Close the browser after recovery</Text>
                        <Text style={styles.stepText}>• Never store the recovered secret digitally</Text>
                        <Text style={styles.stepText}>• Your secret is everything — protect it</Text>
                    </View>
                </View>

                {/* Footer - fixed at bottom */}
                <View style={styles.footer}>
                    <Text style={styles.footerLine}>My Last Recovery Plan</Text>
                    <Text style={styles.footerLine}>
                        Generated: {new Date().toLocaleDateString()} | Piece: {share.shareId} | Page 3/3
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

RecoveryPlanPDF.displayName = 'RecoveryPlanPDF';
