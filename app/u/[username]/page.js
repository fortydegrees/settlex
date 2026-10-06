export { default } from "./page-content.js";

export function generateMetadata({ params }) {
  return { title: params?.username ? `${params.username}’s profile` : "Profile" };
}
