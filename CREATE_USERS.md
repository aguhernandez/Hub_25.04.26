# Crear Usuarios Admin y Trainer

Como las contraseñas en Supabase Auth requieren hashing especial, usa este método:

## Método 1: Desde el código de la aplicación

Abre tu navegador en la página de login y ejecuta este código en la consola:

```javascript
// Crear Admin
await supabase.auth.signUp({
  email: 'admin@asciende.com',
  password: 'admin123',
  options: {
    data: {
      full_name: 'Administrator',
      role: 'admin'
    }
  }
})

// Crear Trainer
await supabase.auth.signUp({
  email: 'trainer@asciende.com',
  password: 'trainer123',
  options: {
    data: {
      full_name: 'Trainer Coach',
      role: 'trainer'
    }
  }
})
```

## Método 2: Usar el Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Authentication → Users
3. Click "Add User"
4. Email: admin@asciende.com, Password: admin123
5. Repite para trainer@asciende.com / trainer123

## Método 3: Script automático

Ya existe tu usuario personal: aguhernandez1@gmail.com

Puedes actualizar su rol a admin temporalmente para probar las funciones de admin.
