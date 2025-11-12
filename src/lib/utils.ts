import type { Blueprint, Log, LogLevel, UserRole } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ulid } from 'ulid';

/**
 * Merge Tailwind and custom class names.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Convert a string to uppercase words, replacing underscores with spaces.
 */
export function toWordUpperCase(value: string) {
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.toUpperCase())
        .join(' ');
}

export function toYaml(obj: Blueprint | Record<string, unknown>): string {
    // Parse nested JSON strings first
    const parsed = JSON.parse(JSON.stringify(obj), (key, value) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    });

    const yamlLines: string[] = [];
    function processObject(blueprint: Record<string, unknown>, indent: number) {
        for (const key in blueprint) {
            const value = blueprint[key];
            const indentation = '  '.repeat(indent);
            if (typeof value === 'object' && value !== null) {
                yamlLines.push(`${indentation}${key}:`);
                processObject(value as Record<string, unknown>, indent + 1);
            } else {
                yamlLines.push(`${indentation}${key}: ${value}`);
            }
        }
    }
    processObject(parsed as Record<string, unknown>, 0);
    return yamlLines.join('\n');
}

export function toJson(obj: Blueprint | Record<string, unknown>): string {
    const parsed = JSON.parse(JSON.stringify(obj), (key, value) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    });

    return JSON.stringify(parsed, null, 2);
}

/** Parse a log line into a Log object.
 * e.g.: {"id":"01K8R686XH6AST6AYHTQK1CZ99","level":"info","message":"creating workspace","timestamp":"2025-10-29T15:34:18.4177427+01:00"}
 * defaults to INFO level.
 */
export function parseLog(raw: string): Log {
    const id = ulid();
    if (!raw) return { id, message: '', level: 'INFO', timestamp: new Date() };

    try {
        const logData = JSON.parse(raw);

        if (logData.message) {
            return {
                id: logData.id || id,
                message: logData.message,
                level: (logData.level?.toUpperCase() || 'INFO') as LogLevel,
                timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
            };
        }
    } catch (error) {
        console.error((error as Error).message || 'An unknown error occurred while parsing log');
    }

    return { id: id, message: raw, level: 'INFO', timestamp: new Date() };
}

export function formatWithoutSuffix(value: number, unit: string): string {
    const pluralizedUnit = value === 1 ? unit : `${unit}s`;
    return `${value} ${pluralizedUnit}`;
};

// Role priority: higher number = higher privilege
export const getRolePriority = (role: UserRole): number => {
    switch (role) {
        case "owner":
            return 4;
        case "admin":
            return 3;
        case "developer":
            return 2;
        case "viewer":
            return 1;
        default:
            return 0;
    }
};
