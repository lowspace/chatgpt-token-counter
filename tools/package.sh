#!/bin/bash

# Define the current date in year-month-day format
current_date=$(date +%Y-%m-%d)

# Define the output zip file name
zip_file_name="chatgpt-token-counter_${current_date}_package.zip"

# Create the zip file including specific files and the dist directory
zip -r "$zip_file_name" background.js content.js manifest.json popup.html popup.js dist

# Confirm the operation
echo "Created zip file: $zip_file_name"