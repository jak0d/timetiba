import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BaseStore, BaseStoreState, StoreConfig } from './types';
import { ApiResponse, PaginatedResponse, OptimisticUpdate } from '../types/api';

// Default store configuration
const defaultConfig: StoreConfig = {
  enableOptimisticUpdates: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  retryAttempts: 3,
};

// API service interface
export interface ApiService<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  getItems: (params?: any) => Promise<PaginatedResponse<T>>;
  getItem: (id: string) => Promise<ApiResponse<T>>;
  createItem: (item: CreateT) => Promise<ApiResponse<T>>;
  updateItem: (id: string, item: UpdateT) => Promise<ApiResponse<T>>;
  deleteItem: (id: string) => Promise<ApiResponse<void>>;
}

// Create base store factory
export function createBaseStore<T extends { id: string }, CreateT = Partial<T>, UpdateT = Partial<T>>(
  name: string,
  apiService: ApiService<T, CreateT, UpdateT>,
  config: Partial<StoreConfig> = {}
) {
  const storeConfig = { ...defaultConfig, ...config };

  const initialState: BaseStoreState<T> = {
    items: [],
    selectedItem: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    optimisticUpdates: [],
  };

  return create<BaseStore<T, CreateT, UpdateT>>()(
    devtools(
      (set, get) => ({
        ...initialState,

        // Data fetching
        fetchItems: async (params?: any) => {
          const { setLoading, setError } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await apiService.getItems(params);
            
            if (response.success && response.data) {
              set({
                items: response.data,
                lastUpdated: new Date(),
                isLoading: false,
              });
            } else {
              throw new Error(response.message || 'Failed to fetch items');
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            set({ isLoading: false });
          }
        },

        fetchItem: async (id: string) => {
          const { setLoading, setError } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await apiService.getItem(id);
            
            if (response.success && response.data) {
              set((state) => ({
                items: state.items.map(item => 
                  item.id === id ? response.data! : item
                ),
                selectedItem: response.data,
                lastUpdated: new Date(),
                isLoading: false,
              }));
            } else {
              throw new Error(response.message || 'Failed to fetch item');
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            set({ isLoading: false });
          }
        },

        // CRUD operations
        createItem: async (item: CreateT) => {
          const { setLoading, setError, addOptimisticUpdate } = get();
          
          try {
            setLoading(true);
            setError(null);

            // Optimistic update
            if (storeConfig.enableOptimisticUpdates) {
              const optimisticItem = { ...item, id: `temp-${Date.now()}` } as T;
              addOptimisticUpdate({
                id: optimisticItem.id,
                type: 'create',
                data: optimisticItem,
                timestamp: new Date(),
              });
            }
            
            const response = await apiService.createItem(item);
            
            if (response.success && response.data) {
              set((state) => ({
                items: [...state.items, response.data!],
                lastUpdated: new Date(),
                isLoading: false,
                optimisticUpdates: state.optimisticUpdates.filter(
                  update => update.type !== 'create' || update.data.id !== `temp-${Date.now()}`
                ),
              }));
            } else {
              throw new Error(response.message || 'Failed to create item');
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            set({ isLoading: false });
            get().clearOptimisticUpdates();
          }
        },

        updateItem: async (id: string, item: UpdateT) => {
          const { setLoading, setError, addOptimisticUpdate } = get();
          
          try {
            setLoading(true);
            setError(null);

            // Optimistic update
            if (storeConfig.enableOptimisticUpdates) {
              const currentItem = get().items.find(i => i.id === id);
              if (currentItem) {
                const optimisticItem = { ...currentItem, ...item } as T;
                addOptimisticUpdate({
                  id,
                  type: 'update',
                  data: optimisticItem,
                  timestamp: new Date(),
                });
              }
            }
            
            const response = await apiService.updateItem(id, item);
            
            if (response.success && response.data) {
              set((state) => ({
                items: state.items.map(i => i.id === id ? response.data! : i),
                selectedItem: state.selectedItem?.id === id ? response.data : state.selectedItem,
                lastUpdated: new Date(),
                isLoading: false,
                optimisticUpdates: state.optimisticUpdates.filter(
                  update => update.id !== id || update.type !== 'update'
                ),
              }));
            } else {
              throw new Error(response.message || 'Failed to update item');
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            set({ isLoading: false });
            get().clearOptimisticUpdates();
          }
        },

        deleteItem: async (id: string) => {
          const { setLoading, setError, addOptimisticUpdate } = get();
          
          try {
            setLoading(true);
            setError(null);

            // Optimistic update
            if (storeConfig.enableOptimisticUpdates) {
              const itemToDelete = get().items.find(i => i.id === id);
              if (itemToDelete) {
                addOptimisticUpdate({
                  id,
                  type: 'delete',
                  data: itemToDelete,
                  timestamp: new Date(),
                });
              }
            }
            
            const response = await apiService.deleteItem(id);
            
            if (response.success) {
              set((state) => ({
                items: state.items.filter(i => i.id !== id),
                selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
                lastUpdated: new Date(),
                isLoading: false,
                optimisticUpdates: state.optimisticUpdates.filter(
                  update => update.id !== id || update.type !== 'delete'
                ),
              }));
            } else {
              throw new Error(response.message || 'Failed to delete item');
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
            set({ isLoading: false });
            get().clearOptimisticUpdates();
          }
        },

        // Selection
        selectItem: (item: T | null) => {
          set({ selectedItem: item });
        },

        // Optimistic updates
        addOptimisticUpdate: (update: OptimisticUpdate<T>) => {
          set((state) => ({
            optimisticUpdates: [...state.optimisticUpdates, update],
          }));
        },

        removeOptimisticUpdate: (id: string) => {
          set((state) => ({
            optimisticUpdates: state.optimisticUpdates.filter(update => update.id !== id),
          }));
        },

        clearOptimisticUpdates: () => {
          set({ optimisticUpdates: [] });
        },

        // State management
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: `${name}-store`,
      }
    )
  );
}