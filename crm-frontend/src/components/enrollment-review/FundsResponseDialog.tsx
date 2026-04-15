import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { FundsResponse } from "@/lib/types/enrollmentReview";

interface FundsResponseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  response: FundsResponse | null;
}

export function FundsResponseDialog({ isOpen, onClose, response }: FundsResponseDialogProps) {
  if (!response) return null;

  const isSuccess = response.success;
  const Icon = isSuccess ? CheckCircle : XCircle;
  const iconColor = isSuccess ? "text-green-500" : "text-red-500";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            Transaction {isSuccess ? "Successful" : "Failed"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isSuccess ? (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  {response.message}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {response.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">${response.amount}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="ml-2 font-mono text-sm">{response.mt5_account_id}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 dark:text-red-200 font-medium">
                      Transaction Failed
                    </p>
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                      {response.error || "An unknown error occurred"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Attempted Action:</span>
                  <Badge variant="outline" className="ml-2 capitalize">
                    {response.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">${response.amount}</span>
                </div>
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full" variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}