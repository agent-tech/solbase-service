import { IsString, IsNumber, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIntentDto {
  @ApiProperty({
    example: 0.05,
    description: 'Payment amount in USD',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least $0.01' })
  amount: number;

  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Base chain merchant recipient address (EVM format)',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'merchant_recipient must be a valid EVM address (0x + 40 hex chars)',
  })
  merchant_recipient: string;
}
