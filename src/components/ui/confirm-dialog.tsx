"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { TriangleAlert } from "lucide-react"

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "default"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              variant === "danger" ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-600"
            )}>
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <p className="text-sm text-neutral-500">{message}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="notion-btn h-8 px-3 text-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "notion-btn h-8 px-3 text-sm text-white",
              variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800"
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
