# Docuflash Backend

Docuflash is a secure, ephemeral file-sharing API designed for privacy and ease of use. It allows users to upload files, protect them with passwords, and share them via unique tokens, with automatic expiration for maximum security.

## Overview

The Docuflash backend provides a robust and secure foundation for managing file uploads and shares. Built with a focus on security, it employs double-layer encryption for storage keys and supports time-limited file availability. It integrates seamlessly with [UploadThing](https://uploadthing.com/) for cloud storage while maintaining full control over file metadata and access logic.

## Key Features

- 🚀 **Secure File Uploads:** Integrated with UploadThing for high-performance, managed cloud storage.
- 🔐 **Double-Layer Encryption:** Storage keys are encrypted using both user-defined passwords and a system-wide master key, ensuring data remains protected even if the database is compromised.
- 🛡️ **Password Protection:** Optional password-based access control for shared files.
- ⏳ **Automatic Expiration:** Files are automatically marked for deletion after a configurable expiration period.
- 🔗 **Unique Share Tokens:** Secure, non-guessable tokens for sharing files without exposing internal IDs.
- 📊 **Download Tracking:** Monitors download counts and provides secure, temporary download URLs.
- 🧹 **Automated Cleanup:** Dedicated endpoint for cleaning up expired files from both the database and cloud storage.
- 📱 **Device Metadata:** Captures basic device and client information during upload for auditing and security.

## Technology Stack

### Core Technologies
- **TypeScript:** Used throughout the project for enhanced type safety, maintainability, and developer experience.
- **Express.js (v5):** Leverages the latest version of Express for a lightweight and modern API structure.
- **Node.js:** The foundational runtime for high-performance server-side execution.

### Data & Storage
- **PostgreSQL:** A reliable relational database for storing file metadata, expiration dates, and access logs.
- **TypeORM:** An advanced ORM that enables clean, object-oriented database interactions and easy migration management.
- **UploadThing:** Chosen for its developer-friendly approach to file storage, handling the complexities of uploads while providing a powerful server-side SDK.

### Security & Utilities
- **Bcrypt.js:** Industry-standard hashing for securing file passwords.
- **Crypto:** Built-in Node.js module used for generating unique tokens and performing advanced encryption/decryption of storage keys.
- **Morgan & Winston:** For comprehensive request logging and system monitoring.
- **Express-Validator:** Ensures all incoming data is sanitized and validated before processing.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database
- UploadThing API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/docuflash-backend.git
   cd docuflash-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=3000
   DATABASE_URL=postgres://user:password@localhost:5432/docuflash
   UPLOADTHING_SECRET=your_ut_secret
   UPLOADTHING_APP_ID=your_ut_app_id
   MASTER_ENCRYPTION_KEY=your_secure_master_key
   MASTER_SALT=your_secure_master_salt
   CLEANUP_API_KEY=your_cleanup_trigger_key
   ```

4. Run migrations:
   ```bash
   npm run migration:run
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### File Operations
- `POST /api/files` - Upload a new file (with optional password and expiration).
- `GET /api/files/:token` - Retrieve file metadata using a share token.
- `POST /api/files/:token/verify` - Verify a password for a protected file.
- `GET /api/files/:token/download` - Get a secure download URL.
- `DELETE /api/files/:id` - Delete a file by its internal ID.
- `DELETE /api/files/token/:token` - Delete a file by its share token.

### Maintenance
- `POST /api/files/cleanup-expired` - Trigger cleanup of expired files (requires `x-cleanup-api-key` header).

## Project Structure

```text
src/
├── controllers/    # Request handling logic
├── entity/         # TypeORM database models
├── errors/          # Custom error classes
├── middleware/      # Express middleware (error handling, etc.)
├── migration/       # Database migrations
├── routes/          # API route definitions
├── services/        # Core business logic
├── types/           # TypeScript definitions
└── utils/           # Utility functions (encryption, response formatting)
```

## License

This project is licensed under the ISC License.
