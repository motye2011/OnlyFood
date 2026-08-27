# Plataforma Inteligente de Menús 3D y Gestión de Restaurantes

Plataforma web integral que conecta **menú digital 3D + pedidos por mesa (QR) + panel de gestión en tiempo real + agente IA Luna-Worker** para administración y analítica.

```
QR Mesa -> Menú Web -> Visor 3D -> Carrito -> Pedido -> Panel/Cocina -> Luna-Worker gestiona y analiza
```

## 1. Requisitos del Proyecto

### 1.1 Funcionales por MVP

**MVP 1 - Sistema Base (Día 1-14) - OBLIGATORIO**
- Auth multi-tenant (restaurante) + Roles (admin / cocina)
- Gestión de Productos: CRUD, categorías, ingredientes, alérgenos, precio, disponibilidad, extras/variantes, imágenes
- Gestión de Mesas: CRUD, estado (libre/ocupada), QR único estático por mesa, descarga/impresión
- Menú Web Cliente: por restaurante_id + mesa_id, categorías, búsqueda, detalle de producto
- Carrito + Pedido: personalización, extras, notas, total
- Gestión de Pedidos: Nuevo -> En preparación -> Listo -> Entregado, tiempo real vía WebSockets, vista Cocina
- Dashboard básico: pedidos por estado, ventas del día

**MVP 2 - Experiencia 3D (Día 13-20)**
- Subida de 1-4 fotos por producto o video 20s
- Cola de generación 3D (Job Queue) -> Worker -> Optimización a .glb (<4MB, <50k polys) -> Preview -> Aprobar/Publicar
- Visor 3D en menú web (model-viewer + Three.js) — sin AR, solo visor 360° interactivo (rotar/zoom)

**MVP 3 - Agente IA Luna-Worker (Día 20-26)**
- Fork de luna-2.0 adaptado: psique-trabajador.js (rasgos: eficiencia, rigor, proactividad, confiabilidad)
- Memoria por restaurant_id (memoria/{id}.json) + causalidad obligatoria para auditoría
- Tools: get_pedidos, get_ventas, get_top_productos, get_analitica_3d, update_precio, update_disponibilidad, create_producto, generate_descripcion
- Requiere confirmación para escrituras

**MVP 4 - Analítica Avanzada (Día 27-30) - Reducido**
- Escaneos QR, visitas, producto más visto, visualizaciones 3D, conversión vistas->ventas, horas pico (integrado en dashboard MVP1)

### 1.2 No Funcionales
- Tiempo real <1s (pedido mesa -> cocina)
- Menú web <2s carga inicial, modelos 3D lazy-load
- Multi-tenant aislado
- Responsive mobile-first
- PWA opcional para panel cocina

### 1.3 Stack Recomendado
- Frontend: Next.js 16 (App Router) + Tailwind
- Backend/DB/Realtime/Storage: PostgreSQL 18 + Prisma (local) / Supabase (prod)
- 3D: model-viewer, Three.js, glTF Transform — solo visor 3D, sin AR
- IA 3D: Meshy / Tripo API (MVP) -> TripoSR self-hosted (escala)
- IA Agente: Luna-Worker (fork luna-2.0) -> Gemini 1.5 Flash (tools restaurante)
- Deploy: Vercel (frontend) + Oracle VPS

### 1.4 Equipo (5 integrantes)

| Rol | Integrante | Responsabilidad principal |
| :--- | :--- | :--- |
| 🧭 PM | Jose Luis | Roadmap, requisitos, QA, demo, coordinación 30 días |
| ⚙️ DevOps | German | Supabase, Vercel, Oracle VPS, CI/CD, Docker, dominios, Realtime |
| 🎨 Frontend | Deimer | Panel gestión, Menú web, Carrito, Visor 3D (model-viewer) |
| 🔧 Backend | Keiner | Auth multi-tenant, Productos, Mesas/QR, Pedidos, WebSockets, Storage |
| 🔧 Backend | Motta | Fork Luna-Worker, Tools restaurante, Gemini API, analítica |

> Con 5 se puede paralelizar: Frontend y Backend trabajan simultáneo en MVP1 (7-10 días en vez de 14).

## 2. Arquitectura

```
                    RESTAURANTE
                         |
                    PANEL GESTIÓN (Next.js + Prisma)
                         |
       +---------------+---------------+
       |               |               |
   Productos        Mesas/QR       Pedidos (Realtime)
       |               |               |
    Fotos/Video        |               |
       |               |               |
    Cola 3D -----------+----------> CLIENTE (Menú Web por QR)
       |                            |
    .glb ----------------------> Visor 3D -> Pedido -> Cocina
                                     |
                               Luna-Worker (Gemini 1.5 Flash)
```

## 3. Costos de Salida

Precios verificados Ago 2026. USD.

### 3.1 MVP 1 - Lanzamiento Piloto (1 restaurante, sin 3D/IA)

| Concepto | Proveedor | Costo Mes |
| :--- | :--- | :--- |
| Dominio + SSL | Namecheap/Cloudflare | $1 - $1.5 |
| Hosting Frontend | Vercel Hobby | $0 |
| Backend / DB / Auth / Realtime / Storage | Supabase Free | $0 |
| QR | Librería qrcode self-hosted | $0 |
| **TOTAL MVP1** | | **~$1 - $2 / mes** |

