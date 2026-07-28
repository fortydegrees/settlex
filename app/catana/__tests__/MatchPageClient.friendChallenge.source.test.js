import fs from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = () =>
  fs.readFileSync(
    resolve(process.cwd(), "app/catana/lobby/[matchID]/MatchPageClient.js"),
    "utf8"
  );

describe("MatchPageClient friend challenge states", () => {
  it("renders pending friend challenge states on the canonical game URL", () => {
    const source = readSource();

    expect(source).toContain("resolveFriendChallengeState");
    expect(source).toContain("pendingChallengeState");
    expect(source).toContain("Challenge created");
    expect(source).toContain("Friend challenge");
    expect(source).toContain("Join game");
    expect(source).toContain("Cancel challenge");
    expect(source).toContain('challengeUrl = `/g/${matchID}`');
    expect(source).toContain('route: `/api/challenges/${matchID}/accept`');
    expect(source).toContain('route: `/api/challenges/${matchID}/cancel`');
    expect(source).not.toContain("/challenge/");
  });

  it("starts an anonymous auth session before writing a guest profile", () => {
    const source = readSource();

    expect(source).toContain('import { authClient } from "../../../../lib/client/authClient"');
    expect(source).toContain("const ensureBetterAuthSession = useCallback");
    expect(source).toContain("authClient.getSession()");
    expect(source).toContain("authClient.signIn.anonymous()");
    expect(source).toMatch(
      /const upsertGuestIdentity = useCallback\([\s\S]*?await ensureBetterAuthSession\(\);[\s\S]*?route: "\/api\/account\/guest"/
    );
  });

  it("defers the live challenge countdown until after hydration", () => {
    const source = readSource();

    expect(source).toContain("function ChallengeExpiryCountdown");
    expect(source).toContain("const [nowMs, setNowMs] = useState(null)");
    expect(source).toContain("formatChallengeExpiry(expiresAt, nowMs)");
    expect(source).not.toContain("expiresAtDate.getTime() - Date.now()");
  });
});
