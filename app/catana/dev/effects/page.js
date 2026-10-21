import { notFound } from "next/navigation";
import { EffectsLabClient } from "./EffectsLabClient";

export default function EffectsLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <EffectsLabClient />;
}
