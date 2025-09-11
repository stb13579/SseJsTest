## 🚀 Running the Full Demo with Docker

1. Make sure Docker is installed and running.
2. From the project root, run:

```bash
docker-compose up --build
```

This launches the SSE demo application on `localhost:3000` and an `ngrok` tunnel so the app can be reached from a remote network.

The `ngrok` container logs the public URL when it starts. Use that URL as the `BASE_URL` for the Gatling load tests when running them on Gatling Enterprise or any remote machine. If `BASE_URL` is not set, the tests default to `http://localhost:3000`.

Optionally, provide your ngrok auth token when starting the stack:

```bash
NGROK_AUTHTOKEN=<your-token> docker-compose up --build
```
