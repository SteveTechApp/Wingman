#!/bin/bash

# WyreStorm Wingman - Quick Spacing Fix Script
# This script reduces excessive padding and spacing throughout the app
# to ensure footer visibility and better space utilization

echo "🔧 Starting WyreStorm Wingman spacing optimization..."
echo ""

PROJECT_ROOT="/mnt/project"

# Safety check
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ Error: Project root not found at $PROJECT_ROOT"
    exit 1
fi

# Create backup
BACKUP_DIR="/mnt/project-backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup at $BACKUP_DIR..."
cp -r "$PROJECT_ROOT" "$BACKUP_DIR"
echo "✅ Backup created"
echo ""

cd "$PROJECT_ROOT"

echo "🎨 Optimizing spacing in component files..."

# 1. Reduce gap-6 to gap-4 in layout containers
echo "  → Reducing gap-6 to gap-4..."
find components -type f -name "*.tsx" -exec sed -i 's/gap-6/gap-4/g' {} +

# 2. Reduce excessive bottom padding
echo "  → Reducing pb-20 to pb-6..."
find components -type f -name "*.tsx" -exec sed -i 's/pb-20/pb-6/g' {} +

echo "  → Reducing pb-16 to pb-6..."
find components -type f -name "*.tsx" -exec sed -i 's/pb-16/pb-6/g' {} +

echo "  → Reducing pb-12 to pb-4..."
find components -type f -name "*.tsx" -exec sed -i 's/pb-12/pb-4/g' {} +

# 3. Reduce spacing between stacked elements
echo "  → Reducing space-y-6 to space-y-4..."
find components -type f -name "*.tsx" -exec sed -i 's/space-y-6/space-y-4/g' {} +

# 4. Reduce panel padding
echo "  → Optimizing panel padding..."
find components -type f -name "*Panel.tsx" -exec sed -i 's/ p-6/ p-4/g' {} +
find components -type f -name "*Panel.tsx" -exec sed -i 's/ mb-6/ mb-4/g' {} +

# 5. Reduce modal padding
echo "  → Optimizing modal padding..."
find components -type f -name "*Modal.tsx" -exec sed -i 's/ p-6/ p-4/g' {} +

# 6. Fix specific high-impact files
echo ""
echo "📝 Fixing specific high-impact components..."

# ProjectWorkspace - already fixed manually
echo "  → ProjectWorkspace.tsx (already optimized)"

# AgentInputForm
if [ -f "components/AgentInputForm.tsx" ]; then
    echo "  → Optimizing AgentInputForm.tsx..."
    sed -i 's/md:p-6/p-4/g' components/AgentInputForm.tsx
    sed -i 's/ pb-6/ pb-4/g' components/AgentInputForm.tsx
fi

# GuidedProjectWizard
if [ -f "components/GuidedProjectWizard.tsx" ]; then
    echo "  → Optimizing GuidedProjectWizard.tsx..."
    sed -i 's/ pb-20/ pb-6/g' components/GuidedProjectWizard.tsx
    sed -i 's/ pb-16/ pb-6/g' components/GuidedProjectWizard.tsx
fi

# WorkspaceHeader
if [ -f "components/workspace/WorkspaceHeader.tsx" ]; then
    echo "  → Optimizing WorkspaceHeader.tsx..."
    sed -i 's/ mb-6/ mb-4/g' components/workspace/WorkspaceHeader.tsx
fi

# QuickQuestionPage
if [ -f "components/QuickQuestionPage.tsx" ]; then
    echo "  → Optimizing QuickQuestionPage.tsx..."
    sed -i 's/ mb-8/ mb-4/g' components/QuickQuestionPage.tsx
    sed -i 's/ p-4 / p-3 /g' components/QuickQuestionPage.tsx
fi

# TrainingPage
if [ -f "components/TrainingPage.tsx" ]; then
    echo "  → Optimizing TrainingPage.tsx..."
    sed -i 's/ mb-8/ mb-4/g' components/TrainingPage.tsx
fi

echo ""
echo "✨ Optimization complete!"
echo ""
echo "📊 Summary of changes:"
echo "  • Reduced gap-6 → gap-4"
echo "  • Reduced pb-20/pb-16/pb-12 → pb-6/pb-4"
echo "  • Reduced space-y-6 → space-y-4"
echo "  • Reduced panel/modal padding"
echo "  • Optimized specific high-impact files"
echo ""
echo "💡 Next steps:"
echo "  1. Add compact-styles.css to your project"
echo "  2. Import in index.html: <link rel='stylesheet' href='/compact-styles.css'>"
echo "  3. Test all pages to ensure footer is visible"
echo "  4. Adjust further if needed"
echo ""
echo "📦 Backup location: $BACKUP_DIR"
echo "   (Restore with: cp -r $BACKUP_DIR/* $PROJECT_ROOT/)"
echo ""
echo "✅ Done! Footer should now be visible on all pages."
