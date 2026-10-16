import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const RenameListDialog = ({ list, onClose, onSave }) => {
  const [name, setName] = useState("");
  useEffect(() => setName(list?.name || ""), [list]);
  return (
    <Dialog open={!!list} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="rename-list-dialog" className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Rename list</DialogTitle>
          <DialogDescription>Give “{list?.name}” a new name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(list, name); }}>
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            data-testid="rename-list-input"
            className="h-11 w-full rounded-xl border border-stone-200 px-3.5 text-stone-900 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          <DialogFooter className="mt-5 gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" data-testid="rename-list-cancel">Cancel</button>
            <button type="submit" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700" data-testid="rename-list-save">Save</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteListDialog = ({ list, onClose, onConfirm }) => (
  <AlertDialog open={!!list} onOpenChange={(o) => !o && onClose()}>
    <AlertDialogContent data-testid="delete-list-dialog" className="rounded-2xl sm:max-w-sm">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-display">Delete “{list?.name}”?</AlertDialogTitle>
        <AlertDialogDescription>The list will be removed. Its tasks won't be lost — they'll move to your Inbox.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="delete-list-cancel" className="rounded-full">Cancel</AlertDialogCancel>
        <AlertDialogAction data-testid="delete-list-confirm" onClick={() => onConfirm(list)} className="rounded-full bg-rose-600 hover:bg-rose-700">Delete list</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
