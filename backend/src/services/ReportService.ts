// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinterModule = require('pdfmake/js/Printer');
const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;
import { ProxmoxService } from './ProxmoxService';
import { ProjectService } from './ProjectService';
import { HealthCheckService } from './HealthCheckService';
import { AlertService } from './AlertService';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import path from 'path';

export class ReportService {
    private proxmoxService: ProxmoxService;
    private projectService: ProjectService;
    private healthCheckService: HealthCheckService;
    private alertService: AlertService;
    private printer: any; // Using any to bypass strict type checking for now

    constructor(
        proxmoxService: ProxmoxService,
        projectService: ProjectService,
        healthCheckService: HealthCheckService,
        alertService: AlertService
    ) {
        this.proxmoxService = proxmoxService;
        this.projectService = projectService;
        this.healthCheckService = healthCheckService;
        this.alertService = alertService;

        // Define fonts
        // In a real env, you'd point to actual font files.
        // For now, we'll try to use standard fonts if possible, or mapping to a known font.
        // PdfMake requires font files defined.
        // A trick is to use 'Courier' or 'Helvetica' which are standard, but PdfMake usually wants files.
        // We'll use a basic setup. If this fails, we might need to download fonts or use a different lib.
        // Let's assume we have Roboto available or will error out.
        // Actually, getting fonts working in Node backend with PdfMake can be tricky without the files.
        // Let's assume standard fonts are present in the package or we use a virtual file system.

        const fonts = {
            Roboto: {
                normal: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
                bold: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
                italics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
                bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
            },
        };

        try {
            this.printer = new PdfPrinter(fonts);
        } catch (error) {
            console.error('Failed to initialize PdfPrinter:', error);
            // Fallback or leave printer undefined, handled in generate method
            this.printer = null;
        }
    }

    async generateInfrastructureReport(): Promise<Buffer> {
        if (!this.printer) {
            throw new Error('PDF Generation service is not available (initialization failed)');
        }

        // 1. Collect Data
        // 1. Collect Data with specific error handling
        let vms, nodes, projects, alerts, systemHealth;

        try {
            vms = await this.proxmoxService.getAllVMs();
        } catch (e: any) { throw new Error(`Proxmox VMs failed: ${e.message}`); }

        try {
            nodes = await this.proxmoxService.getNodes();
        } catch (e: any) { throw new Error(`Proxmox Nodes failed: ${e.message}`); }

        try {
            projects = await this.projectService.getAllProjectsAdmin();
        } catch (e: any) { throw new Error(`Project Service failed: ${e.message}`); }

        try {
            alerts = await this.alertService.getActiveAlerts();
        } catch (e: any) { throw new Error(`Alert Service failed: ${e.message}`); }

        try {
            systemHealth = await this.healthCheckService.getSystemStats();
        } catch (e: any) { throw new Error(`Health Service failed: ${e.message}`); }

        // 2. Define PDF Document
        const docDefinition: TDocumentDefinitions = {
            content: [
                { text: 'Infrastructure Status Report', style: 'header' },
                { text: `Generated on: ${new Date().toLocaleString()}`, style: 'subheader' },

                { text: '\n' },

                // System Health
                { text: 'System Health', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['*', '*'],
                        body: [
                            ['CPU Load', `${systemHealth.cpu.load.toFixed(1)}%`],
                            ['Memory Usage', `${systemHealth.memory.percentage.toFixed(1)}% (${(systemHealth.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB)`],
                            ['Uptime', `${(systemHealth.uptime / 3600).toFixed(1)} hours`],
                            ['Active Alerts', `${alerts.length}`],
                        ],
                    },
                },

                { text: '\n' },

                // Proxmox Cluster
                { text: 'Proxmox Cluster', style: 'sectionHeader' },
                { text: `Nodes: ${nodes.length} | VMs: ${vms.length}` },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto'],
                        body: [
                            [{ text: 'ID', style: 'tableHeader' }, { text: 'Name', style: 'tableHeader' }, { text: 'Status', style: 'tableHeader' }, { text: 'Node', style: 'tableHeader' }],
                            ...vms.map(vm => [
                                vm.vmid,
                                vm.name,
                                vm.status,
                                vm.node
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },

                { text: '\n' },

                // Projects
                { text: 'Projects', style: 'sectionHeader' },
                {
                    ul: projects.map(p => `${p.name} - ${p.description || 'No description'}`)
                }
            ],
            styles: {
                header: {
                    fontSize: 22,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                },
                subheader: {
                    fontSize: 12,
                    alignment: 'center',
                    color: 'gray'
                },
                sectionHeader: {
                    fontSize: 16,
                    bold: true,
                    margin: [0, 10, 0, 5],
                    decoration: 'underline'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'black'
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        // 3. Create PDF
        // 3. Create PDF
        return new Promise(async (resolve, reject) => {
            const chunks: any[] = [];
            try {
                const pdfDoc = await this.printer.createPdfKitDocument(docDefinition);

                pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err: any) => reject(err));

                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
