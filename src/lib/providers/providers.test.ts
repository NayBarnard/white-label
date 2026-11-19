import { describe, expect, it } from "vitest";
import { ProviderNotConfiguredError } from "./errors";
import esignProvider from "./esign";
import identityProvider from "./identity";
import paymentsProvider from "./payments";

describe("default outside-service providers", () => {
  it("fails closed with ProviderNotConfiguredError", async () => {
    const calls = [
      () => paymentsProvider.createInstantEftPayment({
        clientId: "client",
        amount: 100,
        currency: "ZAR",
        reference: "ref",
        returnUrl: "https://example.test/return",
      }),
      () => paymentsProvider.createDebiCheckDebitMandate({
        clientId: "client",
        accountHolder: "Example",
        accountNumber: "123456789",
        branchCode: "123456",
        accountType: "cheque",
        amount: 100,
        currency: "ZAR",
        reference: "ref",
      }),
      () => paymentsProvider.getPaymentStatus("payment"),
      () => identityProvider.verifyIdDocument({ clientId: "client", documentFront: new Uint8Array() }),
      () => identityProvider.checkLiveness({ clientId: "client", video: new Uint8Array() }),
      () => identityProvider.verifyProofOfAddress({ clientId: "client", document: new Uint8Array() }),
      () => esignProvider.createSigningRequest({
        documentId: "document",
        signerId: "client",
        signerName: "Example",
        signerEmail: "example@example.test",
        callbackUrl: "https://example.test/callback",
      }),
      () => esignProvider.getSigningStatus("request"),
    ];

    for (const call of calls) {
      const error = await call().then(() => undefined, (reason: unknown) => reason);
      expect(error).toBeInstanceOf(ProviderNotConfiguredError);
      expect(error).toHaveProperty("message", "Provider not configured");
    }
  });
});
