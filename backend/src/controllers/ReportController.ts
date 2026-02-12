import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
import logger from '../utils/logger';

export class ReportController {
    private reportService: ReportService;

    constructor(reportService: ReportService) {
        this.reportService = reportService;
    }

    async getInfrastructureSummary(req: Request, res: Response) {
        try {
            const pdfBuffer = await this.reportService.generateInfrastructureReport();

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="infrastructure-report.pdf"',
                'Content-Length': pdfBuffer.length,
            });

            res.send(pdfBuffer);
        } catch (error: any) {
            logger.error('Failed to generate report', { error });
            res.status(500).json({ success: false, message: 'Failed to generate report' });
        }
    }
}
