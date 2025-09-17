# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into the container
COPY backend/ .

# Expose the port the app runs on
EXPOSE 8080

# Run service_worker.py in the background and start the uvicorn server
CMD ["sh", "-c", "python service_worker.py & uvicorn API:app --host 0.0.0.0 --port 8080"]
