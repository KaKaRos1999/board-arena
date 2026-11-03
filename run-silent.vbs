Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\งาน\New folder"
WshShell.Run "cmd.exe /c node server.js", 0, False
WScript.Sleep 2000
WshShell.Run "cmd.exe /c .\cloudflared.exe tunnel --config config.yml run boardarena", 0, False
