export async function provisionFriendChallengeGuestIdentity({
  ensureAnonymousSession,
  upsertGuestIdentity,
}) {
  await ensureAnonymousSession();
  return upsertGuestIdentity();
}
