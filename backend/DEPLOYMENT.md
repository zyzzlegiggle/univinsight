# Backend Deployment Guide (Free Hosting Options)

This guide provides step-by-step instructions to deploy your FastAPI backend to popular free cloud hosting platforms.

---

## Pre-deployment Checklist
Before deploying, make sure you have the following environment variables ready to configure on your hosting provider:
- `OPENROUTER_API_KEY` (required for OpenRouter agent)
- `OPENROUTER_MODEL` (optional, defaults to `google/gemini-2.5-flash`)
- `GEMINI_API_KEY` (required for market classification)
- Any other API keys (`FRED_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `GNEWS_API_KEY`, etc.)

---

## Option 1: Render (Web Service Free Tier)
Render offers a free tier for web applications. The service will spin down after 15 minutes of inactivity, causing a ~50 second delay on the first request (cold start) when it wakes up.

### Deployment Steps:
1. Sign up/Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the codebase.
4. Configure the service settings:
   - **Name**: `univinsight-backend`
   - **Environment**: `Python 3` (or `Docker` if you prefer the Dockerfile deployment)
   - **Region**: Choose closest to your users.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Select the **Free** instance type.
6. Click **Advanced** and add your Environment Variables.
7. Click **Create Web Service**. Render will build and deploy the app. Your live URL will be shown at the top of the dashboard page.

---

## Option 2: Hugging Face Spaces (Docker Space)
Hugging Face Spaces provides free hosting for machine learning models and web apps with up to 16GB RAM / 2 vCPUs. It runs 24/7 but will sleep after 48 hours of inactivity (wakes up instantly on request).

### Deployment Steps:
1. Create a free account at [Hugging Face](https://huggingface.co/).
2. Click on your profile picture -> **New Space**.
3. Name your space (e.g., `univinsight-backend`).
4. Select **Docker** as the Space SDK and choose the **Blank** template.
5. Set Space visibility to **Public** or **Private** (Public is fine for hosting, your API keys are hidden).
6. Click **Create Space**.
7. Go to **Settings** -> **Variables and secrets**.
8. Click **New secret** to add your environment variables (e.g., `OPENROUTER_API_KEY`, etc.).
9. Clone the Space's Git repository or upload the files directly via the HF web interface:
   - Upload all files from the `backend/` directory (including `Dockerfile`, `main.py`, `routers/`, etc.) directly to the root of the Hugging Face Space repository.
10. Hugging Face will automatically detect the `Dockerfile`, build the container, and host your API.
11. Your endpoint will be: `https://<username>-<space-name>.hf.space/` (e.g. `https://huggingface.co/spaces/<username>/<space-name>` has the UI, and the direct API url can be found in the Embed Space options or by appending `.hf.space`).

---

## Option 3: Koyeb (Free Tier Nano Instance)
Koyeb offers a free tier Nano instance (1 vCPU, 512MB RAM) with fast global edge routing.

### Deployment Steps:
1. Sign up/Log in to [Koyeb](https://www.koyeb.com/).
2. Click **Create Service**.
3. Choose **GitHub** and select your repository.
4. Configure the service:
   - **Builder**: Select **Docker** (it will auto-detect the `backend/Dockerfile` if you configure the root/path to backend). Alternatively, select **Buildpack** and set the run command to `uvicorn main:app --host 0.0.0.0 --port 8000`.
   - **App directory**: `backend` (if deploying from a monorepo).
   - **Ports**: Add port `8000` (HTTP).
5. Add your Environment Variables in the **Variables** section.
6. Click **Deploy**. Koyeb will build and deploy your backend.

---

## Connecting Frontend to Backend
Once your backend is deployed:
1. Copy your backend URL (e.g., `https://univinsight-backend.onrender.com`).
2. Set it in your frontend configuration or environment variables so that the client-side `/api` calls proxy or query the correct URL.
