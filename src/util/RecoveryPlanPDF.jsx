import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingBottom: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000',
  },

  // Headers and Titles
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 5,
  },

  // Dividers
  titleDivider: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    marginBottom: 10,
    paddingBottom: 3,
  },

  // Warning Box
  warningBox: {
    borderWidth: 3,
    borderColor: '#000',
    padding: 10,
    marginBottom: 12,
    marginTop: 5,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  warningText: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // Details Box
  detailsBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailsLine: {
    fontSize: 9,
    marginBottom: 4,
    paddingLeft: 10,
  },

  // QR Section
  qrSection: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  qrImage: {
    width: 140,
    height: 140,
    border: '2px solid #000',
  },
  qrInstructions: {
    flex: 1,
    paddingLeft: 8,
  },
  qrInstructionLine: {
    fontSize: 8,
    marginBottom: 4,
    lineHeight: 1.4,
  },

  // Steps
  stepContainer: {
    marginBottom: 10,
    paddingLeft: 5,
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stepText: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 10,
    lineHeight: 1.4,
  },

  // Lists
  bulletPoint: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 12,
    lineHeight: 1.4,
  },

  // Code Box
  codeBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginTop: 5,
    marginBottom: 5,
    backgroundColor: '#f5f5f5',
  },
  codeText: {
    fontSize: 10,
    fontFamily: 'Courier',
    lineHeight: 1.3,
  },

  // Plain Text Box
  plainTextBox: {
    marginTop: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  plainTextTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },

  // Info Boxes
  infoBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  criticalBox: {
    borderWidth: 2,
    borderColor: '#000',
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    fontSize: 7,
    textAlign: 'center',
    marginTop: 10,
  },
});

