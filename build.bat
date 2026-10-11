@echo off
echo ====================================================
echo  Building Real Cricket 24 (PC Edition) with Raylib
echo ====================================================

set CC=C:\msys64\ucrt64\bin\gcc.exe
set CFLAGS=-O2 -Wall -Isrc
set LDFLAGS=-lraylib -lopengl32 -lgdi32 -lwinmm -lm

%CC% %CFLAGS% src\audio_synth.c src\physics.c src\render_3d.c src\ui.c src\main.c -o cricket_game.exe %LDFLAGS%

if %ERRORLEVEL% equ 0 (
    if exist C:\msys64\ucrt64\bin\libraylib.dll copy /Y C:\msys64\ucrt64\bin\libraylib.dll . >nul 2>&1
    if exist C:\msys64\ucrt64\bin\glfw3.dll copy /Y C:\msys64\ucrt64\bin\glfw3.dll . >nul 2>&1
    echo.
    echo ====================================================
    echo  Build Successful! Created cricket_game.exe
    echo  Required runtime DLLs are ready in the folder.
    echo ====================================================
) else (
    echo.
    echo [ERROR] Build Failed! Check errors above.
)
