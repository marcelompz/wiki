import { create } from 'zustand';

export interface RestaurantTableState {
  id: string;
  tableNumber: string;
  seats: number;
  positionX: number;
  positionY: number;
  shape: string;
  token: string;
  status: 'FREE' | 'OCCUPIED' | 'BILL_REQUESTED';
  activeOrder?: any;
}

export interface RestaurantFloorState {
  id: string;
  name: string;
  sequence: number;
  tables: RestaurantTableState[];
}

interface GastroStore {
  floors: RestaurantFloorState[];
  selectedFloorId: string | null;
  selectedTable: RestaurantTableState | null;
  activeWaiterId: string | null;
  guestCount: number;

  setFloors: (floors: RestaurantFloorState[]) => void;
  setSelectedFloorId: (floorId: string | null) => void;
  setSelectedTable: (table: RestaurantTableState | null) => void;
  setActiveWaiterId: (waiterId: string | null) => void;
  setGuestCount: (count: number) => void;

  updateTableStatus: (tableId: string, status: RestaurantTableState['status'], activeOrder?: any) => void;
}

export const useGastroStore = create<GastroStore>((set, get) => ({
  floors: [],
  selectedFloorId: null,
  selectedTable: null,
  activeWaiterId: null,
  guestCount: 1,

  setFloors: (floors) => {
    set({ floors });
    if (floors.length > 0 && !get().selectedFloorId) {
      set({ selectedFloorId: floors[0].id });
    }
  },

  setSelectedFloorId: (floorId) => set({ selectedFloorId: floorId }),
  setSelectedTable: (table) => set({ selectedTable: table, guestCount: table?.seats || 1 }),
  setActiveWaiterId: (waiterId) => set({ activeWaiterId: waiterId }),
  setGuestCount: (count) => set({ guestCount: count }),

  updateTableStatus: (tableId, status, activeOrder) => {
    const { floors } = get();
    const updatedFloors = floors.map((floor) => ({
      ...floor,
      tables: floor.tables.map((table) => (table.id === tableId ? { ...table, status, activeOrder } : table)),
    }));
    set({ floors: updatedFloors });
  },
}));
