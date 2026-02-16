import { notFound } from "next/navigation";
import { PaletteBoardPreviewClient } from "./PaletteBoardPreviewClient";

export default function PaletteBoardPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <PaletteBoardPreviewClient />;
}
