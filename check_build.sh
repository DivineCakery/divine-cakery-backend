#!/bin/bash
cd /app/frontend

echo "============================================"
echo "Checking EAS Build Status"
echo "============================================"
echo ""

eas build:list --limit 1 --non-interactive 2>&1 | head -25

echo ""
echo "============================================"
echo "Build Details:"
echo "- Version: 1.0.12"
echo "- Version Code: 59" 
echo "- Build ID: cb0c8856-5a4f-41a4-acd7-afb52a53b837"
echo "- Logs: https://expo.dev/accounts/divinecakery/projects/divine-cakery/builds/cb0c8856-5a4f-41a4-acd7-afb52a53b837"
echo "============================================"
echo ""
echo "To download when complete, run:"
echo "cd /app/frontend && eas build:list --limit 1 --non-interactive"
echo ""
echo "Then download the AAB file from the 'Build Artifacts URL'"
echo "============================================"
