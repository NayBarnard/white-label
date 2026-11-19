import { ProviderNotConfiguredError } from "./errors";

export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled";

export type InstantEftPaymentInput = {
  clientId: string;
  amount: number;
  currency: "ZAR";
  reference: string;
  returnUrl: string;
};

export type DebiCheckMandateInput = {
  clientId: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  accountType: "cheque" | "savings";
  amount: number;
  currency: "ZAR";
  reference: string;
};

export type PaymentReceipt = {
  id: string;
  status: PaymentStatus;
  redirectUrl?: string;
};

export type PaymentStatusResult = {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: "ZAR";
};

export interface PaymentsProvider {
  createInstantEftPayment(input: InstantEftPaymentInput): Promise<PaymentReceipt>;
  createDebiCheckDebitMandate(input: DebiCheckMandateInput): Promise<PaymentReceipt>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
}

const paymentsProvider: PaymentsProvider = {
  async createInstantEftPayment() {
    throw new ProviderNotConfiguredError();
  },
  async createDebiCheckDebitMandate() {
    throw new ProviderNotConfiguredError();
  },
  async getPaymentStatus() {
    throw new ProviderNotConfiguredError();
  },
};

export default paymentsProvider;
