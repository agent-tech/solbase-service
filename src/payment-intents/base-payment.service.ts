import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

interface PaymentRequest {
  intentId: string;
  amount: number; // USD amount
  recipientAddress: string; // 0x... EVM address
}

interface PaymentResult {
  txHash: string;
  proof?: string;
}

@Injectable()
export class BasePaymentService {
  private readonly logger = new Logger(BasePaymentService.name);
  private readonly proxyPrivateKey: string;
  private readonly network: string;
  private readonly usdcContractAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.proxyPrivateKey = this.configService.get<string>('base.proxyPrivateKey');
    this.network = this.configService.get<string>('base.network', 'base-sepolia');

    // USDC contract addresses
    // Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    // Base Mainnet: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
    this.usdcContractAddress =
      this.network === 'base'
        ? '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

    if (!this.proxyPrivateKey) {
      throw new Error('BASE_PROXY_PRIVATE_KEY is not configured');
    }
  }

  async executePayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logger.log(`🚀 Starting Base payment for intent: ${request.intentId}`);
    this.logger.log(`💰 Amount: $${request.amount} → ${request.recipientAddress}`);

    try {
      // Create account from private key
      const account = privateKeyToAccount(this.proxyPrivateKey as `0x${string}`);

      // Select chain
      const chain = this.network === 'base' ? base : baseSepolia;

      this.logger.log(`📡 Network: ${chain.name}`);
      this.logger.log(`👛 Proxy wallet: ${account.address}`);

      // Create wallet client
      const walletClient = createWalletClient({
        account,
        chain: chain as any,
        transport: http(),
      });

      // Create public client for reading
      const publicClient = createPublicClient({
        chain: chain as any,
        transport: http(),
      });

      // USDC has 6 decimals
      const amountInUsdc = parseUnits(request.amount.toString(), 6);

      this.logger.log(
        `💵 Payment details: { from: ${account.address}, to: ${request.recipientAddress}, amount: ${amountInUsdc} (${request.amount} USDC), contract: ${this.usdcContractAddress} }`,
      );

      // Check wallet balance
      const balance = await publicClient.readContract({
        address: this.usdcContractAddress as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [{ name: '_owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            type: 'function',
          },
        ] as const,
        functionName: 'balanceOf',
        args: [account.address],
      });

      const balanceInUsdc = Number(balance) / 1e6;
      this.logger.log(`💰 Wallet balance: ${balanceInUsdc} USDC`);

      if (Number(balance) < Number(amountInUsdc)) {
        throw new Error(
          `Insufficient USDC balance: ${balanceInUsdc} USDC (need ${request.amount} USDC)`,
        );
      }

      // Execute USDC transfer
      this.logger.log('📤 Sending USDC transfer transaction...');

      const txHash = await walletClient.writeContract({
        address: this.usdcContractAddress as `0x${string}`,
        abi: [
          {
            constant: false,
            inputs: [
              { name: '_to', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'transfer',
            outputs: [{ name: '', type: 'bool' }],
            type: 'function',
          },
        ] as const,
        functionName: 'transfer',
        args: [request.recipientAddress as `0x${string}`, amountInUsdc],
        account,
        chain: chain as any,
      });

      this.logger.log(`✅ Transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      this.logger.log('⏳ Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      this.logger.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
      this.logger.log(
        `🔗 Explorer: ${chain.blockExplorers?.default.url}/tx/${txHash}`,
      );

      return {
        txHash,
        proof: `base_settlement_${txHash}`,
      };
    } catch (error) {
      this.logger.error(`❌ Base payment failed: ${error.message}`);
      if (error.stack) {
        this.logger.error(error.stack);
      }
      throw error;
    }
  }
}
