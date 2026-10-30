/**
 * Route Constants and Navigation Helpers
 * Centralized routing structure for category-based navigation
 */

export type Category = 'sld' | 'id' | 'asd-adhd' | null;

export interface CategoryInfo {
  id: Category;
  label: string;
  fullLabel: string;
  description: string;
  features: string[];
  icon: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  sld: {
    id: 'sld',
    label: 'SLD',
    fullLabel: 'Specific Learning Disability',
    description: 'Support for reading, writing, and learning challenges',
    features: ['handwriting', 'chatbot', 'reports', 'progress'],
    icon: '📖',
  },
  id: {
    id: 'id',
    label: 'ID',
    fullLabel: 'Intellectual Disability',
    description: 'Communication and structured learning support',
    features: ['chatbot', 'reports', 'progress', 'homeschool'],
    icon: '🧩',
  },
  'asd-adhd': {
    id: 'asd-adhd',
    label: 'ASD + ADHD',
    fullLabel: 'Autism Spectrum and ADHD Support',
    description: 'Sensory awareness, focus, and behavioral support',
    features: ['chatbot', 'virtual-board', 'behaviour-interpreter', 'reports', 'progress'],
    icon: '🎯',
  },
};

export const ROUTES = {
  // Public
  home: '/',
  auth: '/auth',
  
  // Category selection
  choose: '/choose',
  
  // Wellness hub
  wellness: '/wellness',
  wellnessBreathing: '/wellness/breathing',
  wellnessGrounding: '/wellness/grounding',
  wellnessRelease: '/wellness/release',
  wellnessSelfCompassion: '/wellness/self-compassion',
  
  // Child care hub
  childCare: '/child-care',
  
  // Category hubs
  categoryHub: (category: Category) => `/child-care/${category}`,
  sldHub: '/child-care/sld',
  idHub: '/child-care/id',
  asdAdhdHub: '/child-care/asd-adhd',
  
  // Category features
  categoryFeature: (category: Category, feature: string) => `/child-care/${category}/${feature}`,
  
  // SLD features
  sldHandwriting: '/child-care/sld/handwriting',
  sldChatbot: '/child-care/sld/chatbot',
  sldReports: '/child-care/sld/reports',
  sldProgress: '/child-care/sld/progress',
  
  // ID features
  idChatbot: '/child-care/id/chatbot',
  idReports: '/child-care/id/reports',
  idProgress: '/child-care/id/progress',
  idHomeschool: '/child-care/id/homeschool',
  
  // ASD+ADHD features
  asdAdhdChatbot: '/child-care/asd-adhd/chatbot',
  asdAdhdVirtualBoard: '/child-care/asd-adhd/virtual-board',
  asdAdhdBehaviourInterpreter: '/child-care/asd-adhd/behaviour-interpreter',
  asdAdhdReports: '/child-care/asd-adhd/reports',
  asdAdhdProgress: '/child-care/asd-adhd/progress',
  
  // Emergency (always accessible)
  emergency: '/child-care/emergency',
  emergencyLegacy: '/emergency',
  
  // Shared/Account
  profile: '/profile',
  onboarding: '/onboarding',
  addChild: '/add-child',
  
  // Admin
  insights: '/insights',
  
  // Legacy routes (for redirects)
  legacy: {
    chat: '/chat',
    behavior: '/behavior',
    diet: '/diet',
    therapy: '/therapy',
    homeschool: '/homeschool',
    visualBoard: '/visual-board',
    progress: '/progress',
    reports: '/reports',
    teaching: '/teaching',
    caregiver: '/caregiver',
  },
};

/**
 * Get default category based on profile or preference
 * Used for legacy redirects
 */
export function getDefaultCategory(): Category {
  // Default to ASD+ADHD for most use cases (primary category)
  return 'asd-adhd';
}

/**
 * Get category label for breadcrumb display
 */
export function getCategoryLabel(category: Category): string {
  if (!category) return '';
  return CATEGORIES[category]?.fullLabel || category;
}

/**
 * Get category info
 */
export function getCategoryInfo(category: Category): CategoryInfo | null {
  if (!category) return null;
  return CATEGORIES[category] || null;
}

/**
 * Get all available features for a category
 */
export function getCategoryFeatures(category: Category): string[] {
  if (!category) return [];
  return CATEGORIES[category]?.features || [];
}

/**
 * Build breadcrumb path for category feature
 */
export function buildBreadcrumbPath(category: Category, feature?: string): Array<{label: string; path: string}> {
  const breadcrumbs: Array<{label: string; path: string}> = [
    { label: 'Home', path: '/' },
  ];
  
  if (category === 'sld' || category === 'id' || category === 'asd-adhd') {
    breadcrumbs.push(
      { label: 'Child Care', path: '/child-care' },
      { label: getCategoryLabel(category), path: ROUTES.categoryHub(category) }
    );
    
    if (feature) {
      const featureLabel = feature
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      breadcrumbs.push({
        label: featureLabel,
        path: ROUTES.categoryFeature(category, feature),
      });
    }
  }
  
  return breadcrumbs;
}
