# Prompt para Integración de Satélites

Usa este prompt en cada satélite (Lab, Endurance, Nutrition, Motion, Performance) para facilitar la integración con el Hub de autenticación.

---

## Para Lab (lab.asciende.pro)

```
El Hub de Asciende (Hub Supabase: ngkcbygyoobqhlmlnuvl) tiene una función de autenticación 
para Lab disponible en: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth

Esta función acepta POST con { email, password } y devuelve:
{
  "token": "JWT de 7 días",
  "user": {
    "id": "user_id",
    "email": "email@example.com",
    "name": "Nombre",
    "role": "athlete/trainer/admin",
    "membership_slug": "inicia/basico/pro/elite",
    "membership_name": "Nombre de Membresía"
  }
}

1. Busca todos los fetch a autenticación en el código
2. Reemplaza la URL por: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/lab-auth
3. Guarda el token en localStorage con clave 'lab_auth_token'
4. Usa el token para autorización en requests subsecuentes

También disponible: Archivo de utilidad SatelliteAuthClient en el Hub que puedes copiar 
para estandarizar la autenticación en todos los satélites.
```

---

## Para Endurance (endurance.asciende.pro)

```
El Hub de Asciende (Hub Supabase: ngkcbygyoobqhlmlnuvl) tiene una función de autenticación 
para Endurance disponible en: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth

Esta función acepta POST con { email, password } y devuelve:
{
  "token": "JWT de 7 días",
  "user": {
    "id": "user_id",
    "email": "email@example.com",
    "name": "Nombre",
    "role": "athlete/trainer/admin",
    "membership_slug": "inicia/basico/pro/elite",
    "membership_name": "Nombre de Membresía"
  }
}

1. Busca todos los fetch a autenticación en el código
2. Reemplaza la URL por: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/endurance-auth
3. Guarda el token en localStorage con clave 'endurance_auth_token'
4. Usa el token para autorización en requests subsecuentes

También disponible: Archivo de utilidad SatelliteAuthClient en el Hub que puedes copiar 
para estandarizar la autenticación en todos los satélites.
```

---

## Para Nutrition (nutrition.asciende.pro)

```
El Hub de Asciende (Hub Supabase: ngkcbygyoobqhlmlnuvl) tiene una función de autenticación 
para Nutrition disponible en: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-auth

Esta función acepta POST con { email, password } y devuelve:
{
  "token": "JWT de 7 días",
  "user": {
    "id": "user_id",
    "email": "email@example.com",
    "name": "Nombre",
    "role": "athlete/trainer/admin",
    "membership_slug": "inicia/basico/pro/elite",
    "membership_name": "Nombre de Membresía"
  }
}

1. Busca todos los fetch a autenticación en el código
2. Reemplaza la URL por: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/nutrition-auth
3. Guarda el token en localStorage con clave 'nutrition_auth_token'
4. Usa el token para autorización en requests subsecuentes

También disponible: Archivo de utilidad SatelliteAuthClient en el Hub que puedes copiar 
para estandarizar la autenticación en todos los satélites.
```

---

## Para Motion (motion.asciende.pro)

```
El Hub de Asciende (Hub Supabase: ngkcbygyoobqhlmlnuvl) tiene una función de autenticación 
para Motion disponible en: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/motion-auth

Esta función acepta POST con { email, password } y devuelve:
{
  "token": "JWT de 7 días",
  "user": {
    "id": "user_id",
    "email": "email@example.com",
    "name": "Nombre",
    "role": "athlete/trainer/admin",
    "membership_slug": "inicia/basico/pro/elite",
    "membership_name": "Nombre de Membresía"
  }
}

1. Busca todos los fetch a autenticación en el código
2. Reemplaza la URL por: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/motion-auth
3. Guarda el token en localStorage con clave 'motion_auth_token'
4. Usa el token para autorización en requests subsecuentes

También disponible: Archivo de utilidad SatelliteAuthClient en el Hub que puedes copiar 
para estandarizar la autenticación en todos los satélites.
```

---

## Para Performance (performance.asciende.pro)

```
El Hub de Asciende (Hub Supabase: ngkcbygyoobqhlmlnuvl) tiene una función de autenticación 
para Performance disponible en: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/performance-auth

Esta función acepta POST con { email, password } y devuelve:
{
  "token": "JWT de 7 días",
  "user": {
    "id": "user_id",
    "email": "email@example.com",
    "name": "Nombre",
    "role": "athlete/trainer/admin",
    "membership_slug": "inicia/basico/pro/elite",
    "membership_name": "Nombre de Membresía"
  }
}

1. Busca todos los fetch a autenticación en el código
2. Reemplaza la URL por: https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/performance-auth
3. Guarda el token en localStorage con clave 'performance_auth_token'
4. Usa el token para autorización en requests subsecuentes

También disponible: Archivo de utilidad SatelliteAuthClient en el Hub que puedes copiar 
para estandarizar la autenticación en todos los satélites.
```

---

## Archivos de Referencia en el Hub

Estos archivos están disponibles en el repositorio del Hub y pueden servirte como referencia:

1. **SATELLITE_AUTH_INTEGRATION_GUIDE.md** - Guía completa con ejemplos de código
2. **src/utils/satelliteAuthClient.ts** - Clase reutilizable para estandarizar autenticación

Puedes copiar y adaptar `satelliteAuthClient.ts` en cada satélite para mantener consistencia.

---

## Testing Rápido

Para verificar que la función funciona:

```bash
# Reemplaza SATELLITE por: lab, endurance, nutrition, motion, o performance
curl -X POST https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/{SATELLITE}-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@asciende.pro","password":"password123"}'
```

Deberías recibir un token JWT válido.
