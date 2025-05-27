# PharmPilot

All-in-one solution for your pharmacy needs

## Features

**PharmPilot** is an all-in-one pharmacy management solution designed to streamline and modernize pharmacy operations. Below is a comprehensive list of its core features:

### 🏪 Inventory Management

- Add, edit, and manage medicines and medical supplies.
- Track stock levels, expiry dates, and reorder points.
- Out-of-stock and expiring-soon alerts.
- Batch and purchase tracking for each item.
- Support for multiple item formulations, strengths, and manufacturers.

### 💳 Sales & Billing

- Create and manage sales with detailed line items.
- Automatic calculation of discounts, taxes, and grand totals.
- Generate and print professional invoices.
- Track payment methods and payment status (cash, card, UPI, etc.).
- Sales history with filtering by date, period, and search.

### 👥 Customer Management

- Add and manage customer profiles.
- Quick customer search by name, phone, or email.
- Link sales and invoices to customers for history tracking.

### 👨‍⚕️ User & Staff Management

- Role-based access control: Super Admin, Admin, Pharmacist, Customer, Seller.
- Only Admins and Super Admins can create new users.
- Secure authentication and session management.

### 📊 Dashboard & Analytics

- Real-time dashboard with sales statistics (today, this month, this year, all time).
- Item statistics: expiring soon, out of stock, total items, expired count.
- Total customer count and all-time sales overview.

### 📁 Reports & Documents

- Upload, categorize, and manage medical reports (e.g., blood tests, imaging).
- Filter and search reports by category, date, and patient.
- Download and view report files securely.
- Manage report categories.

### 🧾 Invoices

- Auto-generate invoices for each sale.
- Print-friendly invoice layouts.
- Track invoice status and history.

### ⚙️ Admin Tools

- Database seeding and migration scripts.
- Modular and organized codebase for easy maintenance.
- Environment variable management for secure configuration.

### 🖥️ User Interface

- Responsive, modern UI built with React and Tailwind CSS.
- Floating action buttons for quick actions.
- Sheets, dialogs, and dropdowns for smooth workflows.
- Loading skeletons and error handling for better UX.

### 🔒 Security

- Role-based permissions for sensitive actions.
- Secure file uploads (e.g., Vercel Blob integration).
- Data validation with Zod schemas.

### 🛠️ Developer Experience

- TypeScript-first codebase.
- ESLint and Prettier integration for code quality and consistency.
- React Query for efficient data fetching and caching.
- Prisma ORM for database access.

**PharmPilot** is designed to be extensible and production-ready, making it easy to adapt to the needs of any pharmacy or medical supply business.

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (which includes npm)
- [Bun](https://bun.sh/) (as the project uses Bun for package management and running scripts)
- A PostgreSQL database instance (either local or remote)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for containerized development/production)

### Installation & Setup (Local)

1. **Clone the repository (if you haven't already):**

    ```bash
    git clone https://github.com/bytebane/pharmpilot.git
    cd pharmpilot
    ```

2. **Set up environment variables:**
    Copy the example environment file to a new `.env` file:

    ```bash
    cp .example.env .env
    ```

    Now, open the newly created `.env` file and fill in the required environment variables, especially `DATABASE_URL` with your PostgreSQL connection string, and `NEXTAUTH_SECRET`. You'll also need `BLOB_READ_WRITE_TOKEN` if you're using Vercel Blob for file storage.

3. **Install dependencies:**
    Using Bun, install the project dependencies:

    ```bash
    bun install
    ```

4. **Run database migrations:**
    Apply any pending database migrations to set up your schema:

    ```bash
    npx prisma migrate dev
    ```

    You might also want to seed your database with initial data (if a seed script is configured):

    ```bash
    npx prisma db seed
    ```

5. **Start the development server:**

    ```bash
    bun dev
    ```

    This will typically start the Next.js development server on `http://localhost:3000`.

You should now be able to access the application in your browser at the specified local URL.

---

## 🐳 Docker-based Development & Production

You can run PharmPilot in Docker containers for both development and production using the provided `Dockerfile` and `docker-compose.yml`.

### 1. **Docker-based Development**

This mode enables hot-reloading and mounts your local code into the container.

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

- The app will be available at [http://localhost:3000](http://localhost:3000).
- Code changes on your host will reflect in the running container.
- Make sure your `.env.local` is set up for development.

### 2. **Docker-based Production**

This mode builds and runs the optimized production image.

```bash
docker compose up --build -d
```

- The app will be available at [http://localhost](http://localhost) or the configured domain.
- Make sure your `.env` is set up for production.

### 3. **Stopping Containers**

To stop all running containers:

```bash
docker compose down
```

To stop and remove volumes & orphans

```bash
docker compose down -v --remove-orphans
```

### 4. **Notes**

- The setup uses [Traefik](https://doc.traefik.io/traefik/) as a reverse proxy for production.
- Adjust the `traefik` configuration and domain labels in `docker-compose.yml` for your production environment.
- Database is **not** included in the compose file; ensure your `DATABASE_URL` points to a reachable PostgreSQL instance.

---

Enjoy using **PharmPilot**!
