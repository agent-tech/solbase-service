import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentIntentsService } from './payment-intents.service';
import { CreateIntentDto } from './dto/create-intent.dto';
import { QueryIntentDto } from './dto/query-intent.dto';
import { SolanaProofDto } from './dto/solana-proof.dto';

@ApiTags('Payment Intents')
@Controller('intents')
export class PaymentIntentsController {
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment intent',
    description: 'Creates a cross-chain payment intent for Solana → Base transfer',
  })
  @ApiBody({ type: CreateIntentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
    schema: {
      example: {
        intent_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: '0.05',
        merchant_recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        status: 'PENDING',
        created_at: '2025-01-09T10:00:00.000Z',
        expires_at: '2025-01-09T10:10:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async createIntent(@Body() createIntentDto: CreateIntentDto) {
    return this.paymentIntentsService.createIntent(createIntentDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query payment intent status',
    description: 'Retrieves the current status and details of a payment intent',
  })
  @ApiQuery({
    name: 'intent_id',
    type: String,
    description: 'Payment intent UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment intent details',
    schema: {
      example: {
        intent_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: '0.05',
        merchant_recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        status: 'SOL_SETTLED',
        sol_tx_hash: '5J7Xk2YKw9X8CtjHkVH2J9vZ1XwZx8...',
        created_at: '2025-01-09T10:00:00.000Z',
        sol_settled_at: '2025-01-09T10:01:30.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment intent not found',
  })
  async getIntent(@Query() queryIntentDto: QueryIntentDto) {
    const intent = await this.paymentIntentsService.getIntent(
      queryIntentDto.intent_id,
    );
    if (!intent) {
      throw new NotFoundException(
        `Payment intent ${queryIntentDto.intent_id} not found`,
      );
    }
    return intent;
  }

  @Post(':id/solana-proof')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit Solana payment proof',
    description:
      'Verifies Solana payment and updates intent status to SOL_SETTLED',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment intent UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: SolanaProofDto })
  @ApiResponse({
    status: 200,
    description: 'Solana proof verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Solana payment verified',
        intent_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'SOL_SETTLED',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid proof or intent already settled',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment intent not found',
  })
  async submitSolanaProof(
    @Param('id') intentId: string,
    @Body() solanaProofDto: SolanaProofDto,
  ) {
    return this.paymentIntentsService.submitSolanaProof(
      intentId,
      solanaProofDto,
    );
  }

  @Post(':id/trigger-base-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger Base chain payment',
    description:
      'Executes USDC transfer on Base chain after Solana payment is verified',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment intent UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Base payment executed successfully',
    schema: {
      example: {
        success: true,
        message: 'Base payment completed',
        base_tx_hash: '0x1234567890abcdef...',
        status: 'BASE_SETTLED',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solana payment not settled or Base payment already executed',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment intent not found',
  })
  async triggerBasePayment(@Param('id') intentId: string) {
    return this.paymentIntentsService.triggerBasePayment(intentId);
  }

  @Get(':id/receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get payment receipt',
    description:
      'Retrieves complete cross-chain payment receipt with both transaction hashes',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Payment intent UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment receipt',
    schema: {
      example: {
        intent_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: '0.05',
        merchant_recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        payer_wallet: 'CmGgLQL36Y9ubtTsy2zmE46TAxwCBm66onZmPPhUWNqv',
        status: 'COMPLETED',
        solana_payment: {
          tx_hash: '5J7Xk2YKw9X8CtjHkVH2J9vZ1XwZx8...',
          settle_proof: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          settled_at: '2025-01-09T10:01:30.000Z',
          explorer_url:
            'https://solscan.io/tx/5J7Xk2YKw9X8CtjHkVH2J9vZ1XwZx8...',
        },
        base_payment: {
          tx_hash: '0x1234567890abcdef...',
          settle_proof: 'base_proof_data',
          settled_at: '2025-01-09T10:02:15.000Z',
          explorer_url: 'https://basescan.org/tx/0x1234567890abcdef...',
        },
        created_at: '2025-01-09T10:00:00.000Z',
        completed_at: '2025-01-09T10:02:15.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Payment intent not found',
  })
  async getReceipt(@Param('id') intentId: string) {
    const receipt = await this.paymentIntentsService.getReceipt(intentId);
    if (!receipt) {
      throw new NotFoundException(`Payment intent ${intentId} not found`);
    }
    return receipt;
  }
}
