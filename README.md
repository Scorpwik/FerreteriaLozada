# FerreteriaLozada

## Web Ferreteria Lozada

Sitio publicado: https://scorpwik.github.io/FerreteriaLozada/

Proyecto final de Desarrollo Web - USFQ.

## Integrantes

- Joshua Lozada (340832)
- Juan Diego Cadena (329220)
- Raymond Portilla (335050)

## Objetivo

Crear una plataforma con catalogo interactivo y carrito de cotizacion vinculado a WhatsApp para microempresas, maestros de obra y clientes de Ferreteria Lozada.

El proyecto busca que el cliente pueda revisar productos, filtrar lo que necesita, agregar articulos a una cotizacion y enviar el pedido directamente por WhatsApp, sin depender de un sistema de pago dentro de la pagina. La venta se confirma despues por conversacion directa con la ferreteria.

## Identidad Visual

- Colores: naranja, negro y blanco.
- Tipografias: Zen Dots como tipografia principal y Anta como tipografia secundaria.
- Tono: amigable, experto y de vecino.

## Entregables Finales

- Codigo fuente en HTML, CSS y JavaScript.
- Diseno responsivo para movil y escritorio.
- Catalogo conectado a Firebase.
- Panel de administracion protegido con inicio de sesion.
- Carrito de cotizacion conectado con la API de WhatsApp.

## Estructura del Proyecto

- `index.html`: pagina principal de presentacion de Ferreteria Lozada.
- `catalogo.html`: catalogo publico, filtros, carrito y envio por WhatsApp.
- `admin.html`: panel privado para administrar productos, categorias y medidas.
- `css/styles.css`: estilos generales del sitio publico.
- `css/admin.css`: estilos especificos del panel de administracion.
- `js/app.js`: logica del catalogo publico, carrito, filtros, variantes y WhatsApp.
- `js/admin.js`: logica del panel administrador, autenticacion, CRUD de productos y configuracion de medidas.
- `Assets/`: imagenes, iconos y recursos visuales del sitio.
- `Validacion_y_test/`: material de validacion y pruebas del proyecto.

## Tecnologias Utilizadas

- HTML5 para la estructura de las paginas.
- CSS3 y Bootstrap para estilos, layout responsivo y componentes visuales.
- JavaScript modular para la logica del catalogo y del panel admin.
- Firebase Firestore para almacenar productos, categorias y medidas.
- Firebase Authentication para proteger el acceso al panel de administracion.
- WhatsApp API mediante enlaces `wa.me` para enviar cotizaciones.

## Logica General del Sitio

El proyecto esta dividido en dos experiencias principales: la tienda publica y el panel de administracion.

En la tienda publica, `js/app.js` se conecta a la coleccion `productos` de Firestore mediante `onSnapshot`. Esto permite que los cambios realizados desde el administrador se reflejen automaticamente en el catalogo sin recargar manualmente la base de datos.

Cuando llegan los productos desde Firebase, el sistema:

- Guarda los productos en memoria dentro de `catalogData`.
- Construye dinamicamente la lista de categorias disponibles.
- Ordena las categorias de forma alfabetica, dejando "Otros" al final.
- Renderiza las tarjetas del catalogo.
- Aplica filtros de busqueda, categoria, stock y rango de precio.
- Agrupa productos con el mismo nombre para tratarlos como variantes o medidas del mismo articulo.

Para evitar una carga inicial demasiado pesada, el catalogo muestra productos por bloques. Primero se renderiza una cantidad limitada y luego el usuario puede usar el boton "Mostrar mas productos" para continuar viendo el resto.

## Catalogo Publico

El catalogo permite buscar productos por nombre o descripcion, filtrar por categoria, revisar disponibilidad y comparar precios por unidad o por ciento cuando el producto lo permite.

Los productos pueden mostrarse de dos formas:

- Producto individual: una tarjeta representa un solo articulo.
- Producto con variantes: una tarjeta representa un grupo de articulos con el mismo nombre, pero con medidas o presentaciones distintas.

Cuando un producto tiene varias medidas, el usuario puede seleccionar la medida directamente desde la tarjeta del catalogo. Esto evita tener que abrir el detalle del producto solo para escoger una variante.

Cada tarjeta muestra:

- Imagen del producto o un icono de reemplazo si no hay imagen.
- Categoria.
- Nombre.
- Medidas disponibles.
- Precio unitario y, si aplica, precio por ciento.
- Controles de cantidad.
- Boton para agregar al carrito.

## Carrito y WhatsApp

El carrito funciona como una lista de cotizacion. No procesa pagos ni solicita datos bancarios.

Cuando el usuario agrega un producto, `js/app.js` guarda en memoria:

- Producto seleccionado.
- Cantidad.
- Medida o variante elegida.
- Tipo de precio seleccionado, por ejemplo unidad o ciento.
- Subtotal del producto.

El carrito calcula automaticamente el total de la cotizacion y actualiza los contadores visuales del boton flotante y del acceso superior del catalogo.

