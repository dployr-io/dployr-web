// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { DockerImage } from '@/types';

interface Props {
    image: DockerImage;
}

export default function ImageCard({ image }: Props) {
    return (
        <a
            href={`/projects/${image.id}`}
            className="flex h-28 flex-col rounded-xl border border-sidebar-border/70 p-4 no-underline hover:cursor-pointer hover:border-muted-foreground dark:border-sidebar-border dark:hover:border-muted-foreground"
        >
            <div className="mb-2 flex gap-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate">{image.name}</p>
                </div>
            </div>
        </a>
    );
}
