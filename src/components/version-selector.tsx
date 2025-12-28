// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { AlertCircle, AlertTriangle, Check, ChevronDown, Download, ExternalLink, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useVersion } from "@/hooks/use-version";

const normalizeVersionValue = (version?: string | null) => (version ?? "").replace(/^v/i, "");

const compareVersions = (a: string, b: string) => {
  const normalizedA = normalizeVersionValue(a);
  const normalizedB = normalizeVersionValue(b);

  const splitVersion = (version: string) => {
    const [mainVersion, preRelease] = version.split("-");
    const mainParts = mainVersion.split(".").map(part => parseInt(part, 10) || 0);
    return { mainParts, preRelease };
  };

  const versionA = splitVersion(normalizedA);
  const versionB = splitVersion(normalizedB);

  const maxLength = Math.max(versionA.mainParts.length, versionB.mainParts.length, 3);
  while (versionA.mainParts.length < maxLength) versionA.mainParts.push(0);
  while (versionB.mainParts.length < maxLength) versionB.mainParts.push(0);

  for (let i = 0; i < maxLength; i++) {
    const diff = versionA.mainParts[i] - versionB.mainParts[i];
    if (diff !== 0) return diff;
  }

  if (!versionA.preRelease && !versionB.preRelease) return 0;
  if (!versionA.preRelease) return 1;
  if (!versionB.preRelease) return -1;

  const prePartsA = versionA.preRelease.split(".");
  const prePartsB = versionB.preRelease.split(".");
  const preMaxLength = Math.max(prePartsA.length, prePartsB.length);

  for (let i = 0; i < preMaxLength; i++) {
    const partA = prePartsA[i] || "";
    const partB = prePartsB[i] || "";
    
    const numA = parseInt(partA, 10);
    const numB = parseInt(partB, 10);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      const diff = numA - numB;
      if (diff !== 0) return diff;
    } else {
      const diff = partA.localeCompare(partB);
      if (diff !== 0) return diff;
    }
  }

  return 0;
};

interface VersionSelectorProps {
  currentVersion: string;
  latestVersion?: string;
  upgradeLevel?: "patch" | "minor" | "major";
  onInstall: (version: string) => Promise<void>;
  isInstalling?: boolean;
}

export function VersionSelector({ currentVersion, latestVersion, upgradeLevel, onInstall, isInstalling }: VersionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showPreReleases, setShowPreReleases] = useState(false);
  const [showUnsupported, setShowUnsupported] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const { availableVersions: versionsData, isLoading } = useVersion({
    showPreReleases,
    enableAvailableVersions: open,
  });

  const normalizedCurrentVersion = normalizeVersionValue(currentVersion);
  const hasUpdate = latestVersion && normalizeVersionValue(latestVersion) !== normalizedCurrentVersion;
  const isMatchesCurrent = selectedVersion ? normalizeVersionValue(selectedVersion) === normalizedCurrentVersion : false;
  const shouldDisableInstall = isInstalling || (!selectedVersion && !hasUpdate) || isMatchesCurrent;
  const buttonLabel = isInstalling ? "Installing..." : isMatchesCurrent ? "Installed" : "Install";
  const buttonIcon = isInstalling ? <Loader2 className="h-3 w-3 animate-spin" /> : isMatchesCurrent ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />;

  const isVersionDeprecated = (version: string) => {
    if (!versionsData?.oldestSupportedVersion) {
      return false;
    }
    return compareVersions(version, versionsData.oldestSupportedVersion) < 0;
  };

  const visibleVersions = versionsData 
    ? versionsData.versions
        .filter(version => showUnsupported || !isVersionDeprecated(version))
        .sort((a, b) => compareVersions(b, a))
    : [];
  const hasDeprecatedVersions = versionsData ? versionsData.versions.some(isVersionDeprecated) : false;

  const handleInstall = async () => {
    const version = selectedVersion || latestVersion;
    if (!version) return;
    await onInstall(version);
    setOpen(false);
    setSelectedVersion(null);
  };

  const getUpgradeIcon = () => {
    if (!hasUpdate) return <ChevronDown className="h-3 w-3" />;
    if (upgradeLevel === "major") return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (upgradeLevel === "minor") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span>{currentVersion}</span>
          {getUpgradeIcon()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* Header */}
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Install new dployrd version</p>
          {hasUpdate && (
            <p className="text-xs text-muted-foreground">{upgradeLevel === "major" ? "Major update available" : upgradeLevel === "minor" ? "Minor update available" : "Patch available"}</p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Version list */}
        <div className="max-h-48 overflow-y-auto px-1 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : versionsData?.versions.length ? (
            visibleVersions.length ? (
              visibleVersions.map(version => {
                const isSelected = selectedVersion === version || (!selectedVersion && version === latestVersion);
                const normalizedVersion = normalizeVersionValue(version);
                const isCurrent = normalizedVersion === normalizedCurrentVersion;
                const isDeprecated = isVersionDeprecated(version);
                const versionLabelClasses = isCurrent ? "text-muted-foreground" : "";

                return (
                  <button
                    key={version}
                    onClick={() => setSelectedVersion(version)}
                    className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors ${isSelected ? "bg-accent" : "hover:bg-accent/50"}`}
                  >
                    <span className={`flex items-center gap-2 ${versionLabelClasses}`}>
                      <span>
                        {version}
                        {isCurrent && <span className="ml-1 text-xs">(current)</span>}
                        {normalizeVersionValue(version) === normalizeVersionValue(versionsData.latest) && !isCurrent && <span className="ml-1 text-xs text-green-500">(latest)</span>}
                      </span>
                      {isDeprecated && <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="Unsupported" />}
                    </span>
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                );
              })
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No supported versions available. Enable "Show unsupported versions" to view all versions.</p>
            )
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No versions available</p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Footer */}
        <div className="p-2 space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showPreReleases} onChange={e => setShowPreReleases(e.target.checked)} className="h-3 w-3 rounded border-input" />
            Include pre-releases
          </label>

          {hasDeprecatedVersions && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showUnsupported} onChange={e => setShowUnsupported(e.target.checked)} className="h-3 w-3 rounded border-input" />
              Show unsupported versions
            </label>
          )}

          {hasDeprecatedVersions && (
            <div className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] leading-tight text-muted-foreground">
              Versions older than {versionsData?.oldestSupportedVersion ?? "the minimum supported build"} may not work correctly.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleInstall} disabled={shouldDisableInstall}>
              {buttonIcon}
              {buttonLabel}
            </Button>
            {(selectedVersion || latestVersion) && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                <a href={`https://github.com/dployr-io/dployr/releases/tag/${selectedVersion || latestVersion}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
