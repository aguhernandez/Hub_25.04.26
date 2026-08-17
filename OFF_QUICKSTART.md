# Open Food Facts - Guía de Inicio Rápido

## ✅ Implementación Completada

La integración de Open Food Facts está lista y funcional.

## 📦 Archivos Creados

### Base de Datos
- **Migración**: `add_open_food_facts_integration.sql`
  - Agrega campos de trazabilidad a tabla `foods`
  - Previene duplicados con constraint único
  - Indexa para búsquedas rápidas

### Utilidades
- **`src/utils/openFoodFactsClient.ts`**: Cliente API para búsqueda
- **`src/utils/openFoodFactsNormalizer.ts`**: Normalización y guardado

### Componentes
- **`src/components/nutrition/FoodSearchWithOFF.tsx`**: Búsqueda híbrida
- **`src/components/nutrition/FoodSourceBadge.tsx`**: Badge visual de fuente

### Documentación
- **`OPEN_FOOD_FACTS_INTEGRATION.md`**: Documentación técnica completa
- **`OFF_QUICKSTART.md`**: Esta guía

### Legal
- Atribución agregada en `src/pages/AboutAsciendePage.tsx`

## 🚀 Cómo Usar

### Para Desarrolladores

#### 1. Usar el Componente de Búsqueda

```tsx
import FoodSearchWithOFF from '../components/nutrition/FoodSearchWithOFF';

function MyComponent() {
  const handleFoodSelect = (food) => {
    console.log('Alimento seleccionado:', food);
  };

  return (
    <FoodSearchWithOFF
      onSelectFood={handleFoodSelect}
      selectedCategory="all"
    />
  );
}
```

#### 2. Mostrar Badge de Fuente

```tsx
import FoodSourceBadge from '../components/nutrition/FoodSourceBadge';

function FoodItem({ food }) {
  return (
    <div>
      <span>{food.name}</span>
      <FoodSourceBadge
        source={food.source}
        isVerified={food.is_verified}
      />
    </div>
  );
}
```

#### 3. Búsqueda Programática

```tsx
import { fetchOpenFoodFacts } from '../utils/openFoodFactsClient';
import { normalizeOpenFoodFactsData } from '../utils/openFoodFactsNormalizer';

async function searchFood(query) {
  const result = await fetchOpenFoodFacts(query);

  if (result && result.products.length > 0) {
    const normalized = normalizeOpenFoodFactsData(result.products[0]);
    console.log(normalized);
  }
}
```

### Para Usuarios Finales

#### Buscar Alimentos

1. Abrir módulo de nutrición
2. Comenzar a escribir nombre del alimento (mínimo 3 caracteres)
3. Ver resultados locales primero
4. Si hay < 5 resultados locales, ver también resultados de Open Food Facts

#### Identificar Fuente

- **Badge Azul "Asciende"**: Alimento interno
- **Badge Verde "USDA"**: Base de datos USDA
- **Badge Naranja "OFF"**: Open Food Facts
- **Badge con ✓**: Alimento verificado por entrenador

#### Agregar Alimento OFF

1. Click en resultado naranja (Open Food Facts)
2. Alimento se guarda automáticamente
3. Aparecerá en búsquedas futuras sin consultar API

## 🔍 Comportamiento de Búsqueda

### Flujo

```
Usuario escribe → Espera 500ms → Busca en base local
                                        ↓
                              ¿Menos de 5 resultados?
                                        ↓
                                       Sí
                                        ↓
                              Busca en Open Food Facts
                                        ↓
                              Muestra ambas secciones
```

### Criterios

- **Mínimo 3 caracteres** para activar búsqueda OFF
- **< 5 resultados locales** para mostrar OFF
- **Debounce de 500ms** para evitar exceso de llamadas
- **Timeout de 10s** en llamadas API

## 🎨 Diseño Visual

