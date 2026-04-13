/**
 * Security Header Scanner
 *
 * Performs real HTTP HEAD requests against target URLs to check for
 * security headers and HTTPS compliance. Based on OWASP Secure Headers
 * Project and Mozilla Observatory recommendations.
 *
 * All checks are deterministic — no LLM involved.
 *
 * References:
 * - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
 * - Mozilla Observatory: https://observatory.mozilla.org/
 * - SecurityHeaders.com grading methodology
 */

export interface SecurityCheck {
  id: string;
  header: string;
  status: "pass" | "fail" | "warning" | "info";
  detail: string;
  severity: "critical" | "major" | "minor" | "info";
  value?: string;
}

export interface SecurityScanResult {
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  url: string;
  checks: SecurityCheck[];
  httpsEnabled: boolean;
  summary: string;
}

/**
 * Scan a URL's security headers by making a real HTTP HEAD request.
 * Returns detailed results for each important security header.
 */
export async function scanSecurityHeaders(url: string): Promise<SecurityScanResult> {
  const checks: SecurityCheck[] = [];
  let httpsEnabled = false;

  // Validate and normalize the URL
  let targetUrl: string;
  try {
    const parsed = new URL(url);
    targetUrl = parsed.href;
    httpsEnabled = parsed.protocol === "https:";
  } catch {
    return {
      overallScore: 0,
      grade: "F",
      url,
      checks: [{
        id: "url_invalid",
        header: "URL",
        status: "fail",
        detail: "Invalid URL provided for security scan.",
        severity: "critical",
      }],
      httpsEnabled: false,
      summary: "Cannot scan: invalid URL.",
    };
  }

  // 1. HTTPS check
  checks.push({
    id: "https",
    header: "HTTPS",
    status: httpsEnabled ? "pass" : "fail",
    detail: httpsEnabled
      ? "Site uses HTTPS encryption."
      : "Site does not use HTTPS. All data transmitted in plaintext.",
    severity: "critical",
  });

  // Perform HEAD request with timeout
  let headers: Record<string, string> = {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "KLAR-SecurityScanner/1.0 (EU-Compliance-Check)",
      },
    });

    clearTimeout(timeout);

    // Extract all response headers
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
  } catch (err) {
    // Try GET if HEAD fails (some servers block HEAD)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "KLAR-SecurityScanner/1.0 (EU-Compliance-Check)",
        },
      });

      clearTimeout(timeout);
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      // Consume and discard body to free connection
      await response.text().catch(() => {});
    } catch {
      return {
        overallScore: 0,
        grade: "F",
        url: targetUrl,
        checks: [...checks, {
          id: "connection_failed",
          header: "Connection",
          status: "fail",
          detail: "Could not connect to the server. The site may be down or blocking requests.",
          severity: "critical",
        }],
        httpsEnabled,
        summary: "Cannot complete scan: connection failed.",
      };
    }
  }

  // 2. Strict-Transport-Security (HSTS)
  const hsts = headers["strict-transport-security"];
  if (hsts) {
    const maxAge = hsts.match(/max-age=(\d+)/);
    const maxAgeVal = maxAge ? parseInt(maxAge[1]) : 0;
    const includesSubdomains = hsts.includes("includeSubDomains");
    const hasPreload = hsts.includes("preload");

    if (maxAgeVal >= 31536000 && includesSubdomains) {
      checks.push({
        id: "hsts",
        header: "Strict-Transport-Security",
        status: "pass",
        detail: `HSTS enabled with max-age=${maxAgeVal}${includesSubdomains ? ", includeSubDomains" : ""}${hasPreload ? ", preload" : ""}.`,
        severity: "critical",
        value: hsts,
      });
    } else {
      checks.push({
        id: "hsts",
        header: "Strict-Transport-Security",
        status: "warning",
        detail: `HSTS present but ${maxAgeVal < 31536000 ? "max-age too low (should be >= 31536000)" : "missing includeSubDomains"}.`,
        severity: "major",
        value: hsts,
      });
    }
  } else {
    checks.push({
      id: "hsts",
      header: "Strict-Transport-Security",
      status: httpsEnabled ? "fail" : "info",
      detail: "Strict-Transport-Security header missing. Vulnerable to protocol downgrade attacks.",
      severity: "critical",
    });
  }

  // 3. Content-Security-Policy
  const csp = headers["content-security-policy"];
  if (csp) {
    const hasUnsafeInline = csp.includes("'unsafe-inline'");
    const hasUnsafeEval = csp.includes("'unsafe-eval'");
    const hasDefaultSrc = csp.includes("default-src");

    if (hasUnsafeInline || hasUnsafeEval) {
      checks.push({
        id: "csp",
        header: "Content-Security-Policy",
        status: "warning",
        detail: `CSP present but uses ${hasUnsafeInline ? "'unsafe-inline'" : ""}${hasUnsafeInline && hasUnsafeEval ? " and " : ""}${hasUnsafeEval ? "'unsafe-eval'" : ""}, weakening XSS protection.`,
        severity: "major",
        value: csp.slice(0, 200),
      });
    } else if (!hasDefaultSrc) {
      checks.push({
        id: "csp",
        header: "Content-Security-Policy",
        status: "warning",
        detail: "CSP present but missing default-src directive.",
        severity: "major",
        value: csp.slice(0, 200),
      });
    } else {
      checks.push({
        id: "csp",
        header: "Content-Security-Policy",
        status: "pass",
        detail: "Content-Security-Policy is properly configured.",
        severity: "critical",
        value: csp.slice(0, 200),
      });
    }
  } else {
    checks.push({
      id: "csp",
      header: "Content-Security-Policy",
      status: "fail",
      detail: "Content-Security-Policy header missing. No protection against XSS and data injection attacks.",
      severity: "critical",
    });
  }

  // 4. X-Content-Type-Options
  const xcto = headers["x-content-type-options"];
  checks.push({
    id: "xcto",
    header: "X-Content-Type-Options",
    status: xcto?.includes("nosniff") ? "pass" : "fail",
    detail: xcto?.includes("nosniff")
      ? "X-Content-Type-Options: nosniff prevents MIME-type sniffing."
      : "Missing X-Content-Type-Options. Vulnerable to MIME-type confusion attacks.",
    severity: "major",
    value: xcto,
  });

  // 5. X-Frame-Options
  const xfo = headers["x-frame-options"];
  const cspFrameAncestors = csp?.includes("frame-ancestors");
  if (xfo || cspFrameAncestors) {
    checks.push({
      id: "xfo",
      header: "X-Frame-Options",
      status: "pass",
      detail: xfo
        ? `X-Frame-Options: ${xfo} prevents clickjacking.`
        : "Clickjacking protected via CSP frame-ancestors directive.",
      severity: "major",
      value: xfo,
    });
  } else {
    checks.push({
      id: "xfo",
      header: "X-Frame-Options",
      status: "fail",
      detail: "Missing X-Frame-Options and CSP frame-ancestors. Vulnerable to clickjacking.",
      severity: "major",
    });
  }

  // 6. Referrer-Policy
  const rp = headers["referrer-policy"];
  const strictReferrer = ["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"];
  checks.push({
    id: "referrer",
    header: "Referrer-Policy",
    status: rp && strictReferrer.some(v => rp.includes(v)) ? "pass" : rp ? "warning" : "fail",
    detail: rp
      ? strictReferrer.some(v => rp.includes(v))
        ? `Referrer-Policy: ${rp} limits referrer data leakage.`
        : `Referrer-Policy set to "${rp}" — consider a stricter policy.`
      : "Missing Referrer-Policy. URL paths may leak to third-party sites.",
    severity: "minor",
    value: rp,
  });

  // 7. Permissions-Policy (formerly Feature-Policy)
  const pp = headers["permissions-policy"] || headers["feature-policy"];
  checks.push({
    id: "permissions",
    header: "Permissions-Policy",
    status: pp ? "pass" : "warning",
    detail: pp
      ? "Permissions-Policy restricts browser feature access."
      : "Missing Permissions-Policy. Browser features (camera, mic, geolocation) not restricted.",
    severity: "minor",
    value: pp?.slice(0, 200),
  });

  // 8. X-XSS-Protection (deprecated but informational)
  const xxss = headers["x-xss-protection"];
  if (xxss) {
    checks.push({
      id: "xxss",
      header: "X-XSS-Protection",
      status: "info",
      detail: `X-XSS-Protection is deprecated. ${csp ? "CSP provides better protection." : "Use Content-Security-Policy instead."}`,
      severity: "info",
      value: xxss,
    });
  }

  // 9. Server header exposure
  const server = headers["server"];
  if (server && /apache|nginx|iis|express|tomcat/i.test(server)) {
    checks.push({
      id: "server_exposure",
      header: "Server",
      status: "warning",
      detail: `Server header exposes technology: "${server}". Consider removing or obfuscating.`,
      severity: "minor",
      value: server,
    });
  }

  // 10. X-Powered-By exposure
  const powered = headers["x-powered-by"];
  if (powered) {
    checks.push({
      id: "powered_by",
      header: "X-Powered-By",
      status: "warning",
      detail: `X-Powered-By header exposes: "${powered}". Remove to reduce information leakage.`,
      severity: "minor",
      value: powered,
    });
  }

  // Score calculation (weighted by severity)
  const criticalFails = checks.filter(c => c.status === "fail" && c.severity === "critical").length;
  const majorFails = checks.filter(c => c.status === "fail" && c.severity === "major").length;
  const minorFails = checks.filter(c => c.status === "fail" && c.severity === "minor").length;
  const warnings = checks.filter(c => c.status === "warning").length;

  const deductions = criticalFails * 25 + majorFails * 12 + minorFails * 5 + warnings * 3;
  const overallScore = Math.max(0, Math.min(100, 100 - deductions));

  const grade: SecurityScanResult["grade"] =
    overallScore >= 95 ? "A+" :
    overallScore >= 80 ? "A" :
    overallScore >= 65 ? "B" :
    overallScore >= 50 ? "C" :
    overallScore >= 30 ? "D" : "F";

  const passes = checks.filter(c => c.status === "pass").length;
  const total = checks.filter(c => c.severity !== "info").length;

  const summary = `Security grade: ${grade} (${overallScore}/100). ${passes}/${total} checks passed. ${criticalFails} critical, ${majorFails} major issues found.`;

  return {
    overallScore,
    grade,
    url: targetUrl,
    checks,
    httpsEnabled,
    summary,
  };
}
