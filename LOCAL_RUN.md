# 本地启动

- 双击 `start-game.bat`
  - 启动本地服务器
  - 打开 `http://localhost:3003/`
- 双击 `restart-game.bat`
  - 先停止旧的本地服务
  - 再重新启动并打开页面

命令行也可以这样用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-game.ps1
powershell -ExecutionPolicy Bypass -File scripts/restart-local-game.ps1
```
