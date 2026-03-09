.PHONY: help run build build-linux-amd64

help:
	@echo "Targets:"
	@echo "  run                Run dev server on :18080"
	@echo "  build              Build single binary for current platform"
	@echo "  build-linux-amd64  Build Linux x86_64 single binary"

run: build
	./dist/openclaw-console

build:
	./scripts/build-single-binary.sh

build-linux-amd64:
	GOOS=linux GOARCH=amd64 VITE_BASE_PATH=/siderclaw-console/ ./scripts/build-single-binary.sh