### Sección Local
```
┌─────────────────────────────────────┐
│ 📊 Disponible en Asciende           │
├─────────────────────────────────────┤
│ Arroz blanco               [USDA]   │
│ 130 kcal | P: 2.7g | C: 28g | F: 0.3g│
└─────────────────────────────────────┘
```

### Sección OFF
```
┌─────────────────────────────────────┐
│ 🔗 Fuente externa (Open Food Facts) │
├─────────────────────────────────────┤
│ Coca-Cola Original         [OFF]    │
│ 42 kcal | P: 0g | C: 10.6g | F: 0g  │
└─────────────────────────────────────┘
```

## 📊 Campos de Base de Datos

### Nuevos Campos en `foods`

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `source` | TEXT | Origen del alimento | 'open_food_facts' |
| `off_product_id` | TEXT | Código de barras OFF | '3017620422003' |
| `off_last_sync` | TIMESTAMPTZ | Última sincronización | '2024-01-09T16:00:00Z' |
| `is_verified` | BOOLEAN | Verificado por trainer | false |

### Consultar por Fuente

```sql
-- Alimentos de Open Food Facts
SELECT * FROM foods WHERE source = 'open_food_facts';

-- Alimentos verificados de OFF
SELECT * FROM foods
WHERE source = 'open_food_facts' AND is_verified = true;

-- Resumen por fuente
SELECT source, COUNT(*) FROM foods GROUP BY source;
```

## 🔧 Verificación de Alimentos

### Para Trainers/Admins

Los alimentos de Open Food Facts pueden ser verificados:

```tsx
// Marcar alimento como verificado
await supabase
  .from('foods')
  .update({ is_verified: true })
  .eq('id', foodId);
```

Alimentos verificados mostrarán ✓ en el badge.

## 🐛 Troubleshooting

### No aparecen resultados de OFF

**Solución**:
- Verificar que hay < 5 resultados locales
- Confirmar que búsqueda tiene ≥ 3 caracteres
- Revisar consola del navegador para errores API

### Duplicados en base de datos

**Solución**:
```sql
-- Verificar constraint
SELECT conname FROM pg_constraint
WHERE conrelid = 'foods'::regclass
AND conname = 'unique_off_product_id';
```

### Alimento sin datos nutricionales

OFF rechaza automáticamente productos sin macronutrientes completos.

## 📈 Métricas

### Consultar Uso

```sql
-- Total alimentos por fuente
SELECT source, COUNT(*) as total
FROM foods
GROUP BY source;

-- Alimentos OFF agregados por fecha
SELECT DATE(off_last_sync) as fecha, COUNT(*) as nuevos
FROM foods
WHERE source = 'open_food_facts'
GROUP BY DATE(off_last_sync)
ORDER BY fecha DESC;

-- Alimentos OFF más usados
SELECT f.name, COUNT(mi.id) as usos
FROM foods f
JOIN meal_plan_items mi ON f.id = mi.food_id
WHERE f.source = 'open_food_facts'
GROUP BY f.id, f.name
ORDER BY usos DESC
LIMIT 10;
```

## ✅ Checklist de Integración

- [x] Migración aplicada
- [x] Utilidades creadas
- [x] Componentes implementados
- [x] Badges visuales
- [x] Atribución legal
- [x] Documentación completa
- [x] Build exitoso

## 🎯 Próximos Pasos Sugeridos

1. **Agregar a FullMealEditor**: Integrar `FoodSearchWithOFF` en el editor existente
2. **Panel de Verificación**: UI para que trainers verifiquen alimentos OFF
3. **Actualización Periódica**: Cron para actualizar datos OFF existentes
4. **Escáner de Código de Barras**: Integración móvil con cámara
5. **Analytics**: Dashboard de uso de fuentes externas

## 📞 Soporte

Para preguntas o problemas:
- Documentación completa: `OPEN_FOOD_FACTS_INTEGRATION.md`
- API OFF: https://openfoodfacts.github.io/api-documentation/
- Email: contact@asciende.app

---

**Estado**: ✅ Producción Ready
**Fecha**: 2024-01-09
**Versión**: 1.0.0
