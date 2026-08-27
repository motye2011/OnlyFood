import { spawnSync } from "node:child_process";
import { platform, loadavg, freemem, totalmem } from "node:os";

const ES_WINDOWS = platform() === "win32";
const FUERA_DEL_PC = "(sin percepción de ventanas: ahora mismo corro en un servidor remoto, no en tu PC)";

export const ACCIONES_VALIDAS = new Set(["cerrar_aplicacion", "abrir_aplicacion", "estado_sistema"]);

export const ACCIONES_META = {
  estado_sistema: { impacto: "informativo", reversible: true, requiereConfirmacion: false },
  abrir_aplicacion: { impacto: "cambiar_sistema", reversible: true, requiereConfirmacion: true },
  cerrar_aplicacion: { impacto: "cambiar_sistema", reversible: true, requiereConfirmacion: true },
};

const PROTEGIDOS = new Set([
  "system", "registry", "smss", "csrss", "wininit", "services", "lsass",
  "winlogon", "svchost", "spoolsv", "explorer", "dwm", "taskhostw",
  "securityhealthservice", "audiodg", "node", "powershell", "pwsh",
  "cmd", "conhost", "winlog", "msmpeng",
]);

const APPS = {
  "bloc de notas": "notepad",
  "notas": "notepad",
  "calculadora": "calc",
  "explorador": "explorer",
  "navegador": "msedge",
  "edge": "msedge",
  "chrome": "chrome",
  "terminal": "wt",
  "spotify": "spotify",
  "word": "winword",
  "powerpoint": "powerpnt",
};

function runPS(comando) {
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", comando], {
    encoding: "utf8",
    timeout: 25000,
  });
  return (r.stdout || "").trim();
}

export function ventanasActivas(limite = 20) {
  if (!ES_WINDOWS) return FUERA_DEL_PC;
  const salida = runPS(
    `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -First ${limite} | ForEach-Object { "$($_.ProcessName) - $($_.MainWindowTitle)" }`
  );
  return salida || "(no hay ventanas visibles en este momento)";
}

export function estadoSistema() {
  if (!ES_WINDOWS) {
    const carga = loadavg()[0].toFixed(2);
    const ram = `${(freemem() / 1024 ** 3).toFixed(1)}GB libre de ${(totalmem() / 1024 ** 3).toFixed(1)}GB`;
    return `CPU carga ${carga} · RAM ${ram} (servidor)`;
  }
  const cpu = runPS("(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average");
  const ram = runPS(
    "$os = Get-CimInstance Win32_OperatingSystem; '{0:0.#}GB libre de {1:0.#}GB' -f ($os.FreePhysicalMemory/1MB), ($os.TotalVisibleMemorySize/1MB)"
  );
  return `CPU ${cpu || "?"}% · RAM ${ram || "no disponible"}`;
}

export function cerrarAplicacion(objetivo) {
  if (!ES_WINDOWS) return "No puedo tocar tu PC desde aquí: vivo en un servidor remoto, no en tu equipo.";
  const limpio = String(objetivo ?? "").trim().slice(0, 60);
  if (!limpio) return "No indicaste qué aplicación cerrar.";

  const t = limpio.replace(/'/g, "''");
  const listado = runPS(
    `$t = '${t}'; Get-Process | Where-Object { $_.ProcessName -like "*$t*" -or $_.MainWindowTitle -like "*$t*" } | ForEach-Object { "$($_.ProcessName)|$($_.Id)" }`
  );

  const filas = listado.split(/\r?\n/).filter(Boolean).map((f) => f.split("|"));
  if (filas.length === 0) return `No encontré ninguna app con "${limpio}".`;

  const noProtegidos = filas.filter(([nombre]) => !PROTEGIDOS.has(nombre.trim().toLowerCase()));
  if (noProtegidos.length === 0) return "Eso es un proceso del sistema, no puedo cerrarlo.";

  const pids = [...new Set(noProtegidos.map((f) => f[1]))].join(",");
  runPS(`Stop-Process -Id ${pids} -Force -ErrorAction SilentlyContinue`);

  const nombres = [...new Set(noProtegidos.map((f) => f[0].trim()))].join(", ");
  return `He cerrado: ${nombres}.`;
}

function resolverRutaExe(exe) {
  const viaCommand = runPS(`$c = Get-Command '${exe}' -ErrorAction SilentlyContinue; if ($c -and $c.Source) { $c.Source }`);
  if (viaCommand) return viaCommand;

  const localApp = runPS(`[Environment]::GetFolderPath('LocalApplicationData')`);
  const roaming = runPS(`[Environment]::GetFolderPath('ApplicationData')`);
  const raices = ["C:\\Program Files", "C:\\Program Files (x86)", "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs"];
  if (localApp) raices.push(localApp);
  if (roaming) raices.push(roaming);
  const lista = raices.map((r) => `'${r}'`).join(",");
  return runPS(
    `Get-ChildItem -Path ${lista} -Filter '${exe}.exe' -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`
  );
}

function abrirUwp(filtro) {
  return runPS(
    `$p = Get-AppxPackage | Where-Object { $_.Name -match '${filtro}' } | Select-Object -First 1; ` +
      `if ($p) { $m = [xml](Get-Content "$($p.InstallLocation)\\AppxManifest.xml"); $m.Package.Applications.Application.Id + '|' + $p.PackageFamilyName }`
  );
}

function lanzarProceso(ruta, nombreProceso) {
  const res = runPS(
    `$p = Start-Process -FilePath '${ruta}' -PassThru; Start-Sleep -Seconds 3; ` +
      `if (Get-Process -Id $p.Id -ErrorAction SilentlyContinue) { 'ok' } elseif (Get-Process -Name '${nombreProceso}' -ErrorAction SilentlyContinue) { 'ok' } else { 'no' }`
  );
  return res === "ok";
}

const PROCESO = { spotify: "Spotify", winword: "WINWORD", powerpnt: "POWERPNT", calc: "CalculatorApp" };

export function abrirAplicacion(objetivo) {
  if (!ES_WINDOWS) return "No puedo abrir nada en tu PC desde aquí: vivo en un servidor remoto, no en tu equipo.";
  let limpio = String(objetivo ?? "").trim().toLowerCase().slice(0, 60);
  if (!limpio) return "¿Qué quieres que abra?";

  const clave = Object.keys(APPS).find((k) => limpio.includes(k));
  const exe = clave ? APPS[clave] : APPS[limpio];
  if (!exe) {
    return `No sé abrir "${limpio}". Solo conozco: notas, calculadora, explorador, navegador, chrome, terminal, spotify, word, powerpoint.`;
  }
  const nombre = clave || limpio;
  const proceso = PROCESO[exe] || exe;

  const ruta = resolverRutaExe(exe);
  if (ruta) {
    if (lanzarProceso(ruta, proceso)) return `He abierto ${nombre}.`;
    return `Inicié ${nombre} pero no detecté el proceso; échale un ojo a la ventana.`;
  }

  const uwp = abrirUwp(exe);
  if (uwp) {
    const partes = uwp.split("|");
    const appId = partes[0];
    const familia = partes[1];
    runPS(`Start-Process 'shell:AppsFolder\\${familia}!${appId}'`);
    const ok = runPS(`Start-Sleep -Seconds 4; if (Get-Process -Name '${proceso}' -ErrorAction SilentlyContinue) { 'ok' }`);
    return ok === "ok" ? `He abierto ${nombre} (Microsoft Store).` : `Lancé ${nombre} desde la Store, pero no vi el proceso; revisa la ventana o la barra de notificaciones.`;
  }

  return `No encontré ${nombre} instalado en tu equipo.`;
}