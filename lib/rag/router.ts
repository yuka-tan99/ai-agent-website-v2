import { ReportSectionId, UserProfile } from '@/types/report'

export function booksFor(sectionId: ReportSectionId, profile: UserProfile): string[] {
  switch (sectionId) {
    case 'primary_obstacle_resolution':
      return ['How to Be an Imperfectionist', 'lol...OMG!', 'Social Media Rules']
    case 'strategic_foundation':
      return ['Marketing Magic', 'Blue Ocean Strategy']
    case 'personal_brand_development':
      return ['Building a Personal Brand in the Social Media Era', 'Hook Point Strategy']
    case 'marketing_strategy_development':
      if (profile.brandType === 'business') return ['How Brands Grow']
      if (profile.brandType === 'artist_luxury') return ['The Luxury Strategy']
      return ['Hook Point Strategy', 'Marketing Strategy: 1-Page Framework']
    case 'platform_specific_tactics':
      return ['Social Media Marketing Mastery: 500+ Tips']
    case 'content_creation_execution':
      return ['Social Media Rules', 'Marketing Magic']
    case 'mental_health_sustainability':
      return ['lol...OMG!', 'How to Be an Imperfectionist']
    default:
      return []
  }
}

