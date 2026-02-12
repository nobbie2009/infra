try {
    const printerModule = require('pdfmake/js/Printer');
    console.log('printerModule keys:', Object.keys(printerModule));
    const PdfPrinter = printerModule.default || printerModule;
    console.log('Is PdfPrinter a constructor?', typeof PdfPrinter === 'function');

    // Try instantiation
    const fonts = {
        Roboto: {
            normal: 'fonts/Roboto-Regular.ttf',
            bold: 'fonts/Roboto-Medium.ttf',
            italics: 'fonts/Roboto-Italic.ttf',
            bolditalics: 'fonts/Roboto-MediumItalic.ttf'
        }
    };
    new PdfPrinter(fonts);
    console.log('Successfully instantiated PdfPrinter');
} catch (e) {
    console.error('Error:', e);
}
