self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        return;
      }

      if (
        !payload ||
        typeof payload.title !== "string" ||
        typeof payload.matchID !== "string" ||
        typeof payload.url !== "string"
      ) {
        return;
      }

      const notificationPromise = self.registration.showNotification(payload.title, {
        body: typeof payload.body === "string" ? payload.body : "",
        tag:
          typeof payload.tag === "string"
            ? payload.tag
            : `match-alert-${payload.matchID}`,
        icon: "/match-alert-bell.svg",
        badge: "/match-alert-bell.svg",
        data: {
          type: payload.type,
          matchID: payload.matchID,
          url: payload.url,
        },
      });
      const openTabPromise = self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((windowClients) => {
          windowClients.forEach((client) => {
            client.postMessage({
              type: "match-alert-received",
              matchID: payload.matchID,
            });
          });
        });

      await Promise.allSettled([notificationPromise, openTabPromise]);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const data = event.notification.data ?? {};
      const matchID = data.matchID;
      const url = typeof data.url === "string" ? data.url : "/";
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const client = windowClients[0];

      if (client) {
        await client.focus();
        client.postMessage({
          type: "match-alert-click",
          matchID,
          url,
        });
        return;
      }

      await self.clients.openWindow(url);
    })()
  );
});
