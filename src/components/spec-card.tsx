import type { Deployment } from "@/types";

interface Props {
    blueprint?: Deployment;
}

export default function SpecCard({ blueprint }: Props) {
    return (
        <a
            href={`/projects/${blueprint?.id}`}
            className="flex h-28 flex-col rounded-xl border border-sidebar-border/70 p-4 no-underline hover:cursor-pointer hover:border-muted-foreground dark:border-sidebar-border dark:hover:border-muted-foreground"
        >
            <div className="mb-2 flex gap-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate">{blueprint?.config.name}</p>
                </div>
            </div>
        </a>
    );
}
