# INFT3050 Entertainment Guild

The complete project is located at:

```text
/Volumes/DM/INFT3050
```

## Start the backend

Make sure Docker Desktop is running, then open a Terminal window:

```bash
cd "/Volumes/DM/INFT3050"
docker compose up -d
docker compose ps
```

The backend stack contains:

- NocoDB: <http://localhost:8088>
- Authentication/API server: <http://localhost:3001>
- SQL Server: `localhost:1433`

## Start the frontend

Open a second Terminal window:

```bash
cd "/Volumes/DM/INFT3050/my-shop"
npm install
npm start
```

The React application opens at <http://localhost:3000>.

## Stop the backend

Run this command from the project root:

```bash
cd "/Volumes/DM/INFT3050"
docker compose down
```

## Postman

Import `inft3050.postman_collection.json`. Call `POST /Login` before testing
operations that edit protected data.
