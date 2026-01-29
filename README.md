# Kaushal-Setu Deployment Guide

This guide details how to manually start the development environment for the **Kaushal-Setu** project.

## Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher) & `npm`
- **Python** (v3.12 or higher)
- **Git**

## Project Structure

- **`/backend`**: FastAPI application (Python)
- **`/` (Root)**: React Frontend (Vite/TypeScript)
- **`/tests`**: Pytest Test Suite

---

## 1. Backend Setup (FastAPI)

The backend runs on port `8000`.

### Step 1: Navigate to Project Root
Open a terminal and navigate to the project folder:
```bash
cd /path/to/KAUSHAL-SETU/V1/Kaushal-Setu
```

### Step 2: Activate Virtual Environment
Use the existing virtual environment:
```bash
source .venv/bin/activate
```
_(If `.venv` does not exist, create it: `python3 -m venv .venv` and install dependencies: `pip install -r requirements.txt`)_

### Step 3: Start the Server
Run the FastAPI server with hot-reload enabled:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Root**: [http://localhost:8000/api](http://localhost:8000/api)

---

## 2. Frontend Setup (React/Vite)

The frontend runs on port `3000` (or `5173` if 3000 is busy).

### Step 1: Open a New Terminal
Keep the backend terminal running and open a **new** terminal window/tab.

### Step 2: Navigate to Project Root
```bash
cd /path/to/KAUSHAL-SETU/V1/Kaushal-Setu
```

### Step 3: Install Dependencies (First Run Only)
If you haven't installed node modules yet:
```bash
npm install
```

### Step 4: Start the Dev Server
```bash
npm run dev
```
- **Access App**: [http://localhost:3000](http://localhost:3000)

---

## 3. Running Tests

To run the full test suite (backend & integration tests):

1. Ensure the virtual environment is activated (`source .venv/bin/activate`).
2. Run `pytest`:
```bash
python -m pytest tests/
```

---

## Quick Reference Commands

| Component | Command | Port |
|-----------|---------|------|
| **Backend** | `.venv/bin/uvicorn backend.main:app --reload` | `8000` |
| **Frontend** | `npm run dev` | `3000` |
| **Tests** | `python -m pytest tests/` | N/A |
