"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { SHOWCASE_ACTIONS } from "./showcase-data";

export function ShowcaseActionReviewModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review recommended action</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 type-body text-text-primary">
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <p className="type-label text-text-tertiary">Action 1</p>
            <p className="mt-1">{SHOWCASE_ACTIONS.pauseKeywords}</p>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <p className="type-label text-text-tertiary">Action 2</p>
            <p className="mt-1">{SHOWCASE_ACTIONS.reallocate}</p>
          </div>
          <p className="type-small text-text-secondary">
            Estimated impact:{" "}
            <span className="font-medium text-success">
              {SHOWCASE_ACTIONS.impact}
            </span>
          </p>
          <p className="type-small text-text-tertiary">
            Aria will only execute after your confirmation.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Confirm action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
