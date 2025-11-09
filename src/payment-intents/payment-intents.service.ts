import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { BasePaymentService } from './base-payment.service';
import { CreateIntentDto } from './dto/create-intent.dto';
import { SolanaProofDto } from './dto/solana-proof.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentIntentsService {
  private readonly logger = new Logger(PaymentIntentsService.name);
  private readonly facilitatorUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly basePaymentService: BasePaymentService,
    private readonly configService: ConfigService,
  ) {
    this.facilitatorUrl = this.configService.get<string>(
      'x402.facilitatorUrl',
      'https://x402.org/facilitator',
    );
  }

  async createIntent(createIntentDto: CreateIntentDto) {
    const intentId = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    this.logger.log(`Creating payment intent: ${intentId}`);

    const intent = await this.prisma.paymentIntent.create({
      data: {
        intent_id: intentId,
        amount: createIntentDto.amount.toString(),
        merchant_recipient: createIntentDto.merchant_recipient,
        payer_chain: 'solana',
        target_chain: 'base',
        status: 'PENDING',
        expires_at: expiresAt,
      },
    });

    this.logger.log(`Payment intent created: ${intentId}`);

    return {
      intent_id: intent.intent_id,
      amount: intent.amount,
      merchant_recipient: intent.merchant_recipient,
      status: intent.status,
      created_at: intent.created_at,
      expires_at: intent.expires_at,
    };
  }

  async getIntent(intentId: string) {
    this.logger.log(`Querying payment intent: ${intentId}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { intent_id: intentId },
    });

    if (!intent) {
      return null;
    }

    // Check if expired
    if (intent.expires_at && new Date() > intent.expires_at) {
      if (intent.status === 'PENDING') {
        await this.prisma.paymentIntent.update({
          where: { intent_id: intentId },
          data: { status: 'EXPIRED' },
        });
        intent.status = 'EXPIRED';
      }
    }

    return {
      intent_id: intent.intent_id,
      amount: intent.amount,
      merchant_recipient: intent.merchant_recipient,
      payer_wallet: intent.payer_wallet,
      status: intent.status,
      sol_tx_hash: intent.sol_tx_hash,
      base_tx_hash: intent.base_tx_hash,
      created_at: intent.created_at,
      sol_settled_at: intent.sol_settled_at,
      base_settled_at: intent.base_settled_at,
      completed_at: intent.completed_at,
      expires_at: intent.expires_at,
    };
  }

  async submitSolanaProof(intentId: string, solanaProofDto: SolanaProofDto) {
    this.logger.log(`Submitting Solana proof for intent: ${intentId}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { intent_id: intentId },
    });

    if (!intent) {
      throw new NotFoundException(`Payment intent ${intentId} not found`);
    }

    if (intent.status !== 'PENDING') {
      throw new BadRequestException(
        `Payment intent ${intentId} is not in PENDING status (current: ${intent.status})`,
      );
    }

    // Verify proof with X402 facilitator
    try {
      await this.verifyX402Proof(solanaProofDto.settle_proof);
    } catch (error) {
      this.logger.error(`Proof verification failed: ${error.message}`);
      throw new BadRequestException(`Invalid settlement proof: ${error.message}`);
    }

    // Update intent with Solana payment details
    const updatedIntent = await this.prisma.paymentIntent.update({
      where: { intent_id: intentId },
      data: {
        status: 'SOL_SETTLED',
        sol_settle_proof: solanaProofDto.settle_proof,
        sol_tx_hash: solanaProofDto.tx_hash,
        payer_wallet: solanaProofDto.payer_wallet || null,
        sol_settled_at: new Date(),
      },
    });

    this.logger.log(`Solana payment verified for intent: ${intentId}`);

    // Asynchronously trigger Base payment (don't wait for it)
    setImmediate(() => {
      this.triggerBasePayment(intentId).catch((error) => {
        this.logger.error(
          `Failed to trigger Base payment for ${intentId}: ${error.message}`,
        );
      });
    });

    return {
      success: true,
      message: 'Solana payment verified',
      intent_id: updatedIntent.intent_id,
      status: updatedIntent.status,
    };
  }

  async triggerBasePayment(intentId: string) {
    this.logger.log(`Triggering Base payment for intent: ${intentId}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { intent_id: intentId },
    });

    if (!intent) {
      throw new NotFoundException(`Payment intent ${intentId} not found`);
    }

    if (intent.status !== 'SOL_SETTLED') {
      throw new BadRequestException(
        `Solana payment not settled for intent ${intentId} (current status: ${intent.status})`,
      );
    }

    // Set status to BASE_SETTLING
    await this.prisma.paymentIntent.update({
      where: { intent_id: intentId },
      data: { status: 'BASE_SETTLING' },
    });

    try {
      // Execute Base payment
      const result = await this.basePaymentService.executePayment({
        intentId: intent.intent_id,
        amount: parseFloat(intent.amount),
        recipientAddress: intent.merchant_recipient,
      });

      // Update intent with Base payment details
      const updatedIntent = await this.prisma.paymentIntent.update({
        where: { intent_id: intentId },
        data: {
          status: 'BASE_SETTLED',
          base_tx_hash: result.txHash,
          base_settle_proof: result.proof || 'base_settlement_confirmed',
          base_settled_at: new Date(),
          completed_at: new Date(),
        },
      });

      this.logger.log(`Base payment completed for intent: ${intentId}`);

      return {
        success: true,
        message: 'Base payment completed',
        base_tx_hash: updatedIntent.base_tx_hash,
        status: updatedIntent.status,
      };
    } catch (error) {
      this.logger.error(`Base payment failed for ${intentId}: ${error.message}`);

      // Rollback to SOL_SETTLED to allow retry
      await this.prisma.paymentIntent.update({
        where: { intent_id: intentId },
        data: { status: 'SOL_SETTLED' },
      });

      throw new InternalServerErrorException(
        `Base payment failed: ${error.message}`,
      );
    }
  }

  async getReceipt(intentId: string) {
    this.logger.log(`Generating receipt for intent: ${intentId}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { intent_id: intentId },
    });

    if (!intent) {
      return null;
    }

    const network = this.configService.get<string>('solana.network', 'devnet');
    const baseNetwork = this.configService.get<string>('base.network', 'base-sepolia');

    const solanaExplorerBase =
      network === 'mainnet-beta'
        ? 'https://solscan.io'
        : 'https://solscan.io?cluster=devnet';

    const baseExplorerBase =
      baseNetwork === 'base' ? 'https://basescan.org' : 'https://sepolia.basescan.org';

    return {
      intent_id: intent.intent_id,
      amount: intent.amount,
      merchant_recipient: intent.merchant_recipient,
      payer_wallet: intent.payer_wallet,
      status: intent.status,
      solana_payment: intent.sol_tx_hash
        ? {
            tx_hash: intent.sol_tx_hash,
            settle_proof: intent.sol_settle_proof,
            settled_at: intent.sol_settled_at,
            explorer_url: `${solanaExplorerBase}/tx/${intent.sol_tx_hash}`,
          }
        : null,
      base_payment: intent.base_tx_hash
        ? {
            tx_hash: intent.base_tx_hash,
            settle_proof: intent.base_settle_proof,
            settled_at: intent.base_settled_at,
            explorer_url: `${baseExplorerBase}/tx/${intent.base_tx_hash}`,
          }
        : null,
      created_at: intent.created_at,
      completed_at: intent.completed_at,
      expires_at: intent.expires_at,
    };
  }

  private async verifyX402Proof(proof: string): Promise<void> {
    try {
      const response = await fetch(`${this.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proof }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Verification failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      if (!data.valid) {
        throw new Error('Proof verification failed');
      }

      this.logger.log('X402 proof verified successfully');
    } catch (error) {
      this.logger.error(`X402 proof verification error: ${error.message}`);
      throw error;
    }
  }
}
