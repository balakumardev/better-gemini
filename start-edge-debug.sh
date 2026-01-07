#!/bin/bash
# Start Microsoft Edge with remote debugging enabled for Chrome DevTools MCP
# This allows Claude Code to control and inspect the browser
#
# Each project gets its own:
#   - Debug port (stored in .edge-debug-port)
#   - User data directory (.edge-debug-profile/)
# This allows multiple projects to run debug browsers in parallel.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_FILE="$SCRIPT_DIR/.edge-debug-port"
DEBUG_USER_DATA_DIR="$SCRIPT_DIR/.edge-debug-profile"
EDGE_PATH="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

# Get or generate project-specific port
if [ -f "$PORT_FILE" ]; then
    PORT=$(cat "$PORT_FILE")
else
    # Generate a unique port based on project path hash (range 9222-9999)
    HASH=$(echo -n "$SCRIPT_DIR" | md5 | cut -c1-4)
    PORT=$((16#$HASH % 778 + 9222))
    echo "$PORT" > "$PORT_FILE"
    echo "📝 Generated unique debug port for this project: $PORT"
    echo "   (Stored in .edge-debug-port)"
    echo ""
    echo "⚠️  Remember to update .mcp.json with the correct port:"
    echo "   \"--browser-url=http://127.0.0.1:$PORT\""
    echo ""
fi

# Check if Edge is already running with debugging on this port
if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "✅ Edge is already running with remote debugging on port $PORT"
    curl -s "http://127.0.0.1:$PORT/json/version" | grep -E '"Browser"|"webSocketDebuggerUrl"'
    exit 0
fi

# Create debug profile directory if it doesn't exist
mkdir -p "$DEBUG_USER_DATA_DIR"

echo "🚀 Starting Microsoft Edge with remote debugging on port $PORT..."
echo "   Using project profile at: $DEBUG_USER_DATA_DIR"
"$EDGE_PATH" \
    --remote-debugging-port=$PORT \
    --user-data-dir="$DEBUG_USER_DATA_DIR" \
    --new-window \
    "about:blank" &

# Wait for Edge to start
sleep 2

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "✅ Edge started successfully with remote debugging!"
    echo ""
    echo "Chrome DevTools MCP can now connect to your browser on port $PORT."
else
    echo "❌ Failed to verify Edge debugging port. Please check manually."
    exit 1
fi

