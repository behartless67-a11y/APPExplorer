@echo off
echo Starting local web server on port 8080...
echo Open your browser to: http://localhost:8080/app.html
echo Press Ctrl+C to stop the server
cd /d "%~dp0"
python -m http.server 8080
