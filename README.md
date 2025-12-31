# 🚀 QuickMate - Backend API

The robust server-side application for **QuickMate**, an on-demand service booking platform. This API handles business logic, real-time communication, and data persistence, architected with a strict focus on **Scalability** and **Maintainability**.

> **🔗 Frontend Repository:** [Click here to view the Frontend Code](https://github.com/Moosabilal/Quickmate-frontend)

---

## 🏗️ Architecture & Design
This project differentiates itself by moving away from the standard MVC "Fat Controller" approach. Instead, it implements:

* **Repository Pattern:** Decouples business logic from data access layers.
* **SOLID Principles:** Ensures classes and functions are modular and single-responsibility.
* **Clean Architecture:** Distinct separation of concerns (Routes -> Controllers -> Services -> Repositories -> Models).

---

## ⚡ Key Features
* **Real-time Communication:** Socket.IO implementation for live chat and notification events.
* **Video Streaming:** Signaling server implementation for WebRTC peer-to-peer video calls.
* **Booking Engine:** Complex logic handling slot availability, booking status transitions, and payments.
* **Security:** Role-Based Access Control (RBAC), JWT Authentication, and HttpOnly cookies.
* **Payment Gateway:** Razorpay integration for secure transactions.

---

## 🛠️ Tech Stack
* **Runtime:** Node.js, Express.js
* **Language:** TypeScript
* **Database:** MongoDB (Mongoose ODM)
* **Real-time:** Socket.IO, WebRTC
* **Cloud/DevOps:** AWS EC2, Nginx

---

## ⚙️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Moosabilal/Quickmate-backend.git
    cd quickmate-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    REFRESH_TOKEN_SECRET=refresh_token_secret_key
    CLIENT_URL=http://localhost:5173
    CLOUDINARY_CLOUD_NAME=your Cloudinary name
    CLOUDINARY_API_KEY=your Cloudinary API key
    CLOUDINARY_API_SECRET=your Cloudinary API secret
    CLOUDINARY_BASE_URL=your cloudinary base URL
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=465
    EMAIL_SECURE=true
    EMAIL_USER=youremail@gmail.com
    EMAIL_PASS=your email pass
    EMAIL_FROM="QuickMate youremail@gmail.com"
    RECEIVER_EMAIL="youremail@gmail.com"

    OTP_EXPIRY_MINUTES=5
    MAX_OTP_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 30

    FRONTEND_URL=http://localhost:5173
    CLIENT_URL=http://localhost:5173
    PASSWORD_RESET_EXPIRY_MINUTES=60
    GOOGLE_CLIENT_ID=your google client id
    GOOGLE_CLIENT_SECRET=GOCSPX-your google client secret
    GOOGLE_API_KEY=paste google API key here


    RAZORPAY_KEY_ID = your Razorpay key ID
    RAZORPAY_KEY_SECRET=Paste key secret
    RAZORPAY_SECRET = Paste key secret

    GOOGLE_API_URL=google api URL(AI model url for chatbot)    ```

4.  **Run the server**
    ```bash
    # Development Mode
    npm run dev
    
    # Production Build
    npm run build
    npm start
    ```

---

## 📂 Project Structure (Repository Pattern)

```text
src/
├── controllers/   # Request/Response handling
├── services/      # Business logic layer
├── repositories/  # Database access layer (SOLID implementation)
├── models/        # Mongoose Schemas
├── routes/        # API Routes definition
├── interfaces/    # TypeScript interfaces
└── utils/         # Helper functions