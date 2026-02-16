import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface ConfirmationDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  title,
  description,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 bg-terminal-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card-terminal shadow-terminal-glow-strong max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4 pb-4 border-b border-terminal-border">
          <div className="border-2 border-terminal-warning p-2 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-terminal-warning" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-terminal-warning uppercase tracking-wider">{title}</h2>
            <p className="text-xs text-terminal-muted font-mono mt-1">requires confirmation</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-terminal-surface/50 p-3 border border-terminal-border mb-4">
          <p className="text-xs text-terminal-secondary font-mono">{description}</p>
        </div>

        {/* Warning Message */}
        <div className="border-l-4 border-terminal-warning bg-terminal-bg p-3 mb-6 font-mono text-xs text-terminal-warning">
          [ WARNING ] this action will be executed. review details above.
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end border-t border-terminal-border pt-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-terminal text-xs"
          >
            [ CANCEL ]
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-terminal border-terminal-danger text-terminal-danger text-xs hover:bg-terminal-danger hover:text-terminal-bg"
          >
            {isLoading ? '[ ... ]' : '[ CONFIRM ]'}
          </button>
        </div>
      </div>
    </div>
  );
}
