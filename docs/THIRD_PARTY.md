# Komponen pihak ketiga

Diperiksa ke sumber resmi pada 9 November 2026. Kode Cermin Wicara berlisensi MIT (lihat `LICENSE`);
komponen di bawah tetap memakai lisensinya masing-masing.

| Komponen | Dipakai di | Lisensi (SPDX) | Sumber resmi |
|---|---|---|---|
| MediaPipe 1.2.2 (Face Landmarker, Python Tasks API) | server | Apache-2.0 | https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE |
| Model `face_landmarker.task` (float16/latest, SHA-256 `64184e22…bc9ff`) | server/models (tidak di-commit) | **Belum terverifikasi** | https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task (halaman Face Landmarker tidak menyebut lisensi model; model card PDF belum terbaca) |
| Parselmouth (`praat-parselmouth` 0.4.7, Praat 6.1.38) | server | GPL-3.0 | https://github.com/YannickJadoul/Parselmouth/blob/master/LICENSE |
| Praat (dibundel di Parselmouth) | server | GPL-3.0-or-later | https://www.fon.hum.uva.nl/praat/manual/License.html |
| FFmpeg / ffprobe (binary sistem) | server | LGPL-2.1-or-later; build dengan bagian GPL menjadi GPL | https://ffmpeg.org/legal.html |
| FFmpeg build Windows gyan.dev (`full_build`) | mesin pengembang | GPL-3.0 | https://www.gyan.dev/ffmpeg/builds/ |
| Wav2Vec2 (`facebook/wav2vec2-base`, bobot model) | ditunda (roadmap, tidak dipasang di MVP) | Apache-2.0 | https://huggingface.co/facebook/wav2vec2-base |
| Hugging Face Transformers | ditunda (roadmap, tidak dipasang di MVP) | Apache-2.0 | https://github.com/huggingface/transformers/blob/main/LICENSE |
| PyTorch | ditunda (roadmap, tidak dipasang di MVP) | BSD-3-Clause | https://github.com/pytorch/pytorch/blob/main/LICENSE |
| torchaudio | ditunda (roadmap, tidak dipasang di MVP) | BSD-2-Clause | https://github.com/pytorch/audio/blob/main/LICENSE |
| scikit-learn | tidak dipakai (kappa dan metrik A6 dihitung sendiri di `server/app/dataset/`) | BSD-3-Clause | https://github.com/scikit-learn/scikit-learn/blob/main/COPYING |
| OpenCV (`opencv-contrib-python`, dependensi mediapipe; tidak di-import kode kita) | server | Apache-2.0 | https://github.com/opencv/opencv/blob/4.x/LICENSE |
| FastAPI | server | MIT | https://github.com/fastapi/fastapi/blob/master/LICENSE |
| Expo | app | MIT | https://github.com/expo/expo/blob/main/LICENSE |
| supabase-js | app | MIT | https://github.com/supabase/supabase-js/blob/master/LICENSE |
| Supabase (platform) | layanan backend | Apache-2.0 | https://github.com/supabase/supabase/blob/master/LICENSE |

## Catatan

- **GPL (Parselmouth/Praat, FFmpeg build gyan.dev).** Komponen ini tidak dibundel di repo atau di app.
  Server memanggilnya di laptop sendiri; tidak ada distribusi binary. Bila kelak server dibagikan dalam
  bentuk binary/kontainer, kewajiban GPL-3.0 (menyertakan sumber, lisensi kompatibel) berlaku.
- **Model `face_landmarker.task`.** Lisensi Apache-2.0 milik repo MediaPipe belum tentu mencakup berkas
  model. Tindakan: baca model card resmi (tautan di halaman Face Landmarker) dan perbarui baris di atas
  sebelum submission.
- Dependensi Python lain (uvicorn, pydantic, numpy, scipy, dll.) akan ditambahkan ke tabel ini saat
  `requirements.txt` final di fase F.
