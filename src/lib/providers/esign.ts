import { ProviderNotConfiguredError } from "./errors";

export type SigningRequestInput = {
  documentId: string;
  signerId: string;
  signerName: string;
  signerEmail: string;
  callbackUrl: string;
};

export type SigningStatus = "pending" | "signed" | "declined" | "expired";

export type SigningRequestResult = {
  requestId: string;
  status: SigningStatus;
  signingUrl?: string;
};

export interface EsignProvider {
  createSigningRequest(input: SigningRequestInput): Promise<SigningRequestResult>;
  getSigningStatus(requestId: string): Promise<SigningRequestResult>;
}

const esignProvider: EsignProvider = {
  async createSigningRequest() {
    throw new ProviderNotConfiguredError();
  },
  async getSigningStatus() {
    throw new ProviderNotConfiguredError();
  },
};

export default esignProvider;
