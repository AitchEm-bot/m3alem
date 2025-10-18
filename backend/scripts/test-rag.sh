#!/bin/bash

# Test RAG endpoints
# This script performs basic sanity checks on the RAG system

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"

echo "======================================"
echo "  M3alem RAG System Sanity Check"
echo "======================================"
echo ""

# Check if server is running
echo "1. Checking server health..."
if curl -s "$BACKEND_URL/" | grep -q "ok"; then
  echo "✓ Server is running"
else
  echo "✗ Server is not responding"
  exit 1
fi
echo ""

# Test RAG query endpoint
echo "2. Testing RAG query endpoint..."
QUERY_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is force?",
    "top_k": 3
  }')

if echo "$QUERY_RESPONSE" | grep -q "query"; then
  echo "✓ RAG query endpoint is working"
  echo "Response: $QUERY_RESPONSE"
else
  echo "✗ RAG query endpoint failed"
  echo "Response: $QUERY_RESPONSE"
fi
echo ""

# Test image upload endpoint (if available)
echo "3. Testing image upload endpoint..."
# Create a small test image if it doesn't exist
if [ ! -f /tmp/test-image.png ]; then
  # Create a 1x1 pixel PNG (smallest valid PNG)
  echo "Creating test image..."
  echo -e '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90\x77\x53\xde\x00\x00\x00\x0c\x49\x44\x41\x54\x08\xd7\x63\xf8\xff\xff\x3f\x00\x05\xfe\x02\xfe\xdc\xcc\x59\xe7\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > /tmp/test-image.png
fi

UPLOAD_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/upload-image" \
  -F "image=@/tmp/test-image.png")

if echo "$UPLOAD_RESPONSE" | grep -q "image_id"; then
  echo "✓ Image upload endpoint is working"
  echo "Response: $UPLOAD_RESPONSE"
else
  echo "⚠ Image upload endpoint may have issues"
  echo "Response: $UPLOAD_RESPONSE"
fi
echo ""

echo "======================================"
echo "  Sanity check complete!"
echo "======================================"
echo ""
echo "Note: To test RAG ingestion, upload a PDF using:"
echo "curl -X POST $BACKEND_URL/api/rag/ingest \\"
echo "  -F 'file=@/path/to/your/document.pdf' \\"
echo "  -F 'source=Your Document Name'"
echo ""
