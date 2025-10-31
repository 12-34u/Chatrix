🧩 Chatrix

A cross-platform desktop application for secure one-to-one messaging and file sharing over LAN.

🚀 Project Overview

Chatrix is a hybrid Electron + Python desktop application that enables peer-to-peer one‑to‑one messaging and file sharing (images, PDFs, documents) over a local area network (LAN/Wi‑Fi). It’s designed to provide a secure, fast, and user-friendly way to communicate without relying on external servers.

🎯 Objectives

✅ Enable peer-to-peer messaging over LAN (Wi-Fi)

📁 Implement file transfer: images, PDFs, documents

🗄️ Store chat history in a local SQLite database

🔒 Ensure secure and encrypted communication

💬 Create a user-friendly interface using Electron

🧰 Tech Stack
Layer	Technology
Frontend (UI)	Electron.js (HTML, CSS, JavaScript)
Backend	Python 3 (Socket, Cryptography, SQLite)
Database	SQLite3
IPC (Bridge)	Electron-Python Bridge (e.g., python-shell, zerorpc, or WebSocket)
Packaging	Electron Builder & PyInstaller
🧠 System Architecture

Frontend (Electron) — Provides GUI, manages user interactions, renders chat and file UI.

Backend (Python) — Handles LAN discovery, encrypted socket connections, file chunking, and DB persistence.

📄 License

This project is licensed under the MIT License.
SQLite Database — Stores chat history, contacts, and file metadata.

IPC Layer — Electron communicates with the Python backend via zerorpc or WebSocket for real-time messaging.
