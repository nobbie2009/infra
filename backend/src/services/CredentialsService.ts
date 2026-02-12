import { Repository } from 'typeorm';
import { Credential, CredentialType } from '../entities/Credential.entity';
import { User } from '../entities/User.entity';
import { encrypt, decrypt, DecryptionInput } from '../utils/encryption.util';
import logger from '../utils/logger';

export interface CreateCredentialDto {
  name: string;
  type: CredentialType;
  value: string; // JSON string containing credential data
  description?: string;
}

export interface CredentialResponse {
  id: string;
  name: string;
  type: CredentialType;
  description?: string;
  created_at: Date;
  updated_at: Date;
  last_used?: Date;
}

export class CredentialsService {
  constructor(private credentialRepository: Repository<Credential>) {}

  /**
   * Create a new credential
   */
  async create(userId: string, dto: CreateCredentialDto): Promise<Credential> {
    try {
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        throw new Error('ENCRYPTION_MASTER_KEY not configured');
      }

      // Encrypt the credential value
      const { encrypted, iv, salt, authTag } = encrypt(dto.value, masterKey);

      // Create credential record
      const credential = this.credentialRepository.create({
        user_id: userId,
        name: dto.name,
        type: dto.type,
        encrypted_data: encrypted,
        iv,
        salt,
        auth_tag: authTag,
        description: dto.description,
        algorithm: 'aes-256-gcm-v1',
      });

      await this.credentialRepository.save(credential);

      logger.info(`Credential created: ${credential.name}`, {
        credentialId: credential.id,
        userId,
        type: dto.type,
      });

      return credential;
    } catch (error) {
      logger.error('Failed to create credential', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        type: dto.type,
      });
      throw error;
    }
  }

  /**
   * Get all credentials for a user
   */
  async findAll(userId: string): Promise<CredentialResponse[]> {
    try {
      const credentials = await this.credentialRepository.find({
        where: {
          user_id: userId,
          is_deleted: false,
        },
      });

      return credentials.map(this.toResponse);
    } catch (error) {
      logger.error('Failed to fetch credentials', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Get a single credential by ID
   */
  async findById(userId: string, credentialId: string): Promise<Credential | null> {
    try {
      const credential = await this.credentialRepository.findOne({
        where: {
          id: credentialId,
          user_id: userId,
          is_deleted: false,
        },
      });

      if (credential) {
        // Update last_used
        credential.last_used = new Date();
        await this.credentialRepository.save(credential);
      }

      return credential;
    } catch (error) {
      logger.error('Failed to fetch credential', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        credentialId,
      });
      throw error;
    }
  }

  /**
   * Decrypt credential value
   */
  async decrypt(credential: Credential): Promise<any> {
    try {
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        throw new Error('ENCRYPTION_MASTER_KEY not configured');
      }

      const decryptionInput: DecryptionInput = {
        encrypted: credential.encrypted_data,
        iv: credential.iv,
        salt: credential.salt,
        authTag: credential.auth_tag,
        masterKey,
      };

      const decrypted = decrypt(decryptionInput);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt credential', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credential.id,
      });
      throw new Error('Failed to decrypt credential. It may be corrupted or the master key may have changed.');
    }
  }

  /**
   * Update a credential
   */
  async update(
    userId: string,
    credentialId: string,
    dto: Partial<CreateCredentialDto>
  ): Promise<Credential> {
    try {
      const credential = await this.findById(userId, credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      // Update basic fields
      if (dto.name) credential.name = dto.name;
      if (dto.description !== undefined) credential.description = dto.description;

      // Re-encrypt if value is provided
      if (dto.value) {
        const masterKey = process.env.ENCRYPTION_MASTER_KEY;
        if (!masterKey) {
          throw new Error('ENCRYPTION_MASTER_KEY not configured');
        }

        const { encrypted, iv, salt, authTag } = encrypt(dto.value, masterKey);
        credential.encrypted_data = encrypted;
        credential.iv = iv;
        credential.salt = salt;
        credential.auth_tag = authTag;
      }

      credential.updated_at = new Date();
      await this.credentialRepository.save(credential);

      logger.info(`Credential updated: ${credential.name}`, {
        credentialId: credential.id,
        userId,
      });

      return credential;
    } catch (error) {
      logger.error('Failed to update credential', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        credentialId,
      });
      throw error;
    }
  }

  /**
   * Delete a credential (soft delete)
   */
  async delete(userId: string, credentialId: string): Promise<void> {
    try {
      const credential = await this.findById(userId, credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }

      credential.is_deleted = true;
      await this.credentialRepository.save(credential);

      logger.info(`Credential deleted: ${credential.name}`, {
        credentialId: credential.id,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete credential', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        credentialId,
      });
      throw error;
    }
  }

  /**
   * Find credentials by type for a user
   */
  async findByType(userId: string, type: CredentialType): Promise<CredentialResponse[]> {
    try {
      const credentials = await this.credentialRepository.find({
        where: {
          user_id: userId,
          type,
          is_deleted: false,
        },
      });

      return credentials.map(this.toResponse);
    } catch (error) {
      logger.error('Failed to fetch credentials by type', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        type,
      });
      throw error;
    }
  }

  /**
   * Convert credential to response (never expose encrypted data)
   */
  private toResponse(credential: Credential): CredentialResponse {
    return {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      created_at: credential.created_at,
      updated_at: credential.updated_at,
      last_used: credential.last_used,
    };
  }
}
