import TagsSection from './TagsSection';

interface WellnessTagsSectionProps {
  checkinId: string;
  currentUserId?: string;
  isTrainerOrAdmin?: boolean;
  language?: string;
  canCreate?: boolean;
  canEdit?: boolean;
}

export default function WellnessTagsSection({
  checkinId,
  currentUserId,
  isTrainerOrAdmin = false,
  language = 'en',
  canCreate = false,
  canEdit,
}: WellnessTagsSectionProps) {
  const isEditor = canEdit !== undefined ? canEdit : isTrainerOrAdmin;
  return (
    <TagsSection
      contentType="wellness"
      contentId={checkinId}
      currentUserId={currentUserId}
      isTrainerOrAdmin={isEditor}
      language={language}
      canCreate={canCreate}
    />
  );
}
