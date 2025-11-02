#!/bin/bash
# Script to start Node.js server on hosting

echo "🚀 Starting SweetDelight server..."
echo ""

# Check if server is already running
if lsof -i:5001 > /dev/null 2>&1; then
    PID=$(lsof -t -i:5001)
    echo "⚠️  Server is already running on port 5001 (PID: $PID)"
    echo "   Stopping existing process..."
    kill $PID
    sleep 2
fi

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    echo ""
    echo "Starting server with PM2..."
    
    # Check if already running in PM2
    if pm2 list | grep -q "SweetDelight"; then
        echo "   Restarting existing PM2 process..."
        pm2 restart SweetDelight
    else
        echo "   Starting new PM2 process..."
        # Change to project directory
        cd "$(dirname "$0")"
        
        # Start with PM2
        pm2 start npm --name "SweetDelight" -- start
        pm2 save
        
        echo "   Server started with PM2"
        echo "   Use 'pm2 logs SweetDelight' to view logs"
        echo "   Use 'pm2 status' to check status"
    fi
    
    # Wait a bit and check
    sleep 3
    if lsof -i:5001 > /dev/null 2>&1; then
        echo ""
        echo "✅ Server is running on port 5001"
        echo ""
        echo "Testing API endpoint..."
        curl -s http://localhost:5001/api/test | head -c 100
        echo ""
    else
        echo ""
        echo "❌ Server failed to start. Check logs:"
        echo "   pm2 logs SweetDelight"
    fi
    
elif command -v npm &> /dev/null; then
    echo "⚠️  PM2 not found, starting with npm directly (foreground)..."
    echo "   Note: This will block the terminal. Use Ctrl+C to stop."
    echo "   Consider installing PM2: npm install -g pm2"
    echo ""
    
    cd "$(dirname "$0")"
    npm start
    
else
    echo "❌ Neither PM2 nor npm found!"
    exit 1
fi