export const RecoveryPlanPDF = ({
  share,
  threshold,
  numShares,
  chunks,
  qrImages,
  recoveryUrl = 'https://localhost.app',
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* COVER PAGE */}
        <View style={styles.titleDivider}>
          <Text style={styles.mainTitle}>RECOVERY PLAN — PIECE #{share.shareId}</Text>
        </View>

        <View style={styles.warningBox} wrap={false}>
          <Text style={styles.warningTitle}>⚠ CONFIDENTIAL DOCUMENT ⚠</Text>
          <Text style={styles.warningText}>This recovery piece must remain absolutely secret.</Text>
          <Text style={styles.warningText}>
            Keep it secure and private. Never share with anyone.
          </Text>
          <Text style={styles.warningText}>
            This piece alone cannot unlock your secret — it is cryptographically protected.
          </Text>
        </View>

        <View style={styles.detailsBox} wrap={false}>
          <Text style={styles.detailsTitle}>RECOVERY PLAN DETAILS</Text>
          <Text style={styles.detailsLine}>
            • Piece Number: {share.shareId} of {numShares}
          </Text>
          <Text style={styles.detailsLine}>
            • Required Pieces: {threshold} (any {threshold} of {numShares})
          </Text>
          <Text style={styles.detailsLine}>• Security: Shamir's Secret Sharing Algorithm</Text>
          <Text style={styles.detailsLine}>
            • Generated: {currentDate} at {currentTime}
          </Text>
          <Text style={styles.detailsLine}>
            • QR Codes: {chunks.length} code{chunks.length > 1 ? 's' : ''} in this document
          </Text>
        </View>

        {/* QR CODES SECTION */}
        <View style={styles.titleDivider}>
          <Text style={styles.sectionTitle}>QR Codes for Quick Recovery</Text>
        </View>

        <Text style={styles.subsectionTitle}>Scan these codes to recover your secret quickly:</Text>

        {qrImages.map((qrImage, index) => (
          <View key={index} style={styles.qrSection} wrap={false}>
            <Text style={styles.qrLabel}>
              QR CODE {index + 1} OF {chunks.length}
            </Text>
            <View style={styles.qrContainer}>
              <Image style={styles.qrImage} src={qrImage} />
              <View style={styles.qrInstructions}>
                <Text
                  style={{
                    ...styles.qrInstructionLine,
                    fontWeight: 'bold',
                    fontSize: 8,
                    marginBottom: 4,
                  }}
                >
                  HOW TO SCAN:
                </Text>
                <Text style={styles.qrInstructionLine}>1. Navigate to {recoveryUrl}</Text>
                <Text style={styles.qrInstructionLine}>2. Click "Restore Secret"</Text>
                <Text style={styles.qrInstructionLine}>3. Select "Scan QR Code"</Text>
                <Text style={styles.qrInstructionLine}>4. Point camera at this code</Text>
                {chunks.length > 1 && (
                  <Text style={styles.qrInstructionLine}>
                    5. Repeat for all {chunks.length} codes
                  </Text>
                )}
                <Text style={styles.qrInstructionLine}>
                  6. Scan codes from {threshold - 1} other pieces
                </Text>
                <Text style={styles.qrInstructionLine}>7. Click "Combine Shares"</Text>
              </View>
            </View>
          </View>
        ))}

        {/* INSTRUCTIONS PAGE */}
        <View break>
          <View style={styles.titleDivider}>
            <Text style={styles.sectionTitle}>Recovery Instructions</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 1: Gather Required Pieces</Text>
            <Text style={styles.stepText}>
              • Collect this piece (#{share.shareId}) and {threshold - 1} other piece
              {threshold - 1 > 1 ? 's' : ''} from trusted individuals
            </Text>
            <Text style={styles.stepText}>
              • You have {numShares} total pieces — any {threshold} will work
            </Text>
            <Text style={styles.stepText}>
              • Each piece should come from a different trusted person
            </Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 2: Access Recovery Tool</Text>
            <Text style={styles.stepText}>
              • Use a secure, trusted device (avoid public computers or WiFi)
            </Text>
            <Text style={styles.stepText}>• Navigate to: {recoveryUrl}</Text>
            <Text style={styles.stepText}>• Click "Restore Secret" button</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 3: Input All Pieces</Text>
            <Text style={styles.stepText}>
              • Scan all QR codes from this piece (all {chunks.length} code
              {chunks.length > 1 ? 's' : ''})
            </Text>
            <Text style={styles.stepText}>
              • If scanning fails, use the plain text at the end of this document
            </Text>
            <Text style={styles.stepText}>• Repeat for all {threshold} pieces you've gathered</Text>
            <Text style={styles.stepText}>
              • Order doesn't matter — pieces can be combined in any sequence
            </Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 4: Recover Your Secret</Text>
            <Text style={styles.stepText}>• Click "Combine Shares" button</Text>
            <Text style={styles.stepText}>• Your original secret will be displayed</Text>
            <Text style={styles.stepText}>
              • Write it down immediately — don't rely on screenshots
            </Text>
            <Text style={styles.stepText}>• Close the browser when finished</Text>
          </View>

          <View style={styles.criticalBox} wrap={false}>
            <Text style={styles.subsectionTitle}>⚠ CRITICAL SECURITY REMINDERS</Text>
            <Text style={styles.bulletPoint}>
              • Exactly {threshold} pieces needed — no more, no less
            </Text>
            <Text style={styles.bulletPoint}>• This piece alone is mathematically useless</Text>
            <Text style={styles.bulletPoint}>
              • Never photograph or digitally share this document
            </Text>
            <Text style={styles.bulletPoint}>• Store in a secure, trusted location</Text>
            <Text style={styles.bulletPoint}>• Use secure devices only during recovery</Text>
            <Text style={styles.bulletPoint}>
              • Each piece holder should maintain confidentiality
            </Text>
          </View>

          <View style={styles.infoBox} wrap={false}>
            <Text style={styles.subsectionTitle}>HOW THIS WORKS</Text>
            <Text style={styles.bulletPoint}>
              Your secret is protected using Shamir's Secret Sharing ({threshold}-of-{numShares}{' '}
              scheme)
            </Text>
            <Text style={styles.bulletPoint}>
              Each piece is mathematically generated from your secret
            </Text>
            <Text style={styles.bulletPoint}>
              No single piece reveals any information about the secret
            </Text>
            <Text style={styles.bulletPoint}>
              Only when {threshold} pieces are combined can the original secret be reconstructed
            </Text>
            <Text style={styles.bulletPoint}>
              This is cryptographically secure — even with {threshold - 1} pieces, recovery is
              impossible
            </Text>
          </View>
        </View>

        {/* MANUAL RECOVERY PAGE */}
        <View break>
          <View style={styles.titleDivider}>
            <Text style={styles.sectionTitle}>Manual Recovery Method</Text>
          </View>

          <Text style={styles.subsectionTitle}>
            Use this method if {recoveryUrl} is unavailable:
          </Text>

          <View style={styles.infoBox} wrap={false}>
            <Text style={styles.stepTitle}>PREREQUISITES:</Text>
            <Text style={styles.bulletPoint}>
              • Any modern web browser (Chrome, Firefox, Safari, Edge)
            </Text>
            <Text style={styles.bulletPoint}>
              • {threshold} recovery pieces (including this one)
            </Text>
            <Text style={styles.bulletPoint}>• Secure, trusted device</Text>
            <Text style={styles.bulletPoint}>• Internet connection (to load libraries)</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>RECOVERY PROCEDURE:</Text>
            <Text style={styles.stepText}>1. Open a browser on your trusted device</Text>
            <Text style={styles.stepText}>
              2. Press F12 (Windows) or Cmd+Option+I (Mac) to open Developer Console
            </Text>
            <Text style={styles.stepText}>3. Click the "Console" tab</Text>
            <Text style={styles.stepText}>4. Copy and paste the code below into the console</Text>
            <Text style={styles.stepText}>5. Press Enter — wait for "✅ Ready!" message</Text>
            <Text style={styles.stepText}>6. Type: recover(["piece1", "piece2", "piece3"])</Text>
            <Text style={styles.stepText}>
              7. Replace piece1, piece2, etc. with your actual share texts
            </Text>
            <Text style={styles.stepText}>8. Your secret will appear in the console</Text>
          </View>

          <View style={styles.codeBox} wrap={false}>
            <Text style={styles.codeText}>
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
})();`}
            </Text>
          </View>

          <View style={styles.criticalBox} wrap={false}>
            <Text style={styles.subsectionTitle}>SECURITY WARNINGS FOR MANUAL RECOVERY:</Text>
            <Text style={styles.bulletPoint}>• Only use on fully trusted devices</Text>
            <Text style={styles.bulletPoint}>• Ensure you're alone and not being observed</Text>
            <Text style={styles.bulletPoint}>• Close all other applications</Text>
            <Text style={styles.bulletPoint}>• Clear browser history after recovery</Text>
            <Text style={styles.bulletPoint}>• Never store the recovered secret digitally</Text>
            <Text style={styles.bulletPoint}>• Write it down on paper instead</Text>
          </View>
        </View>

        {/* PLAIN TEXT PAGE */}
        <View>
          <View style={styles.titleDivider}>
            <Text style={styles.sectionTitle}>Plain Text Share</Text>
          </View>

          <View style={styles.plainTextBox} wrap={false}>
            <Text style={styles.plainTextTitle}>USE IF QR SCANNING FAILS</Text>
            <Text style={styles.stepText}>
              If you cannot scan the QR codes, copy the entire text below and paste it into the
              recovery tool:
            </Text>
            <View style={styles.codeBox}>
              {share.data.match(/.{1,80}/g)?.map((line, idx) => (
                <Text key={idx} style={styles.codeText}>
                  {line}
                </Text>
              ))}
            </View>
            <Text style={{ ...styles.stepText, marginTop: 6, fontWeight: 'bold' }}>
              ⚠ Copy the ENTIRE text above — missing even one character will prevent recovery
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.subsectionTitle}>ABOUT THIS TEXT:</Text>
            <Text style={styles.bulletPoint}>
              • This is your complete recovery piece in text form
            </Text>
            <Text style={styles.bulletPoint}>• It contains the same data as the QR codes</Text>
            <Text style={styles.bulletPoint}>• Copy it completely — do not modify or trim it</Text>
            <Text style={styles.bulletPoint}>• Use this if QR scanning is unavailable</Text>
          </View>

          <View style={styles.criticalBox}>
            <Text style={styles.subsectionTitle}>FINAL REMINDERS:</Text>
            <Text style={styles.bulletPoint}>• Store this document in a secure location</Text>
            <Text style={styles.bulletPoint}>
              • Tell your trusted contacts where to find their pieces
            </Text>
            <Text style={styles.bulletPoint}>• Test the recovery process before you need it</Text>
            <Text style={styles.bulletPoint}>
              • Keep multiple backup copies in different locations
            </Text>
            <Text style={styles.bulletPoint}>
              • Review this plan annually to ensure it remains valid
            </Text>
          </View>
        </View>

        {/* FOOTER - fixed at bottom of every page */}
        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 8, textAlign: 'center', marginBottom: 2 }}>
            My Last Resort — Recovery Plan
          </Text>
          <Text
            style={{ fontSize: 8, textAlign: 'center' }}
            render={({ pageNumber, totalPages }) =>
              `Piece #${share.shareId} | Page ${pageNumber}/${totalPages} | ${currentDate}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

RecoveryPlanPDF.displayName = 'RecoveryPlanPDF';
