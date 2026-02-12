import { Repository, IsNull } from 'typeorm';
import { Alert, AlertStatus, AlertType, AlertSeverity } from '../entities/Alert.entity';
import logger from '../utils/logger';

export class AlertService {
    constructor(private alertRepository: Repository<Alert>) { }

    /**
     * Create a new alert if no active one with the same deduplication key exists
     */
    async createAlert(
        type: AlertType,
        severity: AlertSeverity,
        title: string,
        message: string,
        source: string,
        deduplicationKey?: string
    ): Promise<Alert | null> {
        try {
            const key = deduplicationKey || `${type}-${source}-${title}`;

            // Check for existing active alert
            const existing = await this.alertRepository.findOne({
                where: {
                    deduplication_key: key,
                    status: AlertStatus.ACTIVE // Or ACKNOWLEDGED? Usually we don't re-trigger if accked but not resolved
                }
            });

            if (existing) {
                // Determine if we should update timestamp or ignore
                // For now, logging that it was skipped
                logger.debug('Alert deduplicated', { key });
                return existing;
            }

            const alert = this.alertRepository.create({
                type,
                severity,
                title,
                message,
                source,
                deduplication_key: key,
                status: AlertStatus.ACTIVE
            });

            const savedAlert = await this.alertRepository.save(alert);
            logger.info('New Alert created', { id: savedAlert.id, title });

            // TODO: Trigger Notification (Email/Push) here

            return savedAlert;
        } catch (error) {
            logger.error('Failed to create alert', { error: String(error) });
            return null;
        }
    }

    /**
     * Get active alerts
     */
    async getActiveAlerts(): Promise<Alert[]> {
        return this.alertRepository.find({
            where: [
                { status: AlertStatus.ACTIVE },
                { status: AlertStatus.ACKNOWLEDGED }
            ],
            order: { created_at: 'DESC' }
        });
    }

    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(id: string, userId: string): Promise<Alert | null> {
        const alert = await this.alertRepository.findOne({ where: { id } });
        if (!alert) return null;

        if (alert.status === AlertStatus.RESOLVED) return alert;

        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.acknowledged_at = new Date();
        alert.acknowledged_by = userId;

        return this.alertRepository.save(alert);
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(id: string): Promise<Alert | null> {
        const alert = await this.alertRepository.findOne({ where: { id } });
        if (!alert) return null;

        alert.status = AlertStatus.RESOLVED;
        alert.resolved_at = new Date();

        return this.alertRepository.save(alert);
    }

    /**
     * Resolve alert by key (system auto-resolution)
     */
    async resolveAlertByKey(deduplicationKey: string): Promise<boolean> {
        const alert = await this.alertRepository.findOne({
            where: {
                deduplication_key: deduplicationKey,
                resolved_at: IsNull()
            }
        });

        if (alert) {
            alert.status = AlertStatus.RESOLVED;
            alert.resolved_at = new Date();
            await this.alertRepository.save(alert);
            logger.info('Alert auto-resolved', { id: alert.id, key: deduplicationKey });
            return true;
        }
        return false;
    }
}
