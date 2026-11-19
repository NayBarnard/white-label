import { ProviderNotConfiguredError } from "./errors";

export type IdentityDocumentInput = {
  clientId: string;
  documentFront: Uint8Array;
  documentBack?: Uint8Array;
};

export type LivenessCheckInput = {
  clientId: string;
  video: Uint8Array;
};

export type ProofOfAddressInput = {
  clientId: string;
  document: Uint8Array;
};

export type IdentityVerificationResult = {
  verificationId: string;
  status: "pending" | "verified" | "rejected";
};

export interface IdentityProvider {
  verifyIdDocument(input: IdentityDocumentInput): Promise<IdentityVerificationResult>;
  checkLiveness(input: LivenessCheckInput): Promise<IdentityVerificationResult>;
  verifyProofOfAddress(input: ProofOfAddressInput): Promise<IdentityVerificationResult>;
}

const identityProvider: IdentityProvider = {
  async verifyIdDocument() {
    throw new ProviderNotConfiguredError();
  },
  async checkLiveness() {
    throw new ProviderNotConfiguredError();
  },
  async verifyProofOfAddress() {
    throw new ProviderNotConfiguredError();
  },
};

export default identityProvider;
