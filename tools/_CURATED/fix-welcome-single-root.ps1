# tools/fix-welcome-single-root.ps1
# Full-file replacement for WelcomeScreen.tsx to fix multiple-root JSX error

$ErrorActionPreference = "Stop"

function Backup-File([string]$path) {
  if (Test-Path $path) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item $path "$path.bak_$stamp" -Force
    Write-Host "Backup: $path.bak_$stamp"
  }
}

function WriteUtf8NoBom([string]$path, [string]$content) {
  [IO.File]::WriteAllText(
    $path,
    $content,
    (New-Object System.Text.UTF8Encoding($false))
  )
  Write-Host "Wrote: $path"
}

$path = "src/pages/WelcomeScreen.tsx"
if (!(Test-Path $path)) {
  throw "Missing file: $path"
}

Backup-File $path

$content = @'
import React from "react";

import DefaultWelcome from "../components/welcome/DefaultWelcome";
import ToolGrid from "@/components/tools/ToolGrid";

const WelcomeScreen: React.FC = () => {
  return (
    <>
      <DefaultWelcome />
      <div className="mt-6">
        <ToolGrid />
      </div>
    </>
  );
};

export default WelcomeScreen;
'@

WriteUtf8NoBom $path $content
