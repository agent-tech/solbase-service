import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SolanaProofDto {
  @ApiProperty({
    description: 'X402 settlement proof from facilitator',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'settle_proof is required' })
  settle_proof: string;

  @ApiProperty({
    description: 'Solana transaction hash',
    example: '5J7Xk2YKw9X8CtjHkVH2J9vZ1XwZx8...',
  })
  @IsString()
  @IsNotEmpty({ message: 'tx_hash is required' })
  tx_hash: string;

  @ApiPropertyOptional({
    description: 'Payer wallet address (Solana)',
    example: 'CmGgLQL36Y9ubtTsy2zmE46TAxwCBm66onZmPPhUWNqv',
  })
  @IsString()
  @IsOptional()
  payer_wallet?: string;
}