> Con Supabase Free soportas 1-3 restaurantes piloto sin costo. Al pasar a Pro ($25/mes) soportas 50-100 restaurantes.

### 3.2 MVP 2 - Con 3D (solo visor, sin AR)

| Concepto | Costo |
| :--- | :--- |
| Meshy API / Tripo API (image-to-3D) | **$0.20 - $0.35 por modelo** |
| O Luma AI NeRF (video-to-3D) | $0.50 - $1.00 por modelo |
| Self-hosted TripoSR (GPU A10/4090 24GB) | **$0.60 - $1.50 / hora** -> ~$15-30/mes |

*Ejemplo: 50 productos con 3D = $10 - $18 una sola vez. Sin AR se ahorra ~30% de tiempo.*

### 3.3 MVP 3 - Luna-Worker (Gemini)

| Modelo | Input/1M | Output/1M | Costo real 100 consultas/día (~6M tokens/mes) |
| :--- | :--- | :--- | :--- |
| **Gemini 1.5 Flash (recomendado)** | $0.10 | $0.40 | **~$1.5 / mes / restaurante** |
| Gemini 2.0 Flash | $0.30 | $2.50 | ~$4 / mes |
| OpenAI GPT-4o-mini | $0.15 | $0.60 | ~$3 / mes |

Gemini tiene **free tier 1.500 req/día** -> MVP3 gratis durante piloto.

### 3.4 Resumen por Escala (MVP1+2+3)

| Escenario | Infra | 3D (amortizado) | IA (Gemini Flash-Lite) | **Total / mes** |
| :--- | :--- | :--- | :--- | :--- |
| **1 restaurante piloto** | $1 - $2 | $0 (10 modelos iniciales $3) | $0 (free tier) | **~$2 - $5** |
| **10 restaurantes** | $25 (Supabase Pro) | $5 | ~$15 | **~$45 / mes** |
| **50 restaurantes** | $25 + $5 dominio | $10 | ~$75 | **~$110 / mes** |

Sin AR, entrega 3-4 días más rápida.

Si cobras **$25 - $40 / mes por restaurante**, con 10 clientes ya eres rentable.

### 3.5 Costo de Salida (Patrocinio Hackatón)

> **Costo único para salir a producción - incluye todo para entrega 30 días**

| Concepto | USD | COP* |
| :--- | :--- | :--- |
| Dominio + SSL (1 año) | $15 | $46.500 |
| Infra mes 1 (Postgres + Vercel Pro + Storage) | $45 | $139.500 |
| Lote inicial 3D (50 productos) | $15 | $46.500 |
| IA Luna-Worker mes 1 (20 restaurantes, Gemini 1.5 Flash) | $30 | $93.000 |
| IA 3D mes 1 (100 modelos) | $25 | $77.500 |
| **TOTAL SALIDA** | **$130** | **$403.000** |

* Tasa $1 = $3.100 COP. Mes 2 en adelante: **$100-125/mes** para 20 restaurantes. Con 10 clientes a $30/mes ya es autosostenible. Sin AR se ahorra $10/mes en CDN.

### 3.6 Tiempo de Entrega - 30 Días (Equipo 5)

> **Deadline: 1 mes - Entrega completa MVP1-MVP5 con 5 integrantes**

| Semana | Días | Entregable | Responsables |
| :--- | :--- | :--- | :--- |
| **1-2** | 1-12 | **MVP1 Base** - Auth, Productos, Mesas/QR, Menú, Carrito, Pedidos Realtime, Cocina, Dashboard | German (infra) + Deimer (FE) + Keiner (BE) + PM valida |
| **3** | 13-19 | **MVP2 3D** - Upload, Cola 3D, visor model-viewer 360° | Deimer (visor) + Keiner (upload/cola) + German (Storage) |
| **4** | 20-26 | **MVP3 Luna-Worker** - Fork Luna + Tools + Gemini 1.5 Flash | Motta (fork + tools) + Keiner (API restaurante) |
| **4** | 27-30 | **MVP4 + QA/Deploy** - Analítica + pruebas E2E + deploy prod + demo | Todos - Jose Luis coordina demo final |

*Con 5 se hace en paralelo: MVP1 se cierra en 12 días en vez de 14. DevOps deja infra lista día 1 para no bloquear.*

## 4. Roadmap 30 Días Detallado (sin AR)

1. **Día 1-2:** German setup Postgres + Vercel + repo | PM define historias
2. **Día 3-12:** Deimer (Panel/Menú) + Keiner (API/DB/QR/Realtime) en paralelo - MVP1 testeado
3. **Día 13-19:** Deimer integra visor 3D 360° + Keiner cola 3D con Meshy API
4. **Día 20-26:** Motta fork Luna-Worker (psique-trabajador + tools) con Gemini 1.5 Flash
5. **Día 27-30:** Jose Luis QA + analítica + deploy prod + video demo

## 5. Siguiente Paso

Clonar luna-2.0 -> psique-trabajador.js + tools-restaurante.js + modelo.js híbrido (Ollama/Gemini) + memoria/{restaurant_id}.json.
