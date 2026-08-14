import JsBarcode from 'jsbarcode';

export function generateBarcodeDataURL(
  text: string,
  format: string = 'EAN13',
  options: { width?: number; height?: number; displayValue?: boolean } = {}
): string {
  try {
    const canvas = document.createElement('canvas');
    let jsFormat = format.toUpperCase().replace('-', '');
    if (jsFormat === 'EAN13') jsFormat = 'EAN13';
    else if (jsFormat === 'EAN8') jsFormat = 'EAN8';
    else if (jsFormat === 'UPCA') jsFormat = 'UPC';
    else if (jsFormat === 'UPCE') jsFormat = 'UPC';
    else if (jsFormat === 'CODE39') jsFormat = 'CODE39';
    else if (jsFormat === 'CODE128') jsFormat = 'CODE128';
    else jsFormat = 'CODE128';

    JsBarcode(canvas, text, {
      format: jsFormat,
      width: options.width || 2,
      height: options.height || 80,
      displayValue: options.displayValue !== false,
      background: '#FFFFFF',
      lineColor: '#000000',
      margin: 10,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    // Fallback to generic CODE128 if format formatting fails
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: options.width || 2,
        height: options.height || 80,
        displayValue: options.displayValue !== false,
        background: '#FFFFFF',
        lineColor: '#000000',
        margin: 10,
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}

export function generateBarcodeSVGString(
  text: string,
  format: string = 'EAN13'
): string {
  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let jsFormat = format.toUpperCase().replace('-', '');
    if (jsFormat === 'EAN13') jsFormat = 'EAN13';
    else if (jsFormat === 'EAN8') jsFormat = 'EAN8';
    else if (jsFormat === 'UPCA') jsFormat = 'UPC';
    else if (jsFormat === 'CODE39') jsFormat = 'CODE39';
    else jsFormat = 'CODE128';

    JsBarcode(svgNode, text, {
      format: jsFormat,
      width: 2,
      height: 80,
      displayValue: true,
      background: '#FFFFFF',
      lineColor: '#000000',
      margin: 10,
    });
    return new XMLSerializer().serializeToString(svgNode);
  } catch {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="10" y="40">${text}</text></svg>`;
  }
}

export function validateEAN13(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(ean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(ean[12], 10);
}
