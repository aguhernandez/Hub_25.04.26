#!/bin/bash

# Fix dark mode in all components
COMPONENTS=(
  "src/components/atp/EventManager.tsx"
  "src/components/atp/WeeklyPlanEditor.tsx"
  "src/components/atp/PlanVsActualChart.tsx"
  "src/components/digest/ArticleEditor.tsx"
  "src/components/digest/PremiumPaywall.tsx"
  "src/components/digest/ArticleVersionManager.tsx"
  "src/components/digest/DigestWidgetEmbeddable.tsx"
  "src/components/nutrition/anamnesis/Section4Goals.tsx"
  "src/components/nutrition/anamnesis/Section2Training.tsx"
  "src/components/nutrition/anamnesis/Section3Nutrition.tsx"
  "src/components/nutrition/anamnesis/Section1BasicHealth.tsx"
  "src/components/nutrition/PlanEditor.tsx"
  "src/components/nutrition/FoodDiary24h.tsx"
  "src/components/nutrition/Deliverables.tsx"
  "src/components/nutrition/ShoppingList.tsx"
  "src/components/nutrition/FullMealEditor.tsx"
  "src/components/nutrition/DayNamesCustomizer.tsx"
  "src/components/nutrition/NutritionAnamnesis.tsx"
  "src/components/nutrition/MenuTemplateBuilder.tsx"
  "src/components/nutrition/MenuTemplateCreator.tsx"
  "src/components/nutrition/FoodSubstitutionModal.tsx"
  "src/components/nutrition/FoodDiaryReviewPanel.tsx"
  "src/components/nutrition/NutritionContextSidebar.tsx"
  "src/components/performance/AnthropometrySnapshot.tsx"
  "src/components/performance/ExerciseSelector.tsx"
  "src/components/performance/StrengthProgressionChart.tsx"
  "src/components/performance/WorkoutFrequencyHeatmap.tsx"
  "src/components/program-builder/ProgramHeader.tsx"
  "src/components/program-builder/WeekSelector.tsx"
  "src/components/settings/AboutCoachSection.tsx"
  "src/components/settings/AdminSection.tsx"
  "src/components/settings/AIMonitoringSection.tsx"
  "src/components/settings/ApiConfigSection.tsx"
  "src/components/settings/BrandDiscountManager.tsx"
  "src/components/settings/CourseManagement.tsx"
  "src/components/settings/NotificationSettings.tsx"
  "src/components/settings/SecuritySection.tsx"
  "src/components/settings/SupportMeSection.tsx"
  "src/components/settings/SupportMeSectionV2.tsx"
  "src/components/settings/TrainingPeaksSection.tsx"
  "src/components/support/CreateProjectModal.tsx"
  "src/components/support/DeclaredSupportsManager.tsx"
  "src/components/support/PaymentMethodsForm.tsx"
  "src/components/training/AdvancedExerciseBuilder.tsx"
  "src/components/training/OneRMLoadSelector.tsx"
  "src/components/training/StrengthEstimator.tsx"
  "src/components/training/WorkoutShareCard.tsx"
  "src/components/forms/ContactAdminForm.tsx"
  "src/components/forms/ContactAthleteForm.tsx"
  "src/components/forms/ProposeProjectForm.tsx"
  "src/components/communications/EmailTemplateEditor.tsx"
  "src/components/anthropometry/BioimpedanceInput.tsx"
  "src/components/anthropometry/KerrBodyCompositionDashboard.tsx"
  "src/components/anthropometry/KerrPresentationDashboard.tsx"
  "src/components/anthropometry/MeasurementInput.tsx"
  "src/components/anthropometry/PopulationDataForm.tsx"
  "src/components/anthropometry/StepByStepMeasurementInput.tsx"
  "src/components/DailyWorkoutView.tsx"
  "src/components/DuplicateWorkoutModal.tsx"
  "src/components/MembershipUpgradeModal.tsx"
  "src/components/NotificationCenter.tsx"
  "src/components/PostTrainingFeedbackModal.tsx"
  "src/components/SupportMeModal.tsx"
  "src/components/TrainingCalendar.tsx"
  "src/components/WorkoutHistory.tsx"
  "src/components/AddExtraTrainingModal.tsx"
)

