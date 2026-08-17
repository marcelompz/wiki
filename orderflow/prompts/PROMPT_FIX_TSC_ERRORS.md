# Prompt: Corregir errores TypeScript del frontend OrderFlow

Eres un experto en TypeScript + React + Ant Design + Refine.  
Aplica **únicamente** las correcciones listadas abajo sobre el código del proyecto `frontend/`.  
No refactorices nada extra. No cambies lógica de negocio. Solo elimina los errores de compilación TS.

---

## Errores detectados (fuente: `tsc-errors.txt` + `tsc-errors-3.txt`)

### 1. `src/pages/index.ts` — módulo `./catalog` inexistente

**Error:**
```
Cannot find module './catalog' or its corresponding type declarations.
```

**Estado actual del archivo:**
```ts
export * from "./catalog-with-categories";
export * from "./checkout";
export * from "./checkout-simple";
export { OrdersPage } from "./orders";
```

**Acción:**  
Si todavía aparece `export * from "./catalog";`, elimínalo o cámbialo por:
```ts
export * from "./catalog-with-categories";
```
Deja el resto igual. No hay archivo `catalog.tsx`.

---

### 2. `src/pages/catalog-with-categories.tsx` — varios errores

#### 2.1 Import de `../types` inexistente
**Error (línea ~30):**
```
Cannot find module '../types' or its corresponding type declarations.
```

**Acción:**  
Elimina la línea de import de `../types` si existe.  
La interfaz `Product` ya está definida **inline** en el mismo archivo:

```ts
interface Product {
  id: string;
  name: string;
  skuInterno: string;
  description: string;
  price: number;
  currency: string;
  stockAvailable: number;
  imagesUrls?: string[];
  category?: string;
  metadata?: any;
}
```

#### 2.2 `addItem` recibe `Product` en lugar de `Omit<CartItem, "quantity">`
**Error (línea ~177 / handleAddToCart):**
```
Argument of type 'Product' is not assignable to parameter of type 'Omit<CartItem, "quantity">'.
Type 'Product' is missing the following properties from type 'Omit<CartItem, "quantity">': productId, productName
```

**Acción:**  
Asegúrate de que `handleAddToCart` mapee correctamente (ya debería estar así):

```ts
const handleAddToCart = (product: Product) => {
  addItem({
    productId: product.id,
    productName: product.name,
    price: Number(product.price),
    imageUrl: product.imagesUrls?.[0],
    metadata: product.metadata,
  });
};
```

Si en algún lugar se hace `addItem(product)` directo, cámbialo por el mapeo de arriba.

#### 2.3 `defaultActiveKeys` → `defaultActiveKey`
**Error (líneas ~420 y ~505):**
```
Property 'defaultActiveKeys' does not exist... Did you mean 'defaultActiveKey'?
```

**Acción:**  
Reemplaza **todas** las ocurrencias de:
```tsx
<Collapse defaultActiveKeys={["1", "2", "3"]}>
```
por:
```tsx
<Collapse defaultActiveKey={["1", "2", "3"]}>
```
(Ant Design v5 usa `defaultActiveKey`, singular).

#### 2.4 Cast incorrecto `string[]` → `string`
**Error (línea ~360):**
```
Conversion of type 'string[]' to type 'string' may be a mistake...
```

**Acción:**  
Busca cualquier `as string` aplicado a un array.  
Si es `imagesUrls as string`, cámbialo a:
```ts
product.imagesUrls?.[0] ?? undefined
```
o elimina el cast innecesario.

#### 2.5 Propiedad `md` en objeto de estilo CSS
**Error (línea ~471):**
```
Object literal may only specify known properties, and 'md' does not exist in type 'Properties<...>'
```

**Acción:**  
`md` no es una propiedad CSS válida dentro de `style={{}}`.  
Si aparece algo como:
```tsx
style={{ md: 18, ... }}
```
o dentro de un objeto de estilos, elimínalo.  
El responsive se maneja con `<Col xs={24} md={18}>` (props de Ant Design), **no** dentro de `style`.

---

### 3. `src/pages/admin/integrations.tsx` — `Property 'id' does not exist on type 'never'`

**Error (línea ~44 / ~50):**
```
Property 'id' does not exist on type 'never'.
```

**Causa típica:** `useState(null)` sin tipado → TypeScript infiere `never`.

**Acción:**  
Asegúrate de que esté tipado así (ya debería estarlo):
```ts
const [editingIntegration, setEditingIntegration] = useState<any | null>(null);
```

