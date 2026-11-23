/**
 * CategoryContext - Provides category information to nested components
 * Used for breadcrumbs, feature availability, and UI customization
 */

import React, { createContext, useContext } from 'react';
import { Category, getCategoryInfo, getCategoryLabel } from '../lib/routes';

interface CategoryContextValue {
  category: Category;
  categoryLabel: string;
  categoryFullLabel: string;
  features: string[];
  icon: string;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

interface CategoryProviderProps {
  category: Category;
  children: React.ReactNode;
}

export function CategoryProvider({ category, children }: CategoryProviderProps) {
  const info = getCategoryInfo(category);
  
  const value: CategoryContextValue = {
    category,
    categoryLabel: info?.label || '',
    categoryFullLabel: getCategoryLabel(category),
    features: info?.features || [],
    icon: info?.icon || '🔧',
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategoryContext(): CategoryContextValue {
  const context = useContext(CategoryContext);
  if (!context) {
    return {
      category: null,
      categoryLabel: '',
      categoryFullLabel: '',
      features: [],
      icon: '',
    };
  }
  return context;
}
