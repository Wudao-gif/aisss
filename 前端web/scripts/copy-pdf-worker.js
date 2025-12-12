/**
 * Post-install script to copy PDF.js worker file to public directory
 * This ensures the PDF viewer has access to the worker file with matching version
 */

const fs = require('fs')
const path = require('path')

const sourceFile = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js')
const destFile = path.join(__dirname, '../public/pdf.worker.min.js')

try {
  // Create public directory if it doesn't exist
  const publicDir = path.dirname(destFile)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Copy the file
  fs.copyFileSync(sourceFile, destFile)
  console.log('✅ PDF worker file copied successfully to public directory')
} catch (error) {
  console.error('❌ Failed to copy PDF worker file:', error.message)
  // Don't fail the install process if copy fails
  process.exit(0)
}

