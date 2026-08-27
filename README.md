# Plataforma Inteligente de Menús 3D y Gestión de Restaurantes

Plataforma web integral que conecta **menú digital 3D/AR + pedidos por mesa (QR) + panel de gestión en tiempo real + agente IA Luna-Worker** para administración y analítica.

```
QR Mesa -> Menú Web -> Visor 3D / AR -> Carrito -> Pedido -> Panel/Cocina -> Luna-Worker gestiona y analiza
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

**MVP 2 - Experiencia 3D (Día 15-20)**
- Subida de 1-4 fotos por producto o video 20s
- Cola de generación 3D (Job Queue) -> Worker -> Optimización a .glb (<4MB, <50k polys) -> Preview -> Aprobar/Publicar
- Visor 3D en menú web (model-viewer + Three.js)

**MVP 3 - Realidad Aumentada (Día 20-22) - Integrado con MVP2**
- Botón "Ver en mi mesa" (WebXR / Scene Viewer / Quick Look) - reutiliza .glb del MVP2
- Rotar, escalar, colocar sobre superficie

**MVP 4 - Agente IA Luna-Worker (Día 22-27)**
- Fork de luna-2.0 adaptado: psique-trabajador.js (rasgos: eficiencia, rigor, proactividad, confiabilidad)
- Memoria por restaurant_id (memoria/{id}.json) + causalidad obligatoria para auditoría
- Tools: get_pedidos, get_ventas, get_top_productos, get_analitica_3d, update_precio, update_disponibilidad, create_producto, generate_descripcion
- Requiere confirmación para escrituras

**MVP 5 - Analítica Avanzada (Día 28-30) - Reducido**
- Escaneos QR, visitas, producto más visto, visualizaciones 3D, usos AR, conversión vistas->ventas, horas pico (integrado en dashboard MVP1)

### 1.2 No Funcionales
- Tiempo real <1s (pedido mesa -> cocina)
- Menú web <2s carga inicial, modelos 3D lazy-load
- Multi-tenant aislado
- Responsive mobile-first
- PWA opcional para panel cocina

### 1.3 Stack Recomendado
- Frontend: Next.js 14 (App Router)
- Backend/DB/Realtime/Storage: Supabase (Postgres + Auth + Realtime + Storage)
- 3D/AR: model-viewer, Three.js, glTF Transform
- IA 3D: Meshy / Tripo API (MVP) -> TripoSR self-hosted (escala)
- IA Agente: Luna-Worker (servidor.js + modelo.js híbrido) -> Gemini 2.5 Flash por defecto
- Deploy: Vercel (frontend) + Oracle VPS / Fly.io (Luna-Worker + Worker 3D)

## 2. Arquitectura

```
                    RESTAURANTE
                         |
                    PANEL GESTIÓN (Next.js + Supabase)
                         |
       +---------------+---------------+
       |               |               |
   Productos        Mesas/QR       Pedidos (Realtime)
       |               |               |
    Fotos/Video        |               |
       |               |               |
    Cola 3D -----------+----------> CLIENTE (Menú Web por QR)
       |                            /       \
    .glb ----------------------> Visor 3D -> AR -> Pedido -> Cocina
                                    |
                              Luna-Worker (Gemini 2.5 Flash)
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

### 3.2 MVP 2 - Con 3D

| Concepto | Costo |
| :--- | :--- |
| Meshy API / Tripo API (image-to-3D) | **$0.20 - $0.35 por modelo** |
| O Luma AI NeRF (video-to-3D) | $0.50 - $1.00 por modelo |
| Self-hosted TripoSR (GPU A10/4090 24GB) | **$0.60 - $1.50 / hora** -> ~$15-30/mes |

*Ejemplo: 50 productos con 3D = $10 - $18 una sola vez.*

### 3.3 MVP 4 - Luna-Worker (Gemini)

| Modelo | Input/1M | Output/1M | Costo real 100 consultas/día (~6M tokens/mes) |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash-Lite (recomendado)** | $0.10 | $0.40 | **~$1.5 / mes / restaurante** |
| Gemini 2.5 Flash | $0.30 | $2.50 | ~$4 / mes |
| OpenAI GPT-4o-mini | $0.15 | $0.60 | ~$3 / mes |

Gemini tiene **free tier 1.500 req/día** -> MVP4 gratis durante piloto.

### 3.4 Resumen por Escala (MVP1+2+4)

| Escenario | Infra | 3D (amortizado) | IA (Gemini Flash-Lite) | **Total / mes** |
| :--- | :--- | :--- | :--- | :--- |
| **1 restaurante piloto** | $1 - $2 | $0 (10 modelos iniciales $3) | $0 (free tier) | **~$2 - $5** |
| **10 restaurantes** | $25 (Supabase Pro) | $5 | ~$15 | **~$45 / mes** |
| **50 restaurantes** | $25 + $5 dominio | $10 | ~$75 | **~$110 / mes** |

Si cobras **$25 - $40 / mes por restaurante**, con 10 clientes ya eres rentable.

### 3.5 Tiempo de Entrega - 30 Días (Equipo 2-3 devs)

> **Deadline: 1 mes - Entrega completa MVP1-MVP5**

| Semana | Días | Entregable |
| :--- | :--- | :--- |
| **1-2** | 1-14 | **MVP1 Base** - Auth, Productos, Mesas/QR, Menú, Carrito, Pedidos Realtime, Cocina, Dashboard |
| **3** | 15-22 | **MVP2+3 3D/AR** - Upload, Cola 3D, visor model-viewer, botón AR |
| **4** | 22-27 | **MVP4 Luna-Worker** - Fork Luna + Tools + Gemini Flash-Lite |
| **4** | 28-30 | **MVP5 + QA/Deploy** - Analítica + pruebas E2E + deploy prod + demo |

*Para cumplir en 30 días: 2 devs en paralelo (1 frontend/menú + 1 backend/panel) o recortar MVP5 a métricas básicas.*

## 4. Roadmap 30 Días

1. **Día 1-2:** Setup Supabase + Next.js + Auth multi-tenant
2. **Día 3-14:** MVP1 completo y testeado con 1 restaurante piloto
3. **Día 15-22:** Integración 3D/AR (Meshy API, no self-hosted)
4. **Día 22-27:** Fork Luna-Worker con Gemini 2.5 Flash-Lite
5. **Día 28-30:** Buffer QA, deploy Vercel + Oracle y entrega

## 5. Siguiente Paso

Clonar luna-2.0 -> psique-trabajador.js + tools-restaurante.js + modelo.js híbrido (Ollama/Gemini) + memoria/{restaurant_id}.json.
