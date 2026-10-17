@echo off
title Skyline Signal
cd /d "%~dp0"
echo Starting Skyline Signal...
echo Keep this window open while using the dashboard.
call npm run dev
