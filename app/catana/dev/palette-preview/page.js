import { notFound } from "next/navigation";
import { PaletteBoardPreviewClient } from "../../../_features/dev/palette-preview/PaletteBoardPreviewClient";

export default function PaletteBoardPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <PaletteBoardPreviewClient />;
}
