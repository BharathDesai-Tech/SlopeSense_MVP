# SlopeSense AI 🏔️
### Fullstack Early Landslide Warning, Geotechnical XAI & Civil Defense Platform (SIH 2026)

[![SIH 2026](https://img.shields.io/badge/SIH-2026_Prototype-blue.svg)](https://sih.gov.in/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_Python_3.11+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_TypeScript-61DAFB.svg?logo=react)](https://react.dev)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet_+_OSM-199900.svg?logo=leaflet)](https://leafletjs.com)
[![Machine Learning](https://img.shields.io/badge/ML-XGBoost_+_SHAP-FF6F00.svg)](https://xgboost.readthedocs.io/)
[![Zero Cost](https://img.shields.io/badge/Cost-$0.00_100%25_Open_Source-emerald.svg)](#-zero-cost-open-source-architecture)

---

## 📌 Overview

**SlopeSense AI** is an end-to-end, disaster management and early warning platform engineered for the high-risk Himalayan terrain of **Northeast India** (Assam, Meghalaya, Sikkim, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura).

It bridges public community safety with real-time National Disaster Response Force (NDRF) and State Disaster Management Authority (SDMA) operations by combining:
1. **Live IoT Weather Telemetry** (Precipitation rates, soil moisture, pore pressure).
2. **Machine Learning & Explainable AI** (XGBoost + Lundberg SHAP TreeExplainer).
3. **Geotechnical Mohr-Coulomb Physics** (Real-time Factor of Safety $FoS$ calculation).
4. **Crowdsourced Incident Reporting & Civil Defense** (Geotagged citizen reports, offline queues, automated multi-lingual speech alarms, and physical evacuation sheet generation).

---

## 🏛️ System Architecture

SlopeSense AI features two distinct, role-tailored portals:

### 1. Public Citizen Safety Portal (`/`)
* **Interactive 9-Layer GIS Hazard Map:** Color-coded threat levels (Critical, Warning, Stable) across 54 Northeast monitoring stations.
* **Area Safety Checker:** Instant safety advisories and geotechnical status for any sector.
* **📍 1-Click "Locate Me":** Uses device GPS + Haversine distance formula to auto-detect and select the nearest station.
* **🚨 Automatic 90%+ Critical Landslide Voice & Acoustic Siren:** Native browser speech alerts (English, Hindi, Assamese) + Web Audio API civil defense siren with zero network dependencies.
* **🖨️ Export Evacuation Sheet (Print/PDF):** 1-click printable emergency action document with nearest high-ground safe shelters, risk metrics, and 24/7 helplines (NDRF: 1078, SDRF: 1070).
* **🛡️ Citizen Gamification & Trust Rating:** Baseline 50% trust score and reputation points (+20 on verified report, +5 photo bonus, -10 penalty on false alarm) with Sentinel ranks.
* **📶 Offline Incident Reporting:** Caches reports when out of network coverage and auto-syncs with authenticated JWT when connectivity returns.

### 2. NDRF & Authority Operations Desk (`/authority`)
* **Department Clearance Gate:** Role-based security gate (`commander@ndrf.gov.in` / `ndrf2026`).
* **Raw Geotechnical Telemetry Inspector:** Live monitoring of vibrating-wire piezometer pore pressure ($u$), LiDAR DEM slope angles, borehole inclinometer creep velocity, and Sentinel-1 InSAR LOS surface displacement.
* **Incident Triage & Citizen Feedback Desk:** Duty officers review crowd-sourced hazard reports and photos, verify/reject incidents, and post official operational action directives directly visible to the public.
* **Highway CCTV & Drone Surveillance Feeds:** Real-time simulated road cut feeds with AI optical crack and seepage detection overlays.
* **Emergency Broadcast Dispatcher:** Sector-wide emergency warning broadcast simulator.

### 3. Geotechnical & Explainable AI (XAI) Lab (`/lab`)
* **What-If Slope Failure Physics Simulator:** Real-time Mohr-Coulomb Factor of Safety ($FoS$) solver with dynamic canvas colluvium rupture animation when $FoS < 1.0$.
* **Real Northeast Station Presets:** 1-click baselines for Guwahati NH-27, Cherrapunji Ridge, Singtam Teesta Gorge, and Stable Valley.
* **XGBoost SHAP TreeExplainer:** Game-theoretic waterfall feature attributions breaking down positive and negative risk contributors.

---

## 💰 Zero-Cost ($0.00) Open-Source Architecture

SlopeSense AI is strictly guaranteed to run at **$0.00 cost** with zero external subscriptions, credit cards, or paid API keys:

| Component | Technology Used | Cost |
| :--- | :--- | :--- |
| **Map Base Layers** | OpenStreetMap & CartoDB Positron / Dark | **$0.00** (Free open tiles) |
| **Live Weather Telemetry** | Open-Meteo REST API | **$0.00** (Free open data) |
| **Emergency Siren** | Web Audio API | **$0.00** (Client-side synthesis) |
| **Voice Announcements** | Web Speech API (`speechSynthesis`) | **$0.00** (Native browser TTS) |
| **Machine Learning** | Local XGBoost + SHAP | **$0.00** (Runs on CPU) |
| **Email & OTP Reset** | Python standard `smtplib` + Demo Autofill | **$0.00** (Standard library) |
| **Database** | SQLite / Free PostgreSQL (Render / Supabase) | **$0.00** (Open-source) |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18+)
* **Python** (v3.10+)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/SlopeSense_MVP.git
cd SlopeSense_MVP
```

### 2. Run Locally (Windows)
Double click `start_slopesense.bat` or run:

```powershell
# Terminal 1: Backend API
python -m uvicorn src.main:app --host 0.0.0.0 --port 8002

# Terminal 2: Frontend SPA
npm install
npm run dev -- --host 0.0.0.0
```

### 3. Access Portals
* **Citizen Portal:** `http://localhost:5173/`
* **Authority Desk:** `http://localhost:5173/authority`
* **Geotech Lab:** `http://localhost:5173/lab`
* **Interactive Swagger Docs:** `http://127.0.0.1:8002/docs`

---

## 🔑 Demo Authority Credentials
* **Email:** `commander@ndrf.gov.in`
* **Password:** `ndrf2026`
* **Department Clearance Code:** `NDRF-SECURE-2026`

---

## ☁️ 1-Click Cloud Deployment (Render.com)

1. Fork or upload this repository to GitHub.
2. In [Render.com](https://render.com), click **New +** $\rightarrow$ **Web Service**.
3. Connect your repository. Render will automatically detect the multi-stage [Dockerfile](Dockerfile) and [render.yaml](render.yaml).
4. Select the **Free Instance** ($0.00/mo) and click **Deploy**.

---

## 📄 License
MIT License. Built for the Smart India Hackathon (SIH 2026).
