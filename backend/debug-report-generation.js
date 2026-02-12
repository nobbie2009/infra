const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinterModule = require('pdfmake/js/Printer');
const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;

async function testReportGeneration() {
    console.log('Testing PDF Generation...');

    try {
        const fonts = {
            Roboto: {
                normal: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
                bold: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
                italics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
                bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
            },
        };

        console.log('Fonts configuration:', JSON.stringify(fonts, null, 2));

        const printer = new PdfPrinter(fonts);
        console.log('Printer initialized successfully.');

        // Mock Data
        const vms = [
            { vmid: 100, name: 'test-vm-1', status: 'running', node: 'pve1' },
            { vmid: 101, name: 'test-vm-2', status: 'stopped', node: 'pve1' }
        ];
        const nodes = [
            { node: 'pve1', status: 'online', cpu: 0.1, mem: 0.5, disk: 0.2 }
        ];
        const projects = [
            { name: 'Project A', description: 'Test Project' }
        ];
        const alerts = [];
        const systemHealth = {
            cpu: { load: 10 },
            memory: { percentage: 50, used: 8 * 1024 * 1024 * 1024 },
            uptime: 3600
        };

        console.log('Defining document...');

        const docDefinition = {
            content: [
                { text: 'Infrastructure Status Report', style: 'header' },
                { text: `Generated on: ${new Date().toLocaleString()}`, style: 'subheader' },
                { text: '\n' },
                { text: 'System Health', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['*', '*'],
                        body: [
                            ['CPU Load', `${systemHealth.cpu.load.toFixed(1)}%`],
                            ['Memory Usage', `${systemHealth.memory.percentage.toFixed(1)}%`],
                        ],
                    },
                }
            ],
            styles: {
                header: { fontSize: 22, bold: true },
                subheader: { fontSize: 12 },
                sectionHeader: { fontSize: 16, bold: true }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        console.log('Creating PDF...');

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);

        return new Promise((resolve, reject) => {
            const chunks = [];
            pdfDoc.on('data', (chunk) => chunks.push(chunk));
            pdfDoc.on('end', () => {
                const result = Buffer.concat(chunks);
                console.log(`PDF Generated successfully. Size: ${result.length} bytes`);
                resolve(result);
            });
            pdfDoc.on('error', (err) => {
                console.error('PDF Stream Error:', err);
                reject(err);
            });
            pdfDoc.end();
        });

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testReportGeneration();
