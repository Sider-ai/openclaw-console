.PHONY: help build build-linux-amd64

help:
	@echo "Targets:"
	@echo "  build              Build single binary for current platform"
	@echo "  build-linux-amd64  Build Linux x86_64 single binary"

build:
	./scripts/build-single-binary.sh

build-linux-amd64:
	GOOS=linux GOARCH=amd64 ./scripts/build-single-binary.sh
