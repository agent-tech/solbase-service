import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryIntentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Payment intent UUID',
  })
  @IsUUID(4, { message: 'intent_id must be a valid UUID v4' })
  intent_id: string;
}