Si por alguna razón sigue siendo `never`, cambia a:
```ts
const [editingIntegration, setEditingIntegration] = useState<{ id: string; [key: string]: any } | null>(null);
```

Y en el `patch`:
```ts
await api.patch(`/api/v1/integrations/${editingIntegration!.id}`, data);
```
(o con optional chaining + early return).

---

### 4. `src/pages/admin/users.tsx` — mismo problema `never`

**Error (línea ~34):**
```
Property 'id' does not exist on type 'never'.
```

**Acción idéntica:**
```ts
const [editingUser, setEditingUser] = useState<any | null>(null);
// o más estricto:
const [editingUser, setEditingUser] = useState<{ id: string; [key: string]: any } | null>(null);
```

---

### 5. `src/pages/admin/spa-dashboard.tsx` — `any[]` no asignable a `never[]`

**Error (líneas ~96-97):**
```
Type 'any[]' is not assignable to type 'never[]'.
```

**Causa:** El estado inicial se tipó de forma que TypeScript infirió `never[]`.

**Acción:**  
El estado debe estar declarado así:

```ts
const [stats, setStats] = useState({
  totalOrders: 0,
  totalRevenue: 0,
  totalProducts: 0,
  totalCustomers: 0,
  recentOrders: [] as any[],
  topProducts: [] as any[],
});
```

Si al hacer `setStats({ ... recentOrders: orders.slice(...), topProducts })` sigue fallando, tipa explícitamente:

```ts
setStats({
  totalOrders: orders.length,
  totalRevenue,
  totalProducts: products.length,
  totalCustomers: customers.length,
  recentOrders: orders.slice(0, 10).reverse() as any[],
  topProducts: topProducts as any[],
});
```

O mejor, define una interfaz:

```ts
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: any[];
  topProducts: any[];
}

const [stats, setStats] = useState<DashboardStats>({ ... });
```

---

### 6. `src/pages/admin/quotations.tsx` — `parser` de InputNumber

**Error (línea ~381):**
```
Type '(value: string | undefined) => string' is not assignable to type '(displayValue: string | undefined) => 0'.
Type 'string' is not assignable to type '0'.
```

**Acción:**  
El `parser` de `InputNumber` de Ant Design debe devolver `number` (o el tipo del value).  
Cambia a:

```tsx
<InputNumber
  placeholder="Precio Unit."
  min={0}
  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
  parser={(value) => {
    if (!value) return 0;
    return Number(value.replace(/\$\s?|(,*)/g, '')) || 0;
  }}
  style={{ width: 120 }}
/>
```

(Evita devolver `string` o usar casts raros que TS no acepta.)

---

### 7. `src/pages/checkout.tsx` — destructuring de `useCreate` / mutation

**Error (línea ~53):**
```
Type '...' must have a '[Symbol.iterator]()' method that returns an iterator.
```

**Causa típica:** se intenta hacer:
```ts
const [createOrder, { isLoading }] = useCreate(); // ← incorrecto
```

**Acción:**  
`useCreate` de Refine **no** se desestructura como array.  
La forma correcta es:

```ts
const { mutate: createOrder, isLoading, isPending } = useCreate();
```

o:

```ts
const createMutation = useCreate();
// luego: createMutation.mutate(...)
```

Busca la línea ~53 (o cualquier `const [xxx] = useCreate`) y corrígela a la forma de objeto.

---

## Orden de aplicación recomendado

1. `src/pages/index.ts`
2. `src/pages/catalog-with-categories.tsx` (todos los sub-puntos)
3. `src/pages/admin/integrations.tsx`
4. `src/pages/admin/users.tsx`
5. `src/pages/admin/spa-dashboard.tsx`
6. `src/pages/admin/quotations.tsx`
7. `src/pages/checkout.tsx`

Después de cada cambio, verifica que no se introduzcan nuevos errores.

---

## Criterio de aceptación

Al terminar, el comando:

```bash
npx tsc --noEmit
```

debe salir **sin errores** (exit code 0).  
Los warnings de `noUnusedLocals` / `noUnusedParameters` están desactivados en `tsconfig.json`, así que ignóralos.

---

## Notas

- No crees el archivo `src/types.ts` a menos que sea estrictamente necesario.
- Prefiere `any` solo donde ya se usa en el código (no introduzcas `any` nuevos innecesarios).
- Ant Design 5: `defaultActiveKey` (singular), `InputNumber.parser` debe devolver número.
- Refine `useCreate` retorna objeto, no tupla.

Aplica las correcciones ahora.
