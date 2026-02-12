import { Repository } from 'typeorm';
import { Feature, FeatureStatus, FeaturePriority } from '../entities/Feature.entity';

export class FeatureService {
    constructor(private featureRepository: Repository<Feature>) { }

    async create(data: Partial<Feature> & { projectId: string }): Promise<Feature> {
        const feature = this.featureRepository.create(data);
        return await this.featureRepository.save(feature);
    }

    async findAllByProject(projectId: string): Promise<Feature[]> {
        return await this.featureRepository.find({
            where: { projectId },
            order: { created_at: 'ASC' },
            relations: ['assignee'],
        });
    }

    async findOne(id: string): Promise<Feature | null> {
        return await this.featureRepository.findOne({
            where: { id },
            relations: ['project', 'assignee'],
        });
    }

    async update(id: string, data: Partial<Feature>): Promise<Feature | null> {
        await this.featureRepository.update(id, data);
        return this.findOne(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.featureRepository.delete(id);
        return result.affected ? result.affected > 0 : false;
    }

    async updateStatus(id: string, status: FeatureStatus): Promise<Feature | null> {
        return await this.update(id, { status });
    }
}
