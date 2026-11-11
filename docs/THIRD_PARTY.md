# Komponen pihak ketiga

Inventaris fase F, 11 November 2026. Versi dan lisensi diperiksa dari metadata paket
terpasang (`importlib.metadata`, `node_modules/*/package.json`) dan sumber resmi di bawah.
Kode milik tim berlisensi MIT; komponen lain mempertahankan ketentuannya.
Ini daftar dependency langsung dan komponen native utama, bukan SBOM seluruh dependency transitif.
Versi JavaScript tepat dikunci di `app/package-lock.json`.

## Server dan alat Python

| Komponen (versi diperiksa) | Lisensi | Sumber resmi |
|---|---|---|
| FastAPI 0.162.2 | MIT | [FastAPI](https://github.com/fastapi/fastapi/blob/master/LICENSE) |
| uvicorn 0.54.0, termasuk extra standard | BSD-3-Clause untuk uvicorn; extra memiliki lisensi masing-masing | [uvicorn](https://github.com/Kludex/uvicorn/blob/main/LICENSE.md) |
| python-multipart 0.0.33 | Apache-2.0 | [python-multipart](https://github.com/Kludex/python-multipart/blob/master/LICENSE.txt) |
| pydantic-settings 2.16.2 / Pydantic | MIT | [pydantic-settings](https://github.com/pydantic/pydantic-settings/blob/main/LICENSE), [Pydantic](https://github.com/pydantic/pydantic/blob/main/LICENSE) |
| NumPy 2.4.6 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 (metadata distribusi) | [NumPy](https://github.com/numpy/numpy/blob/main/LICENSE.txt) |
| SciPy 1.17.1 | BSD-3-Clause; bundled code memiliki pemberitahuan tambahan | [SciPy](https://github.com/scipy/scipy/blob/main/LICENSE.txt) |
| SoundFile 0.14.0 | BSD-3-Clause | [SoundFile](https://github.com/bastibe/python-soundfile/blob/master/LICENSE) |
| libsndfile (dibawa wheel SoundFile) | LGPL-2.1-or-later | [libsndfile](https://github.com/libsndfile/libsndfile/blob/master/COPYING) |
| PyYAML 6.0.3 | MIT | [PyYAML](https://github.com/yaml/pyyaml/blob/main/LICENSE) |
| MediaPipe 1.2.2 | Apache-2.0 | [MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE) |
| opencv-contrib-python 5.0.0.93 (dibawa MediaPipe; alat landmark mengimpor cv2) | Apache-2.0; lihat juga lisensi komponen wheel | [OpenCV Python](https://github.com/opencv/opencv-python/blob/4.x/LICENSE.txt), [OpenCV](https://github.com/opencv/opencv/blob/4.x/LICENSE) |
| praat-parselmouth 0.4.7 / Praat | GPL-3.0-or-later (classifier distribusi; metadata singkat GPLv3) | [Parselmouth](https://github.com/YannickJadoul/Parselmouth/blob/master/LICENSE), [Praat](https://www.fon.hum.uva.nl/praat/manual/License.html) |
| Matplotlib 3.11.2 | Lisensi Matplotlib berbasis PSF; lihat teks asli | [Matplotlib](https://matplotlib.org/stable/project/license.html) |
| pytest 9.2.0 | MIT | [pytest](https://github.com/pytest-dev/pytest/blob/main/LICENSE) |
| HTTPX 0.28.1 | BSD-3-Clause | [HTTPX](https://github.com/encode/httpx/blob/master/LICENSE.md) |
| Ruff 0.17.4 | MIT | [Ruff](https://github.com/astral-sh/ruff/blob/main/LICENSE) |
| Pillow 13.0.0 (alat aset B4, bukan kebutuhan runtime server) | MIT-CMU | [Pillow](https://github.com/python-pillow/Pillow/blob/main/LICENSE) |
| FFmpeg / ffprobe (binary sistem, tidak dibundel) | LGPL-2.1-or-later secara dasar; konfigurasi build dapat menjadi GPL | [FFmpeg legal](https://ffmpeg.org/legal.html) |
| Build Windows gyan.dev yang dipakai tim | GPL; versi tepat bergantung build | [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) |

## Model Face Landmarker

Bundle `face_landmarker.task` tidak di-commit. Unduhan yang diuji memakai SHA-256
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
[Dokumentasi Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
menautkan tiga model card komponen bundle. Ketiganya menyatakan **Apache License, Version 2.0**
pada halaman pertama:

- [BlazeFace short-range](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf).
- [Face Mesh V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf).
- [Blendshape V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf).

Dasar lisensi model berasal dari model card tersebut, bukan asumsi lisensi kode MediaPipe.
URL unduhan `latest` bisa berubah; hasil pemeriksaan ini merujuk bundle dengan hash di atas.

## App dan alat JavaScript

| Paket/kelompok (versi diperiksa) | Lisensi | Sumber resmi |
|---|---|---|
| expo 58.0.24, expo-asset 58.0.21, expo-camera 58.0.14, expo-constants 58.0.16 | MIT | [Expo](https://github.com/expo/expo/blob/main/LICENSE) |
| expo-file-system 58.0.13, expo-font 58.0.12, expo-haptics 58.0.8, expo-linking 58.0.17 | MIT | [Expo](https://github.com/expo/expo/blob/main/LICENSE) |
| expo-router 58.0.31, expo-secure-store 58.0.3, expo-splash-screen 58.0.14 | MIT | [Expo](https://github.com/expo/expo/blob/main/LICENSE) |
| expo-status-bar 58.0.5, expo-system-ui 58.0.7, expo-video 58.0.14 | MIT | [Expo](https://github.com/expo/expo/blob/main/LICENSE) |
| @expo/vector-icons 15.1.1 | MIT untuk kode; font ikon memiliki lisensi masing-masing | [vector-icons](https://github.com/expo/vector-icons), [font licenses](https://github.com/oblador/react-native-vector-icons#licensing) |
| @react-native-async-storage/async-storage 2.2.0 | MIT | [AsyncStorage](https://github.com/react-native-async-storage/async-storage/blob/main/LICENSE) |
| @react-navigation/native 7.5.1 | MIT | [React Navigation](https://github.com/react-navigation/react-navigation/blob/main/LICENSE) |
| @supabase/supabase-js 2.119.0 | MIT | [supabase-js](https://github.com/supabase/supabase-js/blob/master/LICENSE) |
| react / react-dom 19.3.0 | MIT | [React](https://github.com/facebook/react/blob/main/LICENSE) |
| react-native 0.88.1 | MIT | [React Native](https://github.com/facebook/react-native/blob/main/LICENSE) |
| react-native-gesture-handler 3.3.0 | MIT | [Gesture Handler](https://github.com/software-mansion/react-native-gesture-handler/blob/main/LICENSE) |
| react-native-safe-area-context 5.11.1 | MIT | [Safe Area Context](https://github.com/AppAndFlow/react-native-safe-area-context/blob/main/LICENSE) |
| react-native-screens 4.30.1 | MIT | [Screens](https://github.com/software-mansion/react-native-screens/blob/main/LICENSE) |
| react-native-svg 15.16.0 | MIT | [SVG](https://github.com/software-mansion/react-native-svg/blob/main/LICENSE) |
| react-native-url-polyfill 4.0.0 | MIT | [URL Polyfill](https://github.com/charpeni/react-native-url-polyfill/blob/main/LICENSE) |
| @testing-library/react-native 14.1.0 | MIT | [Testing Library](https://github.com/callstack/react-native-testing-library/blob/main/LICENSE) |
| @types/jest 30.0.0, @types/react 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/LICENSE) |
| eslint 9.39.5 | MIT | [ESLint](https://github.com/eslint/eslint/blob/main/LICENSE) |
| eslint-config-expo 58.0.4, jest-expo 58.0.14 | MIT | [Expo](https://github.com/expo/expo/blob/main/LICENSE) |
| jest 30.5.2 | MIT | [Jest](https://github.com/jestjs/jest/blob/main/LICENSE) |
| TypeScript 6.0.3 | Apache-2.0 | [TypeScript](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |

Supabase dipakai sebagai layanan, tidak dibundel. Aset cermin/bibir PNG dan generatornya
milik tim dan termasuk lisensi repo; tidak memakai gambar pihak ketiga. Wav2Vec2,
Transformers, PyTorch, torchaudio dan scikit-learn tidak dipasang/dipakai dalam MVP.

## Distribusi dan batas pemeriksaan

- MIT repo hanya berlaku untuk kode milik tim. Parselmouth/Praat tetap GPL; distribusi
  gabungan yang menautkannya perlu memenuhi ketentuan kompatibilitas, lisensi dan sumber
  yang berlaku. Ketentuan tidak hanya bergantung pada apakah hasil distribusinya binary.
  Submission tidak membundel venv, wheel, model atau FFmpeg. Jangan menganggap semua
  dependency berubah menjadi MIT karena berkas LICENSE root.
- Bila menyiapkan kontainer, binary atau APK di luar lingkup ini, sertakan pemberitahuan
  dan sumber yang diwajibkan komponen yang benar-benar dibundel; cek konfigurasi FFmpeg
  serta lisensi transitif dari artefak tersebut.
- Pemeriksaan ini mencatat metadata dan sumber lisensi, bukan sertifikasi kepatuhan hukum
  atau audit seluruh dependency transitif.
