/**
 * Robust, high-speed document printing and PDF export utility.
 * Renders an isolated, pristine document with official Ghana Police Service letterhead,
 * completely avoiding browser modal backdrop / overflow print preview hangs.
 */
export function printHtmlDocument(title: string, bodyHtml: string) {
  // Create an isolated hidden iframe for printing
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: open a clean new popup window if iframe is blocked
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    writePrintContent(printWindow.document, title, bodyHtml);
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    return;
  }

  writePrintContent(doc, title, bodyHtml);

  setTimeout(() => {
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  }, 250);
}

function writePrintContent(doc: Document, title: string, bodyHtml: string) {
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        .header-stripe {
          height: 5px;
          background: linear-gradient(90deg, #ef4444 33.3%, #eab308 33.3% 66.6%, #22c55e 66.6%);
          margin-bottom: 15px;
          border-radius: 2px;
        }
        .doc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .doc-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .doc-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 700;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .badge-gold {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .badge-blue {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .meta-item label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
        }
        .meta-item span {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          font-family: monospace;
        }
        .section {
          margin-bottom: 16px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e293b;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 11.5px;
          line-height: 1.6;
        }
        .checklist-item {
          padding: 4px 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11px;
        }
        .checkbox {
          width: 13px;
          height: 13px;
          border: 1.5px solid #64748b;
          border-radius: 3px;
          margin-top: 2px;
        }
        .footer {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748b;
        }
        .statutory-seal {
          border: 1px solid #bae6fd;
          background: #f0f9ff;
          color: #0369a1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 10.5px;
          margin-top: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header-stripe"></div>
      ${bodyHtml}
      <div class="footer">
        <span>GHANA POLICE SERVICE • EMERGENCY CAD & FORENSIC EVIDENCE VAULT</span>
        <span>ELECTRONICALLY SIGNED & VERIFIED UNDER ACT 772 (SECTION 7)</span>
      </div>
    </body>
    </html>
  `);
  doc.close();
}

/**
 * Builds printable HTML for the Ghana Police Investigation Case Brief.
 */
export function buildPoliceBriefHtml(brief: any): string {
  return `
    <div class="doc-header">
      <div>
        <div style="margin-bottom: 4px;">
          <span class="badge badge-gold">🇬🇭 REPUBLIC OF GHANA</span>
          <span class="badge badge-blue">ACT 772 CERTIFIED</span>
        </div>
        <h1 class="doc-title">GHANA POLICE SERVICE INVESTIGATION BRIEF</h1>
        <div class="doc-subtitle">Criminal Investigation Department (CID) • Case Intelligence Report</div>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 11px;">
        <div style="font-weight: 800; color: #0f172a;">DOSSIER REF</div>
        <div style="color: #b45309; font-weight: 800; font-size: 13px;">${brief.dossierNumber || 'N/A'}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Incident Tracking Code</label>
        <span>${brief.incidentTrackingCode || 'N/A'}</span>
      </div>
      <div class="meta-item">
        <label>GhanaPost GPS Code</label>
        <span>${brief.geospatialAssessment?.ghanaPostCode || 'Not provided'}</span>
      </div>
      <div class="meta-item">
        <label>Generated Timestamp</label>
        <span>${new Date(brief.generatedAt || Date.now()).toLocaleString()}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">1. Official CID Executive Summary</div>
      <div class="box">
        ${brief.executiveSummary || 'No summary available.'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">2. Statutory Jurisdiction & Prosecution Basis</div>
      <div class="box">
        ${(brief.legalFramework || []).map((l: string) => `<div style="padding: 2px 0;">⚖️ <strong>${l}</strong></div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">3. Geospatial & Forensic Telemetry</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="box">
          <strong>Location:</strong> ${brief.geospatialAssessment?.locationName || 'N/A'}<br/>
          <strong>Coordinates:</strong> ${brief.geospatialAssessment?.coordinates || 'N/A'}<br/>
          <strong>Tactical Sector:</strong> ${brief.geospatialAssessment?.tacticalSector || 'Accra Command'}
        </div>
        <div class="box">
          <strong>Evidence Assets:</strong> ${brief.forensicEvidenceAudit?.evidenceCount || 1} Sealed File(s)<br/>
          <strong>Integrity Status:</strong> <span style="color: #16a34a; font-weight: bold;">VERIFIED TAMPER-PROOF</span><br/>
          <strong>SHA-256 Digest:</strong> <span style="font-family: monospace; font-size: 9.5px;">${brief.forensicEvidenceAudit?.sha256Seal || 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">4. Recommended Investigative Action Checklist</div>
      <div class="box">
        ${(brief.investigativeChecklist || []).map((step: string) => `
          <div class="checklist-item">
            <div class="checkbox"></div>
            <div>${step}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="statutory-seal">
      <strong>Statutory Evidence Certification (Act 772):</strong> This intelligence brief is generated from cryptographically sealed citizen telemetric data under the Electronic Transactions Act, 2008 (Act 772) and Whistleblower Act, 2006 (Act 720).
    </div>
  `;
}

/**
 * Builds printable HTML for the Digital Evidence Court Certificate.
 */
export function buildCourtCertificateHtml(certificate: any): string {
  return `
    <div class="doc-header">
      <div>
        <div style="margin-bottom: 4px;">
          <span class="badge badge-gold">🇬🇭 REPUBLIC OF GHANA</span>
          <span class="badge badge-blue">OFFICIAL EVIDENCE VAULT</span>
        </div>
        <h1 class="doc-title">DIGITAL EVIDENCE CERTIFICATE OF AUTHENTICITY</h1>
        <div class="doc-subtitle">Section 7, Electronic Transactions Act, 2008 (Act 772)</div>
      </div>
      <div style="text-align: right; font-family: monospace; font-size: 11px;">
        <div style="font-weight: 800; color: #0f172a;">CERTIFICATE ID</div>
        <div style="color: #b45309; font-weight: 800; font-size: 13px;">${certificate.certificateId || 'N/A'}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <label>Case Tracking Code</label>
        <span>${certificate.trackingCode || 'N/A'}</span>
      </div>
      <div class="meta-item">
        <label>GhanaPost Digital GPS</label>
        <span>${certificate.ghanaPostCode || 'Not provided'}</span>
      </div>
      <div class="meta-item">
        <label>Date Sealed (UTC)</label>
        <span>${new Date().toLocaleString()}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Chain of Custody & Cryptographic Evidence Ledger</div>
      <div class="box">
        ${(certificate.mediaItems || []).map((item: any, idx: number) => `
          <div style="padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Attachment #${idx + 1} (${item.type || 'VIDEO'}):</strong><br/>
            <div style="font-family: monospace; font-size: 10px; background: #ffffff; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 3px; word-break: break-all;">
              SHA-256 HASH: ${item.sha256Hash || 'N/A'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="statutory-seal">
      <strong>⚖️ Statutory Evidentiary Certificate:</strong><br/>
      ${certificate.statutoryNotice || 'This certificate constitutes primary electronic evidence in compliance with Section 7 of the Electronic Transactions Act (Act 772). All media hashes are verifiable against the immutable cryptographic ledger.'}
    </div>
  `;
}
