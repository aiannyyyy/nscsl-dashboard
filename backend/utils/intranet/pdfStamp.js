const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// ============================================
// STAMP IMAGE PATHS
// ============================================
const STAMPS_DIR = path.join(__dirname, '../assets/stamps');

const STAMP_IMAGE = {
  controlled_copy: path.join(STAMPS_DIR, 'controlled.png'),
  master:          path.join(STAMPS_DIR, 'master.png'),
  obsolete:        path.join(STAMPS_DIR, 'obsolete.png'),
};

// ============================================
// STAMP LAYOUT CONFIG
// Tweak these to reposition or resize the stamp.
// ============================================
const STAMP_CONFIG = {
  // Width of stamp as a fraction of page width (0.35 = 35% of page width)
  widthRatio: 0.15, 

  // Position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  position: 'bottom-right',

  // Margin from page edges in points (72 points = 1 inch)
  margin: 20,

  // Opacity: 1.0 = fully visible, 0.5 = semi-transparent
  // Use 1.0 for PNG with white background
  opacity: 1.0,
};

// ============================================
// HELPER: Calculate stamp position & size
// ============================================
function calculateStampDimensions(pageWidth, pageHeight, imgWidth, imgHeight) {
  // Scale stamp width to widthRatio of page, preserve aspect ratio
  const stampWidth  = pageWidth * STAMP_CONFIG.widthRatio;
  const stampHeight = stampWidth * (imgHeight / imgWidth);
  const margin      = STAMP_CONFIG.margin;

  let x, y;

  switch (STAMP_CONFIG.position) {
    case 'top-right':
      x = pageWidth - stampWidth - margin;
      y = pageHeight - stampHeight - margin;
      break;
    case 'top-left':
      x = margin;
      y = pageHeight - stampHeight - margin;
      break;
    case 'bottom-right':
      x = pageWidth - stampWidth - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = margin;
      break;
    case 'center':
      x = (pageWidth  - stampWidth)  / 2;
      y = (pageHeight - stampHeight) / 2;
      break;
    default:
      x = pageWidth - stampWidth - margin;
      y = pageHeight - stampHeight - margin;
  }

  return { x, y, width: stampWidth, height: stampHeight };
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Stamps a document control image onto a PDF.
 *
 * @param {Buffer} inputBuffer      - Raw PDF file buffer
 * @param {string} status           - 'controlled_copy' | 'master' | 'obsolete' | 'none'
 * @param {string} stampPlacement   - 'every_page' | 'first_page' (default: 'every_page')
 * @returns {Promise<Buffer>}       - Stamped PDF buffer (or original if status is 'none')
 */
async function stampPdf(inputBuffer, status, stampPlacement = 'every_page') {
  // No stamp needed
  if (!status || status === 'none' || !STAMP_IMAGE[status]) {
    console.log(`📄 pdfStamp: No stamp needed for status "${status}"`);
    return inputBuffer;
  }

  const imagePath = STAMP_IMAGE[status];

  // Safety check — make sure image file exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Stamp image not found at: ${imagePath}. Make sure the file exists in backend/assets/stamps/`);
  }

  console.log(`🔏 pdfStamp: Applying "${status}" stamp (${stampPlacement})...`);

  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(inputBuffer);

    // Embed the PNG stamp image once (reused across all pages)
    const stampImageBytes = fs.readFileSync(imagePath);
    const stampImage      = await pdfDoc.embedPng(stampImageBytes);
    const stampNativeSize = stampImage.size(); // { width, height } in pixels

    const pages = pdfDoc.getPages();
    console.log(`📄 pdfStamp: ${pages.length} page(s), placement: ${stampPlacement}`);

    // Stamp every page or just the first
    const pagesToStamp = stampPlacement === 'first_page' ? [pages[0]] : pages;

    for (const page of pagesToStamp) {
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const { x, y, width, height } = calculateStampDimensions(
        pageWidth,
        pageHeight,
        stampNativeSize.width,
        stampNativeSize.height
      );

      page.drawImage(stampImage, {
        x,
        y,
        width,
        height,
        opacity: STAMP_CONFIG.opacity,
      });
    }

    const stampedBytes  = await pdfDoc.save();
    const stampedBuffer = Buffer.from(stampedBytes);

    console.log(`✅ pdfStamp: Done. Output: ${stampedBuffer.length} bytes`);
    return stampedBuffer;

  } catch (error) {
    console.error(`❌ pdfStamp: Failed — ${error.message}`);
    throw new Error(`PDF stamp failed: ${error.message}`);
  }
}

// ============================================
// HELPER: Quick check before calling stampPdf
// ============================================
function requiresStamp(status) {
  return !!status && status !== 'none' && !!STAMP_IMAGE[status];
}

module.exports = { stampPdf, requiresStamp };