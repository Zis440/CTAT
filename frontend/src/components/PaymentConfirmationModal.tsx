import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface PaymentBreakdownItem {
  label: string;
  value: React.ReactNode;
  isTotal?: boolean;
  isDiscount?: boolean;
  isBalance?: boolean;
  isInsufficient?: boolean;
}

export interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;

  breakdownItems?: PaymentBreakdownItem[];

  showValidationCheck?: boolean;
  isValidationRequested?: boolean;
  onValidationChange?: (checked: boolean) => void;
  validationPrice?: string;
  validationDescription?: React.ReactNode;

  warningMessage?: React.ReactNode;

  onConfirm: () => void;
  confirmText?: React.ReactNode;
  isConfirming?: boolean;
  onCancel?: () => void;
  cancelText?: React.ReactNode;

  hasInsufficientBalance?: boolean;
  onRechargeClick?: () => void;

  customConfirmButton?: React.ReactNode;

  secondaryAction?: React.ReactNode;
}

export function PaymentConfirmationModal({
  isOpen,
  onOpenChange,
  title,
  description,
  breakdownItems = [],
  showValidationCheck = false,
  isValidationRequested = false,
  onValidationChange,
  validationPrice = "₹100",
  validationDescription,
  warningMessage,
  onConfirm,
  confirmText,
  isConfirming = false,
  onCancel,
  cancelText = "Cancel",
  hasInsufficientBalance = false,
  onRechargeClick,
  customConfirmButton,
  secondaryAction,
}: PaymentConfirmationModalProps) {

  const handleCancel = () => {
    if (onCancel) onCancel();
    else onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left mt-2">
              {typeof description === "string" ? <p className="text-sm text-muted-foreground">{description}</p> : description}

              {breakdownItems.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-xl space-y-2.5 border border-border/40 text-sm">
                  {breakdownItems.map((item, index) => {
                    if (item.isTotal) {
                      return (
                        <div key={index} className="flex justify-between border-t border-border/50 pt-2.5 font-bold text-foreground text-base">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                      );
                    }
                    if (item.isBalance) {
                      return (
                        <div key={index} className="flex justify-between text-xs text-muted-foreground pt-1.5 border-t border-dashed border-border/30">
                          <span>{item.label}</span>
                          <span className={item.isInsufficient ? "text-red-500 font-semibold" : "text-green-600 dark:text-green-400 font-semibold"}>
                            {item.value}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={index} className={`flex justify-between ${item.isDiscount ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        <span>{item.label}</span>
                        <span className={`font-medium ${item.isDiscount ? '' : 'text-foreground'}`}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {showValidationCheck && onValidationChange && (
                <div className="flex items-start space-x-3 bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <Checkbox
                    id={`validation-check-${title?.toString().replace(/\s+/g, '-')}`}
                    checked={isValidationRequested}
                    onCheckedChange={(checked) => onValidationChange(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 leading-none">
                    <label
                      htmlFor={`validation-check-${title?.toString().replace(/\s+/g, '-')}`}
                      className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary"
                    >
                      Validate by an RCI Verified Psychologist ({validationPrice})
                    </label>
                    {validationDescription && (
                      <p className="text-xs text-muted-foreground">
                        {validationDescription}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {hasInsufficientBalance && (
                <p className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200 dark:border-red-900/30">
                  ⚠️ You do not have enough balance to start this session. Please recharge.
                </p>
              )}

              {warningMessage && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg p-3 text-xs mt-2 font-medium flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    {warningMessage}
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex w-full items-center justify-between gap-3 sm:gap-0 flex-col-reverse sm:flex-row">
            <div className="flex items-center w-full sm:w-auto justify-start">
              {secondaryAction}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
              {hasInsufficientBalance && onRechargeClick ? (
                <AlertDialogAction onClick={onRechargeClick} className="bg-primary hover:bg-primary/90">
                  Recharge Wallet
                </AlertDialogAction>
              ) : customConfirmButton ? (
                customConfirmButton
              ) : (
                <AlertDialogAction onClick={onConfirm} disabled={isConfirming}>
                  {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {confirmText}
                </AlertDialogAction>
              )}
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
