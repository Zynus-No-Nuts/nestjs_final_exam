import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PAYMENT_STRATEGIES, PaymentsService } from './payments.service.js';
import { CodPaymentStrategy } from './strategies/cod-payment.strategy.js';
import { MockPaymentStrategy } from './strategies/mock-payment.strategy.js';

@Module({
  controllers: [PaymentsController],
  providers: [
    MockPaymentStrategy,
    CodPaymentStrategy,
    {
      provide: PAYMENT_STRATEGIES,
      useFactory: (mock: MockPaymentStrategy, cod: CodPaymentStrategy) => [mock, cod],
      inject: [MockPaymentStrategy, CodPaymentStrategy],
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
