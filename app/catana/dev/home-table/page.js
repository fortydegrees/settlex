import { notFound } from "next/navigation";
import { HomeTableClient } from "../../home/HomeTableClient";

export default function HomeTablePrototypePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <HomeTableClient />;
}
