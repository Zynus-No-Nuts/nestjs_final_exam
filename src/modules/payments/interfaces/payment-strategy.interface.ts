import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface PaymentContext {
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  currency?: string;
  simulateFailure?: boolean;
}

export interface PaymentResult {
  status: PaymentStatus;
  transactionId: string;
  provider: PaymentMethod;
  message: string;
  paidAt?: Date;
  paymentUrl?: string;
}

export interface RefundResult {
  success: boolean;
  refundTransactionId: string;
  message: string;
}

export interface PaymentStrategy {
  readonly method: PaymentMethod;
  processPayment(context: PaymentContext): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
}
