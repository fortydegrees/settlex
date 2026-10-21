import { notFound } from "next/navigation";
import { UiShowcaseClient } from "./UiShowcaseClient";

export default function StandardUiShowcasePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <UiShowcaseClient />;
}