Al presionar el boton para enviar la cotizacion, la funcion `sendWhatsApp()` crea un mensaje con todos los productos del carrito, cantidades, medidas, subtotales y total final. Luego abre un enlace de WhatsApp con el numero configurado en el proyecto.

Numero actual configurado para WhatsApp:

```js
593995307272
```

## Panel de Administracion

El panel de administracion esta en:

```text
admin.html
```

Desde este panel se puede:

- Crear nuevos productos.
- Editar productos existentes.
- Eliminar productos.
- Activar o desactivar stock.
- Subir imagenes desde archivo.
- Agregar imagenes mediante URL.
- Crear variantes de un producto.
- Cambiar precios de forma rapida desde la tabla.
- Administrar categorias.
- Administrar secciones y opciones de medidas.

La tabla del administrador tambien agrupa productos con el mismo nombre. Si un producto tiene varias variantes, se muestra una fila principal y las variantes se pueden expandir para editar medidas, precios y stock.

## Tutorial para Acceder al Admin

1. Abrir el sitio publicado:

```text
https://scorpwik.github.io/FerreteriaLozada/
```

2. Entrar a la pagina de administracion:

```text
https://scorpwik.github.io/FerreteriaLozada/admin.html
```

3. Iniciar sesion con las credenciales de prueba:

```text
Correo: admin@gmail.com
Contrasena: admin
```

4. Una vez dentro, se mostrara el panel con la tabla de productos.

5. Para agregar un producto, usar el boton "Nuevo Producto".

6. Para editar un producto existente, usar el boton de lapiz en la tabla.

7. Para crear otra medida o variante de un producto, usar el boton de variante.

8. Para salir del panel, usar el boton de cerrar sesion o volver a la tienda desde las opciones del administrador.

## Logica del Administrador

El archivo `js/admin.js` maneja la autenticacion y la administracion de datos.

La autenticacion se realiza con Firebase Authentication. Cuando el usuario inicia sesion correctamente, se muestra el panel y se activan las lecturas en tiempo real de Firestore. Si no hay usuario autenticado, el panel permanece oculto.

El administrador trabaja principalmente con dos colecciones:

- `productos`: almacena nombre, descripcion, categoria, medida, precio, precio por ciento, stock e imagenes.
- `medidas`: almacena las secciones de medidas y categorias usadas por los formularios del panel.

Cuando se crea o edita un producto, el sistema valida los datos principales y guarda la informacion en Firestore. Si se sube una imagen desde archivo, antes de guardarla se comprime en el navegador para reducir el peso y evitar que el documento sea demasiado grande.

Las imagenes pueden guardarse de dos maneras:

- Como imagen comprimida en base64 cuando se sube un archivo.
- Como URL cuando se pega un enlace externo.

El administrador tambien permite mantener categorias y medidas de forma dinamica. Esto significa que los formularios no dependen de listas fijas escritas manualmente en HTML, sino que se actualizan segun lo que exista en Firestore.

## Modelo de Datos de Producto

Un producto puede contener campos como:

```js
{
  name: "Tornillo MDF",
  desc: "Descripcion del producto",
  category: "Tornilleria",
  measure: "6 x 1",
  measures: ["6 x 1"],
  price: 0.03,
  bulkPrice: 0.75,
  stock: true,
  imageB64: "...",
  imageUrl: "https://..."
}
```

Cuando varios productos comparten el mismo `name`, el sistema los interpreta como variantes del mismo articulo. Esto permite que el catalogo muestre una sola tarjeta con selector de medidas, mientras que Firestore mantiene cada variante como un documento independiente.

## Diseno Responsivo

El sitio esta adaptado para escritorio y celular.

En escritorio, el catalogo aprovecha mas columnas para que los usuarios puedan comparar productos rapidamente. En celular, el catalogo mantiene una distribucion compacta para mostrar varios productos por fila sin que cada tarjeta ocupe toda la pantalla.

El carrito se abre como panel lateral, lo que permite revisar la cotizacion sin abandonar el catalogo.

## Flujo de Uso Recomendado

Para clientes:

1. Entrar al sitio.
2. Ir al catalogo.
3. Buscar o filtrar productos.
4. Seleccionar medidas y cantidades.
5. Agregar productos al carrito.
6. Enviar la cotizacion por WhatsApp.
7. Confirmar disponibilidad, pago y entrega directamente con Ferreteria Lozada.

Para administradores:

1. Entrar a `admin.html`.
2. Iniciar sesion.
3. Agregar o actualizar productos.
4. Revisar stock y precios.
5. Administrar categorias y medidas cuando sea necesario.
6. Cerrar sesion al terminar.

## Notas de Seguridad y Alcance

- La pagina no procesa pagos.
- La confirmacion del pedido se realiza por WhatsApp.
- El panel de administracion requiere autenticacion.
- Las credenciales de prueba existen para facilitar la revision academica del proyecto.
- Los datos del catalogo se administran desde Firebase, por lo que los cambios pueden verse reflejados en tiempo real.
