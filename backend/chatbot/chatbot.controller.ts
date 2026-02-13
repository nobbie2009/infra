import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RateLimitGuard } from '../auth/rate-limit.guard';

interface ProcessQueryDto {
  message: string;
  sessionId: string;
}

interface ConfirmActionDto {
  toolName: string;
  params: any;
}

@Controller('api/chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  private logger = new Logger('ChatbotController');
  private readonly RATE_LIMIT = 20; // 20 queries per minute per user
  private userQueryCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private chatbotService: ChatbotService) {}

  /**
   * POST /api/chatbot/query
   * Process a user query with Claude
   */
  @Post('query')
  @UseGuards(RateLimitGuard)
  async processQuery(
    @Body() dto: ProcessQueryDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user.id;
    const { message, sessionId } = dto;

    // Validate input
    if (!message || message.trim().length === 0) {
      throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
    }

    if (!sessionId) {
      throw new HttpException(
        'sessionId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `User ${userId} querying: "${message.substring(0, 50)}..."`,
    );

    try {
      const response = await this.chatbotService.processQuery(
        message,
        sessionId,
        userId,
      );
      return response;
    } catch (error) {
      this.logger.error(`Query processing failed: ${error.message}`);
      throw new HttpException(
        `ChatBot error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/chatbot/history/:sessionId
   * Get conversation history for a session
   */
  @Get('history')
  async getHistory(
    @Query('sessionId') sessionId: string,
    @Query('limit') limit: string = '20',
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user.id;

    if (!sessionId) {
      throw new HttpException(
        'sessionId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Fetching history for session: ${sessionId}`);

    try {
      const messages = await this.chatbotService.getConversationHistory(
        sessionId,
      );

      // Limit results
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const limited = messages.slice(-limitNum);

      return {
        sessionId,
        messageCount: messages.length,
        messages: limited.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          toolsUsed: msg.toolsUsed,
          createdAt: msg.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(`History retrieval failed: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve chat history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/chatbot/query/:queryId/confirm
   * Confirm and execute a destructive action
   */
  @Post('confirm')
  async confirmAction(
    @Body() dto: ConfirmActionDto,
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user.id;
    const { toolName, params } = dto;

    if (!toolName || !params) {
      throw new HttpException(
        'toolName and params are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`User ${userId} confirming action: ${toolName}`);

    try {
      const result = await this.chatbotService.confirmAndExecuteAction(
        toolName,
        params,
        userId,
      );

      return {
        success: true,
        message: `Action ${toolName} executed successfully`,
        result,
      };
    } catch (error) {
      this.logger.error(`Confirmation failed: ${error.message}`);
      throw new HttpException(
        `Action failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/chatbot/cleanup
   * Cleanup old sessions (admin only)
   */
  @Post('cleanup')
  async cleanupSessions(@Req() req: any): Promise<any> {
    const userId = req.user.id;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new HttpException(
        'Only admins can cleanup sessions',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.log(`Admin ${userId} triggering session cleanup`);

    try {
      await this.chatbotService.cleanupOldSessions();
      return { success: true, message: 'Old sessions cleaned up' };
    } catch (error) {
      throw new HttpException(
        'Cleanup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
