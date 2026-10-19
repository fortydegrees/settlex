export { default } from "./page-content.js";

export async function generateMetadata({ params }) {
  params = await params;
  return { title: params?.username ? `${params.username}’s profile` : "Profile" };
}
