import { describe, expect, it } from "vitest";
import { ACCOUNT_LIMIT, PLANS, effectivePlan, hasFeature } from "./plans";

describe("planos", () => {
  it("preços: 0 / 350 / 650 MT por mês", () => {
    expect(PLANS.pessoal.price).toBe(0);
    expect(PLANS.avancado.price).toBe(350);
    expect(PLANS.casa.price).toBe(650);
  });
  it("pessoal tem só 1 conta e sem fotos", () => {
    expect(ACCOUNT_LIMIT.pessoal).toBe(1);
    expect(hasFeature("pessoal", "photos")).toBe(false);
  });
  it("só o plano casa tem contas da casa", () => {
    expect(hasFeature("avancado", "household")).toBe(false);
    expect(hasFeature("casa", "household")).toBe(true);
  });
  it("plano expirado volta a pessoal", () => {
    expect(effectivePlan({ plan: "casa", status: "active", expires_at: "2026-01-01" }, "2026-02-01")).toBe("pessoal");
    expect(effectivePlan({ plan: "casa", status: "active", expires_at: "2026-03-01" }, "2026-02-01")).toBe("casa");
    expect(effectivePlan({ plan: "avancado", status: "suspended", expires_at: null }, "2026-02-01")).toBe("pessoal");
  });
});
