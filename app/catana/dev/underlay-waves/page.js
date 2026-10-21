import { notFound } from "next/navigation";
import { UnderlayWavesClient } from "./UnderlayWavesClient";

export default function UnderlayWavesPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <UnderlayWavesClient />;
}
