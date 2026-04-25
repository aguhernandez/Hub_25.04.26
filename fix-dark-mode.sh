#!/bin/bash

# Script para agregar dark mode a todas las páginas
# Reemplaza patrones comunes de clases de Tailwind

PAGES=(
  "src/pages/ImpactBrandsPage.tsx"
  "src/pages/ServicesPage.tsx"
  "src/pages/AboutAsciendePage.tsx"
  "src/pages/AuthPage.tsx"
  "src/pages/AdminCommunicationsPage.tsx"
  "src/pages/AdminPlatformDashboard.tsx"
  "src/pages/AdminStripeProductsPage.tsx"
  "src/pages/MarketplacePage.tsx"
  "src/pages/MembershipPage.tsx"
  "src/pages/NutritionDashboardPage.tsx"
  "src/pages/NutritionPage.tsx"
  "src/pages/SettingsPage.tsx"
  "src/pages/TeamsUnifiedPage.tsx"
  "src/pages/TrainerDashboard.tsx"
  "src/pages/AnthropometryPage.tsx"
  "src/pages/BrandRequestsAdminPage.tsx"
  "src/pages/DigestPage.tsx"
)

for PAGE in "${PAGES[@]}"; do
  if [ -f "$PAGE" ]; then
    echo "Fixing $PAGE..."

    # Backgrounds
    sed -i 's/bg-white"/bg-white dark:bg-gray-800"/g' "$PAGE"
    sed -i "s/bg-white'/bg-white dark:bg-gray-800'/g" "$PAGE"
    sed -i 's/bg-gray-50"/bg-gray-50 dark:bg-gray-900"/g' "$PAGE"
    sed -i "s/bg-gray-50'/bg-gray-50 dark:bg-gray-900'/g" "$PAGE"
    sed -i 's/bg-gray-100"/bg-gray-100 dark:bg-gray-800"/g' "$PAGE"
    sed -i "s/bg-gray-100'/bg-gray-100 dark:bg-gray-800'/g" "$PAGE"

    # Borders
    sed -i 's/border-gray-200"/border-gray-200 dark:border-gray-700"/g' "$PAGE"
    sed -i "s/border-gray-200'/border-gray-200 dark:border-gray-700'/g" "$PAGE"
    sed -i 's/border-gray-300"/border-gray-300 dark:border-gray-600"/g' "$PAGE"
    sed -i "s/border-gray-300'/border-gray-300 dark:border-gray-600'/g" "$PAGE"

    # Text colors
    sed -i 's/text-gray-900"/text-gray-900 dark:text-white"/g' "$PAGE"
    sed -i "s/text-gray-900'/text-gray-900 dark:text-white'/g" "$PAGE"
    sed -i 's/text-gray-800"/text-gray-800 dark:text-gray-200"/g' "$PAGE"
    sed -i "s/text-gray-800'/text-gray-800 dark:text-gray-200'/g" "$PAGE"
    sed -i 's/text-gray-700"/text-gray-700 dark:text-gray-300"/g' "$PAGE"
    sed -i "s/text-gray-700'/text-gray-700 dark:text-gray-300'/g" "$PAGE"
    sed -i 's/text-gray-600"/text-gray-600 dark:text-gray-400"/g' "$PAGE"
    sed -i "s/text-gray-600'/text-gray-600 dark:text-gray-400'/g" "$PAGE"
    sed -i 's/text-gray-500"/text-gray-500 dark:text-gray-400"/g' "$PAGE"
    sed -i "s/text-gray-500'/text-gray-500 dark:text-gray-400'/g" "$PAGE"

    # Hovers
    sed -i 's/hover:bg-gray-50"/hover:bg-gray-50 dark:hover:bg-gray-700"/g' "$PAGE"
    sed -i "s/hover:bg-gray-50'/hover:bg-gray-50 dark:hover:bg-gray-700'/g" "$PAGE"
    sed -i 's/hover:bg-gray-100"/hover:bg-gray-100 dark:hover:bg-gray-700"/g' "$PAGE"
    sed -i "s/hover:bg-gray-100'/hover:bg-gray-100 dark:hover:bg-gray-700'/g" "$PAGE"

    # Violet to Yellow - Active states
    sed -i 's/bg-violet-600"/bg-[#fdda36] dark:bg-[#fdda36]"/g' "$PAGE"
    sed -i "s/bg-violet-600'/bg-[#fdda36] dark:bg-[#fdda36]'/g" "$PAGE"
    sed -i 's/text-violet-600"/text-[#514163] dark:text-[#fdda36]"/g' "$PAGE"
    sed -i "s/text-violet-600'/text-[#514163] dark:text-[#fdda36]'/g" "$PAGE"
    sed -i 's/bg-violet-50"/bg-[#fdda36]\/20 dark:bg-[#fdda36]\/30"/g' "$PAGE"
    sed -i "s/bg-violet-50'/bg-[#fdda36]\/20 dark:bg-[#fdda36]\/30'/g" "$PAGE"

    echo "Fixed $PAGE"
  fi
done

echo "Done! All pages have been updated with dark mode support."
