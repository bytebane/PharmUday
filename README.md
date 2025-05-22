# PharmPilot

All-in-one solution for your pharmacy needs

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (which includes npm)
- [Bun](https://bun.sh/) (as the project uses Bun for package management and running scripts)
- A PostgreSQL database instance (either local or remote)

### Installation & Setup

1.  **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/bytebane/pharmpilot.git
    cd pharmpilot
    ```

2.  **Set up environment variables:**
    Copy the example environment file to a new `.env` file:

    ```bash
    cp .example.env .env
    ```

    Now, open the newly created `.env` file and fill in the required environment variables, especially `DATABASE_URL` with your PostgreSQL connection string, and `NEXTAUTH_SECRET`. You'll also need `BLOB_READ_WRITE_TOKEN` if you're using Vercel Blob for file storage.

3.  **Install dependencies:**
    Using Bun, install the project dependencies:

    ```bash
    bun install
    ```

4.  **Run database migrations:**
    Apply any pending database migrations to set up your schema:

    ```bash
    npx prisma migrate dev
    ```

    You might also want to seed your database with initial data (if a seed script is configured):

    ```bash
    npx prisma db seed
    ```

5.  **Start the development server:**
    ```bash
    bun dev
    ```
    This will typically start the Next.js development server on `http://localhost:3000`.

You should now be able to access the application in your browser at the specified local URL.
