import { LoadingState, OptimisticUpdate } from '../types/api';

// Base store state interface
export interface BaseStoreState<T> extends LoadingState {
  items: T[];
  selectedItem: T | null;
  optimisticUpdates: OptimisticUpdate<T>[];
}

// Base store actions interface
export interface BaseStoreActions<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  // Data fetching
  fetchItems: (params?: any) => Promise<void>;
  fetchItem: (id: string) => Promise<void>;
  
  // CRUD operations
  createItem: (item: CreateT) => Promise<void>;
  updateItem: (id: string, item: UpdateT) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  // Selection
  selectItem: (item: T | null) => void;
  
  // Optimistic updates
  addOptimisticUpdate: (update: OptimisticUpdate<T>) => void;
  removeOptimisticUpdate: (id: string) => void;
  clearOptimisticUpdates: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// Combined store interface
export interface BaseStore<T, CreateT = Partial<T>, UpdateT = Partial<T>> 
  extends BaseStoreState<T>, BaseStoreActions<T, CreateT, UpdateT> {}

// Store configuration
export interface StoreConfig {
  enableOptimisticUpdates: boolean;
  cacheTimeout: number;
  retryAttempts: number;
}