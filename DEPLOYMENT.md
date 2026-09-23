# SlopeSense AI — Cloud Deployment Guide

SlopeSense AI is packaged as a **Unified Full-Stack Application**. The FastAPI backend serves both the REST API, ML models, and the pre-compiled Vite React UI on a single port.

---

## Option 1: Free Cloud Deployment on Render (Recommended)

Render offers free hosting with zero infrastructure configuration:

1. **Push your code to GitHub**:
   - Create a GitHub repository (e.g., `slopesense-ai`).
   - Push this `project` directory to the repository:
     ```bash
     git init
     git add .
     git commit -m "Deploy SlopeSense AI"
     git branch -M main
     git remote add origin https://github.com/<your-username>/slopesense-ai.git
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Sign in to [Render.com](https://render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - Choose **Docker** as the Runtime (it will automatically detect the included `Dockerfile` and `render.yaml`).
   - Select the **Free** instance plan.
   - Click **Create Web Service**.

3. **Done!**
   - Render will build the container and provide you with a live HTTPS URL (e.g., `https://slopesense-ai.onrender.com`).
   - Both the frontend dashboard and backend API will work seamlessly.

---

## Option 2: Run Anywhere with Docker (Locally or on Cloud VPS)

You can build and run the container on any computer or server with Docker installed:

```bash
# 1. Build the Docker image
docker build -t slopesense-ai .

# 2. Run the container
docker run -p 8000:8000 slopesense-ai
```

Now open:
- Web App: `http://localhost:8000/`
- API Docs: `http://localhost:8000/docs`

---

## Option 3: Separate Deployments (Vercel + Render)

If you prefer hosting the frontend on Vercel and the backend on Render:

1. **Deploy Backend to Render**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - Note the backend URL: `https://your-backend.onrender.com`

2. **Deploy Frontend to Vercel**:
   - Connect repo, set root directory to project folder.
   - Add Environment Variable:
     - `VITE_API_URL` = `https://your-backend.onrender.com`
   - Deploy!
