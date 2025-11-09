import { Module } from '@nestjs/common';
import { PaymentIntentsController } from './payment-intents.controller';
import { PaymentIntentsService } from './payment-intents.service';
import { BasePaymentService } from './base-payment.service';

@Module({
  controllers: [PaymentIntentsController],
  providers: [PaymentIntentsService, BasePaymentService],
})
export class PaymentIntentsModule {}
