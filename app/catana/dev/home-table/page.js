import { notFound } from "next/navigation";
import { HomeTablePrototypeClient } from "./HomeTablePrototypeClient";

export default function HomeTablePrototypePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <HomeTablePrototypeClient />;
}
