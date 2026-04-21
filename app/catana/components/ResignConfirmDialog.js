import React from "react";
import { AlertDialog } from "../../ui/AlertDialog";

export function ResignConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resign this match?"
      description="You will immediately lose."
      confirmLabel="Resign"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
    />
  );
}
