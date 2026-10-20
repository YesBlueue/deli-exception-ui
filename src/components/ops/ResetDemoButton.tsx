import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetDemo } from "@/lib/services/platform";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
export function ResetDemoButton() {
  const [open, setOpen] = useState(false);
  return <><Button variant="ghost" size="sm" onClick={() => setOpen(true)}><RotateCcw className="size-3.5" />Reset Demo Data</Button><AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset all demo records?</AlertDialogTitle><AlertDialogDescription>This removes submitted complaints, support updates, photos, and event changes from this browser. Demo accounts remain available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { try { resetDemo(); toast.success("Demo records reset"); } catch { toast.error("Unable to reset browser storage."); } }}>Reset Demo Data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}