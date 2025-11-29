// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from '@/components/ui/button';
import type { BlueprintFormat } from '@/types';
import { Copy } from 'lucide-react';

interface Props {
    name: string;
    yamlConfig: string;
    jsonConfig: string;
    blueprintFormat: BlueprintFormat;
    setBlueprintFormat: (arg0: BlueprintFormat) => void;
    handleBlueprintCopy: () => void;
}

export function BlueprintSection({ yamlConfig, jsonConfig, blueprintFormat, setBlueprintFormat, handleBlueprintCopy }: Props) {
    return (
        <div className="relative rounded border bg-background">
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-md bg-background p-1 shadow-sm border">
                    <Button
                        type="button"
                        variant={blueprintFormat === 'yaml' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setBlueprintFormat('yaml')}
                        className="h-5 px-2 text-xs"
                    >
                        YAML
                    </Button>
                    <Button
                        type="button"
                        variant={blueprintFormat === 'json' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setBlueprintFormat('json')}
                        className="h-5 px-2 text-xs"
                    >
                        JSON
                    </Button>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleBlueprintCopy} className="shadow-sm border bg-background">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>

            <pre className="overflow-x-auto p-4 pr-32 font-mono text-sm whitespace-pre-wrap">
                <code>{blueprintFormat === 'yaml' ? yamlConfig : jsonConfig}</code>
            </pre>
        </div>
    );
}
