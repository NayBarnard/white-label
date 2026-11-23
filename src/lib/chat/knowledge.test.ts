import { describe, expect, it } from "vitest";
import { fundFacts } from "@/data/firmData";
import { answerLocally, fundFactsAnswer } from "./knowledge";

describe("answerLocally", () => {
  it.each([
    ["hello", "Hello!"],
    ["How are you?", "thanks for asking"],
    ["Hi, how are you? What is the FSP number?", "no regulatory licence"],
    ["thanks", "You’re welcome"],
    ["who are you?", "self-service website assistant"],
    ["Can I speak to a person?", "+27 10 000 0000"],
    ["What is the phone number?", "+27 10 000 0000"],
    ["How long is the response time?", "2 business days"],
    ["What is the address?", "100 Demonstration Avenue"],
    ["What is the FSP number?", "no regulatory licence"],
    ["What is the company tagline?", "Genuinely diversified, cost-conscious"],
    ["What is the your firm Balanced 3-year return?", "No verified fund performance figures"],
    ["Give me the Balanced and Cautious performance figures", "No verified fund performance figures"],
    ["What are the 5-year annualised returns?", "No verified fund performance figures"],
    ["What is the FE Analytics total-return comparison?", "No verified fund performance figures"],
    ["What are the investment beliefs?", "Real diversification"],
    ["Who is the Managing Director?", "No verified leadership profiles"],
    ["Tell me about the leadership team", "No verified leadership profiles"],
    ["How do I open an account?", "not KYC/AML"],
    ["What articles and categories are published?", "MARKET COMMENTARY"],
    ["Where is the TFSA form link?", "TFSA application form"],
    ["What is the minimum investment?", "not published"],
    ["What are the fees?", "not published"],
    ["Is the portal fee table the actual fee?", "not published"],
    ["What is in the client portal?", "Document Vault"],
    ["How do I sign in to the portal?", "client portal dashboard"],
    ["How do I request a withdrawal in the portal?", "Requests & Adviser"],
    ["How do I request a top-up?", "Lump-sum top-up"],
    ["How do I request a strategy switch?", "strategy switch"],
    ["How do I request a debit-order change?", "debit-order update"],
    ["What is the privacy notice status?", "draft placeholders"],
    ["Where are the complaints, conflict, and PAIA policies?", "Complaints Resolution Policy"],
    ["What does POPIA cover?", "POPI Act Statement"],
    ["Tell me about the portfolio review and FAQ", "How often are the portfolios reviewed?"],
  ])("%s", (question, expected) => {
    expect(answerLocally(question).answer.toLowerCase()).toContain(expected.toLowerCase());
  });

  it("includes the FAIS and past-performance disclosures on performance answers", () => {
    const result = answerLocally("What is the Balanced 3-year return?");

    expect(result.answer).toContain("Financial Advisory and Intermediary Services Act");
    expect(result.answer).toContain("Past performance is not necessarily a guide");
  });

  it("reports only the requested empty fund-fact field as not published", () => {
    const result = answerLocally("What is the your firm Balanced ISIN?");
    expect(result.answer).toContain("ISIN: not published");
    expect(result.answer).not.toContain("JSE code: not published");
    expect(result.answer).not.toContain("Management company: not published");
  });

  it("answers filled fee, allocation, and management-company facts with their as-at date", () => {
    const populatedFacts = {
      ...fundFacts,
      balanced: {
        ...fundFacts.balanced,
        managementCompany: { name: "Example Management Company" },
        tradingCosts: {
          ter: 0.35,
          transactionCosts: 0.12,
          totalInvestmentCharge: 0.47,
          asAt: "31 December 2025",
        },
        assetAllocation: [{ name: "Local equities", percent: 45 }],
        assetAllocationAsAt: "31 December 2025",
        source: "Approved fact sheet",
      },
    };
    const result = fundFactsAnswer(
      "What are the TER, asset allocation and management company for the balanced strategy?",
      populatedFacts,
    );

    expect(result).toContain("TER: 0,35% (as at 31 December 2025)");
    expect(result).toContain("Local equities: 45% (as at 31 December 2025)");
    expect(result).toContain("Management company: Example Management Company");
    expect(result).toContain("Source: Approved fact sheet");
  });

  it("links to every published downloadable document", () => {
    expect(
      answerLocally("List all public document downloads").links.filter((link) => link.download),
    ).toHaveLength(6);
  });

  it("directs TFSA questions to the preliminary onboarding questionnaire", () => {
    expect(answerLocally("Where is the TFSA form link?").links).toContainEqual(
      expect.objectContaining({
        href: "/onboarding",
      }),
    );
  });

  it("uses the not-published response and the resources/contact links for unknown questions", () => {
    const result = answerLocally("What is the share price of Acme Widgets?");

    expect(result.answer).toContain("I can’t find that in the published information");
    expect(result.links.map((link) => link.href)).toEqual(["/resources", "/contact"]);
  });

  it("uses the previous user question to answer a short follow-up", () => {
    const result = answerLocally("And what about Cautious?", [
      { role: "user", content: "What are the fees for Balanced?" },
      { role: "assistant", content: "Balanced fees are not published." },
    ]);

    expect(result.answer).toContain("your firm Cautious Strategy");
    expect(result.answer).toContain("TER: not published");
  });
});