for COMP in "${COMPONENTS[@]}"; do
  if [ -f "$COMP" ]; then
    echo "Processing $COMP..."

    # Create temporary file
    TEMP_FILE=$(mktemp)

    # Read file and apply all transformations
    cat "$COMP" | \
    sed 's/\(bg-white\)\([^"]*"\)/\1 dark:bg-gray-800\2/g' | \
    sed "s/\(bg-white\)\([^']*'\)/\1 dark:bg-gray-800\2/g" | \
    sed 's/\(bg-gray-50\)\([^"]*"\)/\1 dark:bg-gray-900\2/g' | \
    sed "s/\(bg-gray-50\)\([^']*'\)/\1 dark:bg-gray-900\2/g" | \
    sed 's/\(bg-gray-100\)\([^"]*"\)/\1 dark:bg-gray-800\2/g' | \
    sed "s/\(bg-gray-100\)\([^']*'\)/\1 dark:bg-gray-800\2/g" | \
    sed 's/\(border-gray-200\)\([^"]*"\)/\1 dark:border-gray-700\2/g' | \
    sed "s/\(border-gray-200\)\([^']*'\)/\1 dark:border-gray-700\2/g" | \
    sed 's/\(border-gray-300\)\([^"]*"\)/\1 dark:border-gray-600\2/g' | \
    sed "s/\(border-gray-300\)\([^']*'\)/\1 dark:border-gray-600\2/g" | \
    sed 's/\(text-gray-900\)\([^"]*"\)/\1 dark:text-white\2/g' | \
    sed "s/\(text-gray-900\)\([^']*'\)/\1 dark:text-white\2/g" | \
    sed 's/\(text-gray-800\)\([^"]*"\)/\1 dark:text-gray-200\2/g' | \
    sed "s/\(text-gray-800\)\([^']*'\)/\1 dark:text-gray-200\2/g" | \
    sed 's/\(text-gray-700\)\([^"]*"\)/\1 dark:text-gray-300\2/g' | \
    sed "s/\(text-gray-700\)\([^']*'\)/\1 dark:text-gray-300\2/g" | \
    sed 's/\(text-gray-600\)\([^"]*"\)/\1 dark:text-gray-400\2/g' | \
    sed "s/\(text-gray-600\)\([^']*'\)/\1 dark:text-gray-400\2/g" | \
    sed 's/\(text-gray-500\)\([^"]*"\)/\1 dark:text-gray-400\2/g' | \
    sed "s/\(text-gray-500\)\([^']*'\)/\1 dark:text-gray-400\2/g" | \
    sed 's/\(hover:bg-gray-50\)\([^"]*"\)/\1 dark:hover:bg-gray-700\2/g' | \
    sed "s/\(hover:bg-gray-50\)\([^']*'\)/\1 dark:hover:bg-gray-700\2/g" | \
    sed 's/\(hover:bg-gray-100\)\([^"]*"\)/\1 dark:hover:bg-gray-700\2/g' | \
    sed "s/\(hover:bg-gray-100\)\([^']*'\)/\1 dark:hover:bg-gray-700\2/g" | \
    sed 's/\(bg-violet-600\)\([^"]*"\)/bg-[#fdda36] dark:bg-[#fdda36]\2/g' | \
    sed "s/\(bg-violet-600\)\([^']*'\)/bg-[#fdda36] dark:bg-[#fdda36]\2/g" | \
    sed 's/\(text-violet-600\)\([^"]*"\)/text-[#514163] dark:text-[#fdda36]\2/g' | \
    sed "s/\(text-violet-600\)\([^']*'\)/text-[#514163] dark:text-[#fdda36]\2/g" | \
    sed 's/\(bg-violet-50\)\([^"]*"\)/bg-[#fdda36]\/20 dark:bg-[#fdda36]\/30\2/g' | \
    sed "s/\(bg-violet-50\)\([^']*'\)/bg-[#fdda36]\/20 dark:bg-[#fdda36]\/30\2/g" \
    > "$TEMP_FILE"

    # Only replace if transformations were successful
    if [ -s "$TEMP_FILE" ]; then
      mv "$TEMP_FILE" "$COMP"
      echo "✓ Fixed $COMP"
    else
      rm "$TEMP_FILE"
      echo "✗ Skipped $COMP (empty result)"
    fi
  fi
done

echo ""
echo "✅ All components have been processed!"
