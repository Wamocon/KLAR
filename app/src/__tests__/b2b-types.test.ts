import { describe, it, expect } from "vitest";
import type {
  Organization,
  OrgMember,
  OrgInvitation,
  ApiKey,
  Webhook,
  ComplianceReport,
  Tag,
  OrgRole,
  ApiKeyScope,
  ComplianceReportType,
} from "@/types";

// ═══════════════════════════════════════════
// B2B Type Definitions — Structural Tests
// ═══════════════════════════════════════════

describe("B2B Types — Organization", () => {
  it("Organization has all required fields", () => {
    const org: Organization = {
      id: "org-123",
      name: "Acme Corp",
      slug: "acme-corp",
      logo_url: null,
      plan: "team",
      max_seats: 25,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(org.id).toBeTruthy();
    expect(org.plan).toBe("team");
    expect(org.max_seats).toBeGreaterThan(0);
  });

  it("Organization plan is restricted to team | enterprise", () => {
    const teamOrg: Organization = {
      id: "1", name: "T", slug: "t", logo_url: null,
      plan: "team", max_seats: 25, settings: {},
      created_at: "", updated_at: "",
    };
    const entOrg: Organization = {
      id: "2", name: "E", slug: "e", logo_url: null,
      plan: "enterprise", max_seats: 100, settings: {},
      created_at: "", updated_at: "",
    };
    expect(["team", "enterprise"]).toContain(teamOrg.plan);
    expect(["team", "enterprise"]).toContain(entOrg.plan);
  });
});

describe("B2B Types — OrgMember", () => {
  it("OrgMember has valid role", () => {
    const roles: OrgRole[] = ["owner", "admin", "member"];
    roles.forEach((role) => {
      const member: OrgMember = {
        id: "m-1", org_id: "o-1", user_id: "u-1", role,
        invited_by: null, joined_at: "",
      };
      expect(["owner", "admin", "member"]).toContain(member.role);
    });
  });
});

describe("B2B Types — OrgInvitation", () => {
  it("OrgInvitation has token and expiry", () => {
    const inv: OrgInvitation = {
      id: "i-1", org_id: "o-1", email: "test@example.com",
      role: "member", token: "abc123", invited_by: null,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      accepted_at: null, created_at: "",
    };
    expect(inv.token.length).toBeGreaterThan(0);
    expect(new Date(inv.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(inv.accepted_at).toBeNull();
  });
});

describe("B2B Types — ApiKey", () => {
  it("ApiKey has required security fields", () => {
    const key: ApiKey = {
      id: "k-1", user_id: "u-1", org_id: null,
      name: "Test Key", key_hash: "a".repeat(64), key_prefix: "klar_abcd1234",
      scopes: ["verify"], rate_limit_per_minute: 10,
      total_requests: 0, last_used_at: null,
      expires_at: null, is_active: true,
      created_at: "",
    };
    expect(key.key_hash.length).toBe(64);
    expect(key.key_prefix).toMatch(/^klar_/);
    expect(key.is_active).toBe(true);
  });

  it("ApiKey scopes are valid values", () => {
    const validScopes: ApiKeyScope[] = ["verify", "export", "batch", "compliance"];
    validScopes.forEach((scope) => {
      expect(["verify", "export", "batch", "compliance"]).toContain(scope);
    });
  });
});

describe("B2B Types — Webhook", () => {
  it("Webhook has URL and events", () => {
    const wh: Webhook = {
      id: "wh-1", org_id: "o-1",
      url: "https://example.com/webhook",
      events: ["verification.completed", "batch.completed"],
      secret: "whsec_test", is_active: true,
      last_triggered_at: null, failure_count: 0,
      created_at: "",
    };
    expect(wh.url).toMatch(/^https:\/\//);
    expect(wh.events.length).toBeGreaterThan(0);
    expect(wh.secret).toBeTruthy();
  });
});

describe("B2B Types — ComplianceReport", () => {
  it("ComplianceReport has valid type", () => {
    const types: ComplianceReportType[] = [
      "ai_act_transparency",
      "ai_act_risk_assessment",
      "monthly_summary",
      "audit_export",
    ];
    types.forEach((type) => {
      const report: ComplianceReport = {
        id: "r-1", org_id: null, user_id: "u-1",
        report_type: type, title: "Test Report",
        period_start: "2025-01-01", period_end: "2025-01-31",
        data: {}, generated_at: "",
      };
      expect(report.report_type).toBe(type);
    });
  });

  it("ComplianceReport period_end is after period_start", () => {
    const report: ComplianceReport = {
      id: "r-1", org_id: null, user_id: "u-1",
      report_type: "monthly_summary", title: "Test",
      period_start: "2025-01-01T00:00:00.000Z",
      period_end: "2025-01-31T23:59:59.999Z",
      data: {}, generated_at: "",
    };
    expect(new Date(report.period_end).getTime())
      .toBeGreaterThan(new Date(report.period_start).getTime());
  });
});

describe("B2B Types — Tag", () => {
  it("Tag has name and color", () => {
    const tag: Tag = {
      id: "t-1", org_id: null, user_id: "u-1",
      name: "important", color: "#ef4444",
      created_at: "",
    };
    expect(tag.name.length).toBeGreaterThan(0);
    expect(tag.color).toMatch(/^#[a-fA-F0-9]{6}$/);
  });
});

// ═══════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════

describe("B2B Types — Edge Cases", () => {
  it("Organization settings can hold arbitrary JSON", () => {
    const org: Organization = {
      id: "o-1", name: "Test", slug: "test", logo_url: null,
      plan: "enterprise", max_seats: 100,
      settings: {
        custom_branding: true,
        allowed_domains: ["example.com"],
        nested: { deep: { value: 42 } },
      },
      created_at: "", updated_at: "",
    };
    expect((org.settings as Record<string, unknown>).custom_branding).toBe(true);
  });

  it("ComplianceReport data can hold complex nested structures", () => {
    const report: ComplianceReport = {
      id: "r-1", org_id: "o-1", user_id: "u-1",
      report_type: "ai_act_transparency", title: "Q1 2025",
      period_start: "2025-01-01", period_end: "2025-03-31",
      data: {
        summary: { total_verifications: 1234 },
        eu_ai_act: {
          article: "Article 52",
          accuracy_metrics: { score: 0.95 },
        },
      },
      generated_at: "",
    };
    expect((report.data as Record<string, unknown>).summary).toBeDefined();
  });

  it("OrgMember can have optional joined fields (email, full_name)", () => {
    const memberWithEmail: OrgMember = {
      id: "m-1", org_id: "o-1", user_id: "u-1", role: "member",
      invited_by: "u-0", joined_at: "",
      email: "test@example.com", full_name: "Test User",
    };
    expect(memberWithEmail.email).toBe("test@example.com");

    const memberWithoutEmail: OrgMember = {
      id: "m-2", org_id: "o-1", user_id: "u-2", role: "admin",
      invited_by: null, joined_at: "",
    };
    expect(memberWithoutEmail.email).toBeUndefined();
  });
});
