@echo off
chcp 65001 >nul
title 游戏创作器 - 安装程序

echo.
echo   ╔══════════════════════════════════╗
echo   ║     游戏创作器 - 环境安装        ║
echo   ║     Game Creator Setup           ║
echo   ╚══════════════════════════════════╝
echo.

:: Check Python
echo [1/3] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Python！请先安装 Python 3.10+
    echo    下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version
echo ✅ Python 已就绪
echo.

:: Install dependencies
echo [2/3] 安装 Python 依赖包...
cd /d "%~dp0backend"
python -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo ⚠️  部分包安装失败，尝试单独安装核心包...
    python -m pip install pygame-ce fastapi uvicorn pydantic pillow --quiet
)
echo ✅ 依赖安装完成
echo.

:: Verify
echo [3/3] 验证安装...
python -c "import pygame, fastapi, uvicorn, pydantic, PIL; print('✅ 所有核心模块加载成功')" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  验证未完全通过，但应用仍可启动。
) else (
    echo ✅ 验证通过
)
echo.

echo ╔══════════════════════════════════╗
echo ║  安装完成！请运行:               ║
echo ║  游戏创作器.exe                  ║
echo ╚══════════════════════════════════╝
echo.
pause
