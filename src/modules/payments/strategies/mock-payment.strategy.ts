import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import {
  PaymentContext,
  PaymentResult,
  PaymentStrategy,
  RefundResult,
} from '../interfaces/payment-strategy.interface.js';

@Injectable()
export class MockPaymentStrategy implements PaymentStrategy {
  readonly method = PaymentMethod.MOCK;

  processPayment(context: PaymentContext): Promise<PaymentResult> {
    const transactionId = `MOCK-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    if (context.simulateFailure) {
      return Promise.resolve({
        status: PaymentStatus.FAILED,
        transactionId,
        provider: this.method,
        message: 'Simulated payment failure by MockPaymentStrategy',
      });
    }

    return Promise.resolve({
      status: PaymentStatus.SUCCESS,
      transactionId,
      provider: this.method,
      message: `Mock payment approved for order ${context.orderNumber}`,
      paidAt: new Date(),
    });
  }

  refundPayment(transactionId: string, amount: number): Promise<RefundResult> {
    return Promise.resolve({
      success: true,
      refundTransactionId: `REFUND-${transactionId}`,
      message: `Mock refund of ${amount.toFixed(2)} processed`,
    });
  }
}
