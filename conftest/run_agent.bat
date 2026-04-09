@echo off
cd /d "C:\Users\MEH24285\Project\conftest"
set CLAUDE_CODE_GIT_BASH_PATH=C:\Users\MEH24285\AppData\Local\Programs\Git\bin\bash.exe
python confluence_agent_sdk.py >> "C:\Users\MEH24285\Project\conftest\agent.log" 2>&1
