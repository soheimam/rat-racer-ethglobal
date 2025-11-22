#!/bin/bash
echo "🔍 Verifying Rat Racer Setup..."
echo ""

errors=0
warnings=0

# Check key directories
echo "📁 Checking directories..."
for dir in "components" "lib" "app/race/[id]" "public/models" "public/city" "public/images"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir"
    else
        echo "  ❌ $dir MISSING"
        ((errors++))
    fi
done
echo ""

# Check key files
echo "📄 Checking key files..."
files=(
    "components/racetrack.tsx"
    "components/rat-entity.tsx"
    "components/error-boundary.tsx"
    "lib/mock-data.ts"
    "lib/schema.ts"
    "lib/utils.ts"
    "app/race/[id]/page.tsx"
    "app/page.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        ((errors++))
    fi
done
echo ""

# Check 3D models
echo "🐀 Checking rat models..."
for i in {1..6}; do
    if [ -f "public/models/rat-$i/rat.gltf" ]; then
        echo "  ✅ rat-$i"
    else
        echo "  ❌ rat-$i MISSING"
        ((errors++))
    fi
done
echo ""

# Check images
echo "🖼️  Checking images..."
for img in "white.png" "pink.png" "brown.png"; do
    if [ -f "public/images/$img" ]; then
        echo "  ✅ $img"
    else
        echo "  ❌ $img MISSING"
        ((errors++))
    fi
done
echo ""

# Check audio (warning only)
echo "🎵 Checking audio files..."
if [ -d "public/audio" ]; then
    if [ -f "public/audio/rat-racer.mp3" ] && [ -f "public/audio/neon-skys.mp3" ]; then
        echo "  ✅ Audio files found"
    else
        echo "  ⚠️  Audio directory exists but files missing"
        echo "     Add: rat-racer.mp3, neon-skys.mp3"
        ((warnings++))
    fi
else
    echo "  ⚠️  Audio directory not found (races will be silent)"
    echo "     Create: mkdir public/audio"
    ((warnings++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $errors -eq 0 ]; then
    echo "✅ Setup verification complete!"
    if [ $warnings -gt 0 ]; then
        echo "⚠️  $warnings warning(s) - see above"
    fi
    echo ""
    echo "🚀 Ready to run: npm run dev"
else
    echo "❌ $errors critical error(s) found"
    echo "⚠️  $warnings warning(s)"
    echo ""
    echo "Please fix errors before running the app"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
