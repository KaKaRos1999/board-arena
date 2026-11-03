$sourceDir = "D:\งาน\New folder"
$zipFile = "D:\งาน\boardarena-project.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

$filesToZip = Get-ChildItem -Path $sourceDir -Exclude "node_modules", "cloudflared.exe", "boardarena-project.zip" | Select-Object -ExpandProperty FullName
Compress-Archive -Path $filesToZip -DestinationPath $zipFile -Force
Write-Output "Zip created at $zipFile"
