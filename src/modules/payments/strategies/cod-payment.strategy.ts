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
export class CodPaymentStrategy implements PaymentStrategy {
  readonly method = PaymentMethod.COD;

  processPayment(context: PaymentContext): Promise<PaymentResult> {
    const transactionId = `COD-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    return Promise.resolve({
      status: PaymentStatus.PENDING,
      transactionId,
      provider: this.method,
      message: `Cash on Delivery registered for order ${context.orderNumber}`,
    });
  }

  refundPayment(transactionId: string): Promise<RefundResult> {
    return Promise.resolve({
      success: true,
      refundTransactionId: `COD-CANCEL-${transactionId}`,
      message: 'Cash on Delivery payment cancelled (no charge collected)',
    });
  }
}
