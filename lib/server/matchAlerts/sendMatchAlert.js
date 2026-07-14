import webPush from "web-push";
import {
  deleteMatchAlertSubscriptionsByEndpoint,
  recordMatchAlertDelivery,
} from "./matchAlertStore.js";
import { getWebPushConfig } from "./webPushConfig.js";

export function buildMatchAlertPayload({ matchID, seekerName } = {}) {
  const publicName = seekerName || null;
  return {
    type: "match-alert",
    matchID,
    seekerName: publicName,
    title: publicName
      ? `⚔️ ${publicName} is looking for a duel`
      : "⚔️ Someone is looking for a duel",
    body: "Tap to see if the table is still open.",
    url: `/?matchAlert=${encodeURIComponent(matchID)}`,
    tag: `match-alert-${matchID}`,
  };
}

const toPushSubscription = (subscription) => ({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.p256dh,
    auth: subscription.auth,
  },
});

const isExpired = (result) =>
  result.status === "rejected" &&
  (result.reason?.statusCode === 404 || result.reason?.statusCode === 410);

export async function sendMatchAlert({
  matchID,
  seekerName,
  subscriptions = [],
  webPush: webPushImpl = webPush,
  config = getWebPushConfig(),
  deleteExpiredImpl = deleteMatchAlertSubscriptionsByEndpoint,
  recordDeliveryImpl = recordMatchAlertDelivery,
} = {}) {
  const attempted = subscriptions.length;
  let summary;

  if (!config.configured) {
    summary = { attempted, delivered: 0, expired: 0, failed: attempted };
  } else {
    const payload = JSON.stringify(buildMatchAlertPayload({ matchID, seekerName }));
    const options = {
      TTL: 300,
      vapidDetails: {
        subject: config.subject,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
      },
    };
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        Promise.resolve().then(() =>
          webPushImpl.sendNotification(
            toPushSubscription(subscription),
            payload,
            options
          )
        )
      )
    );
    const expiredEndpoints = results.flatMap((result, index) =>
      isExpired(result) ? [subscriptions[index].endpoint] : []
    );
    const delivered = results.filter((result) => result.status === "fulfilled").length;
    const expired = expiredEndpoints.length;
    summary = {
      attempted,
      delivered,
      expired,
      failed: attempted - delivered - expired,
    };

    if (expiredEndpoints.length > 0) {
      await deleteExpiredImpl({ endpoints: expiredEndpoints });
    }
  }

  await recordDeliveryImpl({ matchID, ...summary });
  return summary;
}
