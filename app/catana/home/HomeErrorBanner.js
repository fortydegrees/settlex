"use client";

import { Button } from "../../ui/Button";
import { StatusBanner } from "../components/StatusBanner";

export function HomeErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <StatusBanner
      overlay
      overlayClassName="top-[5.25rem] sm:top-[6.25rem]"
      variant="danger"
      title="Lobby error"
      body={error}
      className="max-w-md"
      actions={
        <Button variant="subtle" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      }
    />
  );
}
