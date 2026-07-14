import webPush from "web-push";
import {
  deleteMatchAlertSubscriptionsByEndpoint,
  recordMatchAlertDelivery,
} from "./matchAlertStore.js";
import {
  createSafePushAgent,
  isSafePushEndpoint,
} from "./pushEndpointSecurity.js";
import { getWebPushConfig } from "./webPushConfig.js";

const DELIVERY_TIMEOUT_MS = 10_000;
const DELIVERY_CONCURRENCY = 4;

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
  dnsLookupImpl,
  deleteExpiredImpl = deleteMatchAlertSubscriptionsByEndpoint,
  recordDeliveryImpl = recordMatchAlertDelivery,
} = {}) {
  const attempted = subscriptions.length;
  let summary;

  if (!config.configured) {
    summary = { attempted, delivered: 0, expired: 0, failed: attempted };
  } else {
    const payload = JSON.stringify(buildMatchAlertPayload({ matchID, seekerName }));
    const agent = createSafePushAgent({ dnsLookupImpl });
    const options = {
      TTL: 300,
      agent,
      timeout: DELIVERY_TIMEOUT_MS,
      vapidDetails: {
        subject: config.subject,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
      },
    };
    const results = Array(subscriptions.length);
    const invalidEndpoints = [];
    const deliverable = subscriptions.flatMap((subscription, index) => {
      if (isSafePushEndpoint(subscription.endpoint)) {
        return [{ subscription, index }];
      }
      invalidEndpoints.push(subscription.endpoint);
      results[index] = {
        status: "rejected",
        reason: Object.assign(new Error("Unsafe push endpoint."), {
          code: "ERR_PRIVATE_PUSH_ENDPOINT",
        }),
      };
      return [];
    });

    for (let index = 0; index < deliverable.length; index += DELIVERY_CONCURRENCY) {
      const batch = deliverable.slice(index, index + DELIVERY_CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(({ subscription }) =>
          Promise.resolve().then(() =>
            webPushImpl.sendNotification(
              toPushSubscription(subscription),
              payload,
              options
            )
          )
        )
      );
      settled.forEach((result, batchIndex) => {
        results[batch[batchIndex].index] = result;
      });
    }
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

    const removableEndpoints = [...invalidEndpoints, ...expiredEndpoints];
    if (removableEndpoints.length > 0) {
      await deleteExpiredImpl({ endpoints: removableEndpoints });
    }
  }

  await recordDeliveryImpl({ matchID, ...summary });
  return summary;
}
