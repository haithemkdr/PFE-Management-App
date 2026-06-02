// ConfirmModal.jsx — Reusable modern confirmation dialog
// Replaces native window.confirm() across the application
import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, ShieldAlert } from 'lucide-react';
import './ConfirmModal.css';

const ICON_MAP = {
  danger:  Trash2,
  warning: AlertTriangle,
  info:    Info,
};

/**
 * @param {Object} props
 * @param {boolean}  props.open          — show / hide
 * @param {string}   props.title         — modal heading
 * @param {string}   props.message       — descriptive body text (supports \n)
 * @param {string}  [props.variant]      — 'danger' | 'warning' | 'info'  (default: 'danger')
 * @param {string}  [props.confirmText]  — label for confirm button  (default: 'Confirmer')
 * @param {string}  [props.cancelText]   — label for cancel button   (default: 'Annuler')
 * @param {Function} props.onConfirm     — called on confirm
 * @param {Function} props.onCancel      — called on cancel / overlay click / Escape
 * @param {React.ReactNode} [props.icon] — custom icon override
 */
export default function ConfirmModal({
  open,
  title,
  message,
  variant = 'danger',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  icon,
}) {
  const [closing, setClosing] = useState(false);
  const confirmRef = useRef(null);

  // Focus the confirm button when the dialog opens (keyboard accessibility)
  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  // Close with exit animation
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onCancel?.();
    }, 180);
  }, [onCancel]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  if (!open) return null;

  const IconComponent = icon || ICON_MAP[variant] || AlertTriangle;

  return (
    <div
      className={`confirm-modal-overlay${closing ? ' confirm-modal-overlay--closing' : ''}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        {/* Icon */}
        <div className="confirm-modal__header">
          <div className={`confirm-modal__icon-wrapper confirm-modal__icon-wrapper--${variant}`}>
            <IconComponent size={24} />
          </div>
        </div>

        {/* Body */}
        <div className="confirm-modal__body">
          <h3 className="confirm-modal__title" id="confirm-modal-title">{title}</h3>
          <p className="confirm-modal__message">{message}</p>
        </div>

        {/* Actions */}
        <div className="confirm-modal__actions">
          <button className="confirm-modal__btn confirm-modal__btn--cancel" onClick={handleClose}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            className={`confirm-modal__btn confirm-modal__btn--${variant}`}
            onClick={() => {
              setClosing(true);
              setTimeout(() => {
                setClosing(false);
                onConfirm?.();
              }, 180);
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
