#!/bin/bash
# Package the browser extension for Chrome Web Store submission
# This creates a ZIP file with only production files (no dev files)

echo "========================================"
echo "Packaging for Chrome Web Store..."
echo "========================================"
echo ""

# Output file
OUTPUT_ZIP="huntmaster-chrome-store.zip"

# Remove existing ZIP if it exists
if [ -f "$OUTPUT_ZIP" ]; then
  rm "$OUTPUT_ZIP"
  echo "Removed existing $OUTPUT_ZIP"
fi

# Create ZIP with only production files
echo "Creating ZIP file..."
zip -r "$OUTPUT_ZIP" . \
    -i "manifest.json" \
    -i "background.js" \
    -i "content.js" \
    -i "huntmaster-content.js" \
    -i "popup.html" \
    -i "popup.js" \
    -i "icon16.png" \
    -i "icon48.png" \
    -i "icon128.png"

echo ""
echo "========================================"
echo "SUCCESS!"
echo "========================================"
echo ""
echo "Extension packaged as: $OUTPUT_ZIP"
echo ""
echo "This ZIP file is ready for Chrome Web Store submission."
echo ""
echo "Files included:"
echo "  - manifest.json"
echo "  - background.js"
echo "  - content.js"
echo "  - huntmaster-content.js"
echo "  - popup.html"
echo "  - popup.js"
echo "  - icon16.png, icon48.png, icon128.png"
echo ""
echo "Next steps:"
echo "  1. Upload $OUTPUT_ZIP to Chrome Web Store"
echo "  2. See CHROME_STORE_SUBMISSION.md for complete guide"
echo ""






