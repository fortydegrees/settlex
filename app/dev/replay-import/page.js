import { notFound } from "next/navigation";
import { ReplayImportClient } from "../../_features/dev/replay-import/ReplayImportClient";

export default function ReplayImportPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ReplayImportClient />;
}
