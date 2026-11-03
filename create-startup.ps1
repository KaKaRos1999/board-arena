$WshShell = New-Object -ComObject WScript.Shell
$startupPath = [Environment]::GetFolderPath('Startup')
$Shortcut = $WshShell.CreateShortcut("$startupPath\BoardArena.lnk")
$Shortcut.TargetPath = 'wscript.exe'
$Shortcut.Arguments = '"D:\งาน\New folder\run-silent.vbs"'
$Shortcut.WorkingDirectory = 'D:\งาน\New folder'
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Output "Startup shortcut created at $startupPath\BoardArena.lnk"
