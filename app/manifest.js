export default function manifest() {
  return {
    name: "SettleHex",
    short_name: "SettleHex",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#bfdbfe",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/match-alert-bell.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
