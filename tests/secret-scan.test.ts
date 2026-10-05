import { describe, expect, it } from "vitest";
import { findLeaks, parseEnv, riskyPublicNames, secretValues } from "@/scripts/secret-scan.mts";

describe("parseEnv", () => {
  it("reads KEY=VALUE lines, strips quotes, skips comments and blanks", () => {
    const text = `# comment\nA=1\nB="two words"\n\nC='x'\nexport D=yes\n`;
    expect(parseEnv(text)).toEqual({ A: "1", B: "two words", C: "x", D: "yes" });
  });
});

describe("secretValues", () => {
  it("keeps values long enough to be secrets and drops trivial ones", () => {
    const env = { TOKEN: "abcdefghijklmnop", PORT: "3000", EMPTY: "", FLAG: "true" };
    expect(secretValues(env)).toEqual(["abcdefghijklmnop"]);
  });
});

describe("findLeaks", () => {
  const secret = "AXyz_super_secret_token_123";

  it("names the files that contain a secret value", () => {
    const files = [
      { path: "a.js", content: `const t = "${secret}";` },
      { path: "b.js", content: "nothing here" },
    ];
    expect(findLeaks([secret], files)).toEqual(["a.js"]);
  });

  it("finds nothing in clean files", () => {
    expect(findLeaks([secret], [{ path: "c.js", content: "clean" }])).toEqual([]);
  });
});

describe("riskyPublicNames", () => {
  it("flags browser-exposed variables whose names look secret", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "x", NEXT_PUBLIC_REDIS_TOKEN: "y", KV_REST_API_TOKEN: "z" };
    expect(riskyPublicNames(env)).toEqual(["NEXT_PUBLIC_REDIS_TOKEN"]);
  });
});
