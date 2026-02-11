"use client";

import { AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MatchErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    error: string | null;
}

export default function MatchErrorModal({
    isOpen,
    onClose,
    error,
}: MatchErrorModalProps) {
    if (!error) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-red-500/20 bg-[#0f172a] text-white">
                <DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-center">
                            Oups !
                        </DialogTitle>
                        <p className="text-center text-sm text-gray-400 leading-relaxed max-w-[90%]">
                            {error}
                        </p>
                    </div>
                </DialogHeader>
                <div className="flex justify-center p-4 pt-0">
                    <Button
                        onClick={onClose}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 rounded-full"
                    >
                        Compris
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
