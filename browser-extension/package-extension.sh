#!/bin/bash
# Package the browser extension for distribution
# Creates a ZIP file that users can download and extract

echo "Packaging HuntMaster Browser Extension..."
echo ""

# Create ZIP file excluding development files
zip -r huntmaster-extension.zip . \
    -x "package-extension.bat" \
    -x "package-extension.sh" \
    -x "INSTALLATION.md" \
    -x "README.md" \
    -x ".git*" \
    -x "*.git*" \
    -x "create-icons.html"

echo ""
echo "Done! Extension packaged as: huntmaster-extension.zip"
echo ""
echo "Users can download this ZIP file, extract it, and load it as an unpacked extension."




