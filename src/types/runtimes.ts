// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

export const runtimes = ['static', 'golang', 'php', 'python', 'nodejs', 'ruby', 'dotnet', 'java', 'docker', 'k3s', 'custom'] as const;

export const dnsProviders = ['cloudflare', 'route53', 'namecheap', 'godaddy'] as const;

export const logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY', 'NOTICE'] as const;
