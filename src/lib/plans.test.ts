import { describe, expect, it } from "vitest";
import { ACCOUNT_LIMIT, PLANS, effectivePlan, hasFeature } from "./plans";

describe("planos", () => {
  it("ambos pagos: 150 / 350 MT por mês", () => {
    expect(PLANS.pessoal.price).toBe(150);
    expect(PLANS.avancado.price).toBe(350);
  });
  it("pessoal tem só 1 conta e funcionalidades avançadas bloqueadas", () => {
    expect(ACCOUNT_LIMIT.pessoal).toBe(1);
    expect(hasFeature("pessoal", "photos")).toBe(false);
    expect(hasFeature("pessoal", "export")).toBe(false);
    expect(hasFeature("avancado", "export")).toBe(true);
  });
  it("plano expirado ou suspenso volta a pessoal", () => {
    expect(effectivePlan({ plan: "avancado", status: "active", expires_at: "2026-01-01" }, "2026-02-01")).toBe("pessoal");
    expect(effectivePlan({ plan: "avancado", status: "active", expires_at: "2026-03-01" }, "2026-02-01")).toBe("avancado");
    expect(effectivePlan({ plan: "avancado", status: "suspended", expires_at: null }, "2026-02-01")).toBe("pessoal");
  });
});
