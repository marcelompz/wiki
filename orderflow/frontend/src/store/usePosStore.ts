import { create } from 'zustand';

export interface PosProduct {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  category?: string;
  imageUrl?: string;
}

export interface PosCartLine {
  product: PosProduct;
  quantity: number;
  priceAtSale: number;
  discountPercent: number;
  notes?: string;
}

export interface PosConfigState {
  id: string;
  name: string;
  code: string;
  isRestaurant: boolean;
  allowTableSelection: boolean;
  autoOpenTableScreen: boolean;
  currency: string;
}

interface PosStore {
  activeConfig: PosConfigState | null;
  activeSessionId: string | null;
  cart: PosCartLine[];
  selectedCustomer: any | null;
  numpadInput: string;
  numpadMode: 'QTY' | 'DISC' | 'PRICE';

  setActiveConfig: (config: PosConfigState | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setSelectedCustomer: (customer: any | null) => void;
  
  addToCart: (product: PosProduct, quantity?: number) => void;
  updateLineQuantity: (productId: string, quantity: number) => void;
  updateLineDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  setNumpadInput: (val: string) => void;
  setNumpadMode: (mode: 'QTY' | 'DISC' | 'PRICE') => void;
  appendNumpadDigit: (digit: string) => void;
  clearNumpad: () => void;
}

export const usePosStore = create<PosStore>((set, get) => ({
  activeConfig: null,
  activeSessionId: null,
  cart: [],
  selectedCustomer: null,
  numpadInput: '',
  numpadMode: 'QTY',

  setActiveConfig: (config) => set({ activeConfig: config }),
  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),

  addToCart: (product, quantity = 1) => {
    const { cart } = get();
    const existingIndex = cart.findIndex((line) => line.product.id === product.id);

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      set({ cart: updated });
    } else {
      set({
        cart: [
          ...cart,
          {
            product,
            quantity,
            priceAtSale: Number(product.price || 0),
            discountPercent: 0,
          },
        ],
      });
    }
  },

  updateLineQuantity: (productId, quantity) => {
    const { cart } = get();
    if (quantity <= 0) {
      set({ cart: cart.filter((line) => line.product.id !== productId) });
    } else {
      set({
        cart: cart.map((line) => (line.product.id === productId ? { ...line, quantity } : line)),
      });
    }
  },

  updateLineDiscount: (productId, discount) => {
    const { cart } = get();
    set({
      cart: cart.map((line) => (line.product.id === productId ? { ...line, discountPercent: discount } : line)),
    });
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((line) => line.product.id !== productId) });
  },

  clearCart: () => set({ cart: [], numpadInput: '', selectedCustomer: null }),

  setNumpadInput: (val) => set({ numpadInput: val }),
  setNumpadMode: (mode) => set({ numpadMode: mode }),
  appendNumpadDigit: (digit) => {
    const current = get().numpadInput;
    if (digit === '.' && current.includes('.')) return;
    set({ numpadInput: current + digit });
  },
  clearNumpad: () => set({ numpadInput: '' }),
}));
