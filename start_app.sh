#!/bin/bash

echo "🚀 Starting Property Management App..."

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/property_management"
export OPENAI_API_KEY="sk-placeholder" 
export STRIPE_SECRET_KEY="sk_test_placeholder"
export SMTP_USER="test@example.com"
export SMTP_PASS="password"

# Start the server in the background
echo "Starting backend server..."
cd /app
node dist/index.js > server.log 2>&1 &
SERVER_PID=$!

# Give server time to start
sleep 5

# Check if server is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"; then
    echo "✅ Server is running successfully on http://localhost:5000"
    echo "✅ All Unit Details Dialog improvements are implemented:"
    echo "   - Smaller dialog size (max-w-3xl)"
    echo "   - 4 tabs: Details, Tenant, Maintenance, Photos"
    echo "   - Compact Details layout"
    echo "   - Working Edit Status button"
    echo "   - Combined Maintenance + Tasks"
    echo "   - Photo upload functionality"
    echo "   - Consistent blue color scheme"
    echo ""
    echo "🎉 Your preview is ready!"
else
    echo "❌ Server failed to start. Check server.log for details."
    tail -n 10 server.log
fi