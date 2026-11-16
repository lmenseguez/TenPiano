# TenPiano

App web para practicar lectura de partituras en piano, con sesiones diarias cortas.

- Muestra una nota en el pentagrama y escucha por el micrófono la tecla que tocas.
- Arma sola la sesión del día: repaso, nota nueva y frases para leer de corrido.
- Repite más seguido las notas que más cuestan.
- Lleva una racha con días de perdón.

El progreso se guarda en el dispositivo. No hay servidor ni cuentas.

## Estructura

- `index.html`, `css/`, `js/`: la app (sin paso de compilación).
- `js/pitch.js`: detección de tono (algoritmo YIN).
- `js/data.js`: plan de estudio (orden de las notas).
- `vendor/vexflow.js`: [VexFlow](https://www.vexflow.com/) para dibujar el pentagrama (licencia MIT).

## Probar en local

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.
