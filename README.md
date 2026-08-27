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

### 1.4 Equipo (5 integrantes)

| Rol | Integrante | Responsabilidad principal |
| :--- | :--- | :--- |
| 🧭 PM | Jose Luis | Roadmap, requisitos, QA, demo, coordinación 30 días |
| ⚙️ DevOps | German | Supabase, Vercel, Oracle VPS, CI/CD, Docker, dominios, Realtime |
| 🎨 Frontend | Deimer | Panel gestión, Menú web, Carrito, Visor 3D/AR (model-viewer) |
| 🔧 Backend | Keiner | Auth multi-tenant, Productos, Mesas/QR, Pedidos, WebSockets, Storage |
| 🔧 Backend | Motta | Fork Luna-Worker, Tools restaurante, Gemini API, analítica |

> Con 5 se puede paralelizar: Frontend y Backend trabajan simultáneo en MVP1 (7-10 días en vez de 14).

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

### 3.5 Presupuesto Completo para Patrocinio (Hackatón) - 6 y 12 meses

> **Para presentar a patrocinador si ganan - Costo real de operación post-hackatón**

**A. Costos Únicos (una sola vez)**

| Concepto | Costo USD | Costo COP* |
| :--- | :--- | :--- |
| Dominio onlyfood.com (1 año) + SSL | $15 | $46.500 |
| Diseño UI/UX + branding | $0 (equipo) | $0 |
| Lote inicial 3D (50 productos demo con Meshy) | $15 | $46.500 |
| **Subtotal único** | **$30** | **$93.000** |

**B. Costos Mensuales Recurrentes (Producción)**

| Concepto | Proveedor | Mensual USD | Mensual COP |
| :--- | :--- | :--- | :--- |
| Backend/DB/Auth/Realtime/Storage 8GB | Supabase Pro | $25 | $77.500 |
| Hosting Frontend + Edge | Vercel Pro (team) | $20 | $62.000 |
| VPS Luna-Worker + Worker 3D | Oracle Free Tier (gratis 2 años) / Fly.io | $0 - $15 | $0 - $46.500 |
| Almacenamiento modelos 3D/CDN (100GB) | Supabase Storage + Cloudflare R2 | $10 | $31.000 |
| IA 3D - 100 modelos/mes nuevos | Meshy API $0.25 c/u | $25 | $77.500 |
| IA Luna-Worker 20 restaurantes (100 consultas/día c/u) | Gemini 2.5 Flash-Lite $1.5 c/u | $30 | $93.000 |
| Monitoreo/logs (Sentry, Uptime) | Hobby | $10 | $31.000 |
| **Subtotal mensual (20 restaurantes)** | | **$120 - $135** | **$372.000 - $418.500** |
| **Subtotal mensual (50 restaurantes)** | | **$155** | **$480.500** |

**C. Paquete Patrocinio Propuesto**

| Paquete | Duración | Total USD | Total COP | Qué cubre |
| :--- | :--- | :--- | :--- | :--- |
| **Piloto** | 6 meses | **$750** | **$2.325.000** | Infra completa + 20 restaurantes + 300 modelos 3D |
| **Escala** | 12 meses | **$1.500** | **$4.650.000** | Infra + 50 restaurantes + 600 modelos 3D |
| **Piloto + Estipendio equipo (opcional)** | 6 meses | **$2.500** | **$7.750.000** | Anterior + $290/mes estipendio 5 integrantes |

* Tasa referencia: $1 USD = $3.100 COP

> **Nota patrocinador:** Con $750 por 6 meses la plataforma opera sin costo para 20 restaurantes piloto. A $30/mes por restaurante, con 10 clientes ya se autofinancia ($300/mes ingreso vs $135 costo = **$165 utilidad/mes**). El patrocinio solo es capital semilla, luego es autosostenible. Infra Oracle Free reduce $180/año.

### 3.6 Tiempo de Entrega - 30 Días (Equipo 5)

> **Deadline: 1 mes - Entrega completa MVP1-MVP5 con 5 integrantes**

| Semana | Días | Entregable | Responsables |
| :--- | :--- | :--- | :--- |
| **1-2** | 1-12 | **MVP1 Base** - Auth, Productos, Mesas/QR, Menú, Carrito, Pedidos Realtime, Cocina, Dashboard | German (infra) + Deimer (FE) + Keiner (BE) + PM valida |
| **3** | 13-20 | **MVP2+3 3D/AR** - Upload, Cola 3D, visor model-viewer, botón AR | Deimer (visor) + Keiner (upload/cola) + German (Storage) |
| **4** | 20-26 | **MVP4 Luna-Worker** - Fork Luna + Tools + Gemini Flash-Lite | Motta (fork + tools) + Keiner (API restaurante) |
| **4** | 27-30 | **MVP5 + QA/Deploy** - Analítica + pruebas E2E + deploy prod + demo | Todos - Jose Luis coordina demo final |

*Con 5 se hace en paralelo: MVP1 se cierra en 12 días en vez de 14. DevOps deja infra lista día 1 para no bloquear.*

## 4. Roadmap 30 Días Detallado

1. **Día 1-2:** German setup Supabase + Vercel + Oracle + repo | PM define historias
2. **Día 3-12:** Deimer (Panel/Menú) + Keiner (API/DB/QR/Realtime) en paralelo - MVP1 testeado
3. **Día 13-20:** Deimer integra model-viewer/AR + Keiner cola 3D con Meshy API
4. **Día 20-26:** Motta fork Luna-Worker (psique-trabajador + tools) con Gemini 2.5 Flash-Lite
5. **Día 27-30:** Jose Luis QA + analítica MVP5 + deploy prod + video demo

## 5. Siguiente Paso

Clonar luna-2.0 -> psique-trabajador.js + tools-restaurante.js + modelo.js híbrido (Ollama/Gemini) + memoria/{restaurant_id}.json.
