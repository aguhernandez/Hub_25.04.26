import TagsSection from './TagsSection';

interface WorkoutTagsSectionProps {
  workoutId: string;
  currentUserId?: string;
  isTrainerOrAdmin?: boolean;
  language?: string;
  canCreate?: boolean;
  canEdit?: boolean;
}

export default function WorkoutTagsSection({
  workoutId,
  currentUserId,
  isTrainerOrAdmin = false,
  language = 'en',
  canCreate = false,
  canEdit,
}: WorkoutTagsSectionProps) {
  const isEditor = canEdit !== undefined ? canEdit : isTrainerOrAdmin;
  return (
    <TagsSection
      contentType="workout"
      contentId={workoutId}
      currentUserId={currentUserId}
      isTrainerOrAdmin={isEditor}
      language={language}
      canCreate={canCreate}
    />
  );
}
