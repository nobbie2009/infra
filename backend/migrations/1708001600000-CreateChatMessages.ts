import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateChatMessages1708001600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'tools_used',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'needs_confirmation',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'idx_chat_messages_session',
            columnNames: ['session_id'],
          },
          {
            name: 'idx_chat_messages_user',
            columnNames: ['user_id'],
          },
          {
            name: 'idx_chat_messages_created_at',
            columnNames: ['created_at'],
          },
        ],
        foreignKeys: [
          {
            name: 'fk_chat_messages_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('chat_messages');
  }
}
