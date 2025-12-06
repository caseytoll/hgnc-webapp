#!/bin/bash

# Asset Adder Script for HGNC WebApp
# Usage: ./add-asset.sh <image-file> <asset-name>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <image-file> <asset-name>"
    echo "Example: $0 assets/my-icon.png my-icon"
    exit 1
fi

IMAGE_FILE="$1"
ASSET_NAME="$2"
ASSET_FILE="${ASSET_NAME}-code.html"

if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: Image file '$IMAGE_FILE' not found"
    exit 1
fi

# Get file extension to determine MIME type
EXTENSION="${IMAGE_FILE##*.}"
case "$EXTENSION" in
    "png") MIME_TYPE="image/png" ;;
    "jpg"|"jpeg") MIME_TYPE="image/jpeg" ;;
    "svg") MIME_TYPE="image/svg+xml" ;;
    "gif") MIME_TYPE="image/gif" ;;
    *) echo "Error: Unsupported file type '$EXTENSION'"; exit 1 ;;
esac

echo "Converting $IMAGE_FILE to base64 data URL..."
echo -n "data:$MIME_TYPE;base64," > "$ASSET_FILE"
base64 -i "$IMAGE_FILE" >> "$ASSET_FILE"

echo "Created asset file: $ASSET_FILE"
echo ""
echo "Next steps:"
echo "1. Add a loader function to Code.js (see existing examples)"
echo "2. Add the data URL to the template object"
echo "3. Use <?!= ${ASSET_NAME}DataUrl ?> in your HTML"