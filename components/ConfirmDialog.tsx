"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HelpCircle, Loader2, X } from "lucide-react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** optional input field (e.g. note, new password) */
  input?: {
    label: string;
    placeholder?: string;
    type?: string;
    required?: boolean;
    minLength?: number;
  };
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  input,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const inputInvalid =
    !!input &&
    ((input.required && !value.trim()) ||
      (!!input.minLength && value.length > 0 && value.length < input.minLength) ||
      (!!input.minLength && input.required && value.length < input.minLength));

  function submit() {
    if (busy || inputInvalid) return;
    onConfirm(value);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="relative card w-full max-w-md p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                  danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                {danger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="font-semibold text-base">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
                )}
              </div>
            </div>

            {input && (
              <div className="mt-5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  {input.label}
                </label>
                <input
                  autoFocus
                  className="input"
                  type={input.type || "text"}
                  placeholder={input.placeholder}
                  minLength={input.minLength}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
                {input.minLength ? (
                  <p className="text-[11px] text-muted-foreground mt-1.5">min {input.minLength} characters</p>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button className="btn-ghost" onClick={onClose} disabled={busy}>
                {cancelLabel}
              </button>
              <button
                className={danger ? "btn-danger" : "btn-primary"}
                onClick={submit}
                disabled={busy || inputInvalid}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
