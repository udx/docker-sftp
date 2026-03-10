# Variables
IMAGE_NAME=udx-sftp
IMAGE_TAG=latest

# Default target
.DEFAULT_GOAL := help

# Phony targets ensure Make doesn't get confused by filenames
.PHONY: build

# Build the Docker image
build:
	@echo "Building Docker image..."
	echo "Building Docker image for the local platform..."
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "Docker image build completed."