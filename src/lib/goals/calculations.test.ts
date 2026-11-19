import { describe, expect, it } from "vitest";
import {
  calculateGoalProgress,
  monthsUntilGoalDate,
  parseGoalInput,
  projectGoalValue,
} from "./calculations";

const validGoal = {
  name: "Home deposit",
  target_amount: 500_000,
  target_date: "2027-01-01",
  monthly_contribution: 1_000,
  assumed_annual_growth_percent: 5,
};

describe("goal validation and illustration maths", () => {
  it("requires a future target date and an explicit 0–30% growth rate", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(parseGoalInput(validGoal, now)).toEqual(validGoal);
    expect(parseGoalInput({ ...validGoal, assumed_annual_growth_percent: undefined }, now)).toBeNull();
    expect(parseGoalInput({ ...validGoal, assumed_annual_growth_percent: 31 }, now)).toBeNull();
    expect(parseGoalInput({ ...validGoal, target_date: "2026-11-17" }, now)).toBeNull();
    expect(parseGoalInput({ ...validGoal, target_amount: -1 }, now)).toBeNull();
    expect(parseGoalInput({ ...validGoal, monthly_contribution: -1 }, now)).toBeNull();
  });

  it("handles zero growth and zero contributions in hypothetical projections", () => {
    expect(projectGoalValue(100_000, 1_000, 0, 12)).toBe(112_000);
    expect(projectGoalValue(100_000, 0, 0, 12)).toBe(100_000);
    expect(projectGoalValue(100_000, 0, 12, 12)).toBeGreaterThan(100_000);
    expect(calculateGoalProgress(250, 1_000)).toBe(25);
    expect(calculateGoalProgress(null, 1_000)).toBeNull();
  });

  it("calculates whole months to a future goal date", () => {
    expect(monthsUntilGoalDate("2027-01-01", new Date("2026-11-17T12:00:00Z"))).toBe(1);
  });
});
