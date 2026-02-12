const pdfmake = require('pdfmake');
console.log('Type of pdfmake:', typeof pdfmake);
console.log('Keys of pdfmake:', Object.keys(pdfmake));
console.log('Is constructor?', typeof pdfmake === 'function' && !!pdfmake.prototype && !!pdfmake.prototype.constructor.name);
try {
    new pdfmake({});
    console.log('Successfully instantiated via new pdfmake()');
} catch (e) {
    console.log('Failed new pdfmake():', e.message);
}
