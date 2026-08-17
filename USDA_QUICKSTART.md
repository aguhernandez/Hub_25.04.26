# 🚀 USDA Foods - Quick Start (3 pasos)

## Paso 1: Obtén tu API Key (GRATIS)
1. Ve a: https://fdc.nal.usda.gov/api-key-signup.html
2. Completa el formulario
3. Recibirás la key por email (instantáneo)

## Paso 2: Agrega a tu .env
```bash
USDA_API_KEY=tu_api_key_aqui
```

## Paso 3: Ejecuta el script
```bash
npm install
npm run load-usda
```

---

## ⚠️ Decisión Importante

### Opción A: Mantener alimentos existentes (SEGURO)
**No hagas nada** - El script agregará 32 alimentos nuevos sin borrar los 16 existentes.

**Resultado:** 48 alimentos totales

### Opción B: Borrar y empezar limpio (RECOMENDADO)
**Edita** `load-usda-foods.js` línea 195:
```javascript
const deleteExisting = true; // Cambia false a true
```

**Resultado:** 32 alimentos con datos completos

⚠️ **ADVERTENCIA:** Los planes nutricionales existentes dejarán de funcionar.

---

## ✅ ¿Funcionó?

Ve a **Nutrition > Meals** y agrega un alimento.

El sidebar de micronutrientes ahora debería mostrar **valores reales** en lugar de ceros.

---

## 📊 Qué se carga

- **32 alimentos comunes** (pollo, arroz, banana, etc.)
- **24 nutrientes** por alimento
- **Nombres en inglés + español**
- **Datos oficiales de USDA**

---

**¿Problemas?** Lee `USDA_FOODS_SETUP.md` para la guía completa.
