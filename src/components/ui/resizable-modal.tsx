// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon, Expand, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ResizableModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    normalSize?: string;
    expandedSize?: string;
}

function ResizableModalContext() {
    const [isExpanded, setIsExpanded] = React.useState(false);
    return { isExpanded, setIsExpanded };
}

const ResizableModalContextProvider = React.createContext<ReturnType<typeof ResizableModalContext> | null>(null);

function useResizableModal() {
    const context = React.useContext(ResizableModalContextProvider);
    if (!context) {
        throw new Error("useResizableModal must be used within ResizableModal");
    }
    return context;
}

function ResizableModal({
    open,
    onOpenChange,
    children,
    defaultExpanded = false,
}: ResizableModalProps) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <ResizableModalContextProvider.Provider value={{ isExpanded, setIsExpanded }}>
            <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
                {children}
            </DialogPrimitive.Root>
        </ResizableModalContextProvider.Provider>
    );
}

function ResizableModalContent({
    className,
    children,
    normalSize = "max-w-2xl",
    expandedSize = "w-[95vw] max-w-[95vw] h-[90vh]",
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    normalSize?: string;
    expandedSize?: string;
}) {
    const { isExpanded, setIsExpanded } = useResizableModal();

    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                className={cn(
                    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
                )}
            />
            <DialogPrimitive.Content
                className={cn(
                    "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200",
                    isExpanded ? expandedSize : normalSize,
                    className
                )}
                {...props}
            >
                {children}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 rounded-xs opacity-70 transition-opacity focus:outline-hidden"
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                        <span className="sr-only">{isExpanded ? "Minimize" : "Expand"}</span>
                    </Button>
                    <DialogPrimitive.Close className="data-[state=open]:text-muted-foreground h-8 w-8 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                </div>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

function ResizableModalHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
            {...props}
        />
    );
}

function ResizableModalFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
                className
            )}
            {...props}
        />
    );
}

function ResizableModalTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            className={cn("text-lg leading-none font-semibold", className)}
            {...props}
        />
    );
}

function ResizableModalDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    );
}

export {
    ResizableModal,
    ResizableModalContent,
    ResizableModalHeader,
    ResizableModalFooter,
    ResizableModalTitle,
    ResizableModalDescription,
    useResizableModal,
};
