# TenPiano

App web para aprender a tocar el piano leyendo de dos formas: acordes en cifrado y notas en el pentagrama.

- **Sesión diaria de unos 10 minutos:** teoría breve, acordes y pentagrama.
- **Acordes:** lees el símbolo (con letras o con nombres) y armas el acorde, o ves las teclas y dices cuál es.
- **Pentagrama:** lees notas y frases, y la app escucha por el micrófono lo que tocas.
- **Canciones:** progresiones con pulso, tus propias canciones en cifrado y melodías de dominio público con acordes.
- **Repaso adaptado y racha** con días de perdón.

El progreso se guarda en el dispositivo. No hay servidor ni cuentas.

## Estructura

- `index.html`, `css/`, `js/`: la app (sin paso de compilación).
- `js/data.js`: contenido (notas, acordes, lecciones, plan, canciones).
- `js/pitch.js`: detección de tono (algoritmo YIN).
- `js/app.js`: inicio, sesión, plan y ajustes. `js/songs.js`: sección Canciones.
- `js/rhythm.js`: ejercicio de ritmo con pulso. `js/scores.js`: partituras propias en MusicXML. `js/story.js`: resumen animado del avance.
- `vendor/vexflow.js`: [VexFlow](https://www.vexflow.com/) para dibujar el pentagrama (licencia MIT).
- `vendor/osmd.min.js`: [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) para mostrar partituras MusicXML (licencia BSD de 3 cláusulas).

## Probar en local

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.
