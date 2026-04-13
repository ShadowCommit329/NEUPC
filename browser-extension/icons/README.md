# Icon Generation Instructions

The browser extension requires PNG icons in three sizes:

- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## Using the SVG

An SVG icon has been created at `icons/icon.svg`. You can convert it to PNG using:

### Option 1: ImageMagick (recommended)

```bash
convert -density 300 -background none icon.svg -resize 16x16 icon16.png
convert -density 300 -background none icon.svg -resize 48x48 icon48.png
convert -density 300 -background none icon.svg -resize 128x128 icon128.png
```

### Option 2: Online Tools

- Upload icon.svg to https://cloudconvert.com/svg-to-png
- Convert to 16x16, 48x48, and 128x128 sizes

### Option 3: Inkscape

```bash
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

### Option 4: Browser

1. Open icon.svg in Chrome/Firefox
2. Take a screenshot
3. Resize using an image editor

## Temporary Solution

For development, you can create simple placeholder PNGs or just use any square image with the correct dimensions. The extension will work as long as the files exist.
